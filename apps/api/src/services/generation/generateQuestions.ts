import { z } from "zod";
import { Requirement, Question, QuestionSchema } from "@prepforge/shared-types";
import { callLLM } from "../llm/client";
import * as crypto from "crypto";

// The LLM will return an array of questions, which we unwrap
const QuestionListSchema = z.object({
  questions: z.array(QuestionSchema)
});

export async function generateQuestions(
  requirements: Requirement[],
  hiringDiscussion: string
): Promise<Question[]> {
  // Group requirements by kind to ensure separate LLM calls per the brief's constraint
  const groupedReqs: Record<string, Requirement[]> = {
    technical: [],
    behavioural: [],
    domain: []
  };

  requirements.forEach(req => {
    if (groupedReqs[req.kind]) {
      groupedReqs[req.kind].push(req);
    }
  });

  let allQuestions: Question[] = [];

  for (const [kind, reqs] of Object.entries(groupedReqs)) {
    if (reqs.length === 0) continue;

    let focusInstruction = "";
    let allowedCategories = "";

    // Tailor the system prompt strictly to the kind of requirements being evaluated
    if (kind === "technical") {
      focusInstruction = "Focus on practical coding, system architecture, technical trade-offs, and debugging.";
      allowedCategories = "'technical' or 'system-design'";
    } else if (kind === "behavioural") {
      focusInstruction = "Focus on the STAR method, teamwork, conflict resolution, and leadership scenarios.";
      allowedCategories = "'behavioural' or 'company-fit'";
    } else {
      focusInstruction = "Focus on product sense, industry knowledge, and how technology solves business problems.";
      allowedCategories = "'company-fit' or 'system-design'"; 
    }

    const systemInstruction = `
You are an expert technical interviewer. Generate targeted interview questions for the provided list of candidate requirements.

CRITICAL RULES:
1. ${focusInstruction}
2. Assign a 'difficulty' from 1 (easy/baseline) to 3 (hard/advanced) for each question.
3. The 'category' MUST be one of: ${allowedCategories}.
4. Every question MUST explicitly list the requirement IDs it tests in the 'requirement_ids' array. You must map these accurately so we can verify coverage.
5. Generate 1 question for every requirement provided. A single complex question can cover multiple requirement IDs.
6. Provide a strong, structural 'answer_outline' for each question.

COMPANY HIRING CONTEXT (Tailor questions to their specific interview process if known):
${hiringDiscussion || "No specific hiring context provided."}
`;

    const untrustedData = JSON.stringify(reqs, null, 2);

    try {
      const result = await callLLM(
        systemInstruction,
        untrustedData,
        QuestionListSchema
      );
      
      // Override the LLM's generated IDs with guaranteed stable UUIDs for state management
      const mappedQuestions = result.questions.map(q => ({
        ...q,
        id: `q-${crypto.randomUUID()}`
      }));

      allQuestions = [...allQuestions, ...mappedQuestions];
    } catch (error) {
      console.warn(`Failed to generate ${kind} questions. Pipeline will rely on next coverage pass.`);
    }
  }

  return allQuestions;
}