import { z } from "zod";
import { RequirementSchema } from "@prepforge/shared-types";
import { callLLM } from "../llm/client";

// Define the exact JSON shape we expect the LLM to return
const ExtractionSchema = z.object({
  company: z.string().optional().describe("The hiring company's name, if mentioned in the text."),
  title: z.string().describe("The job title (e.g., Senior Frontend Engineer)."),
  seniority: z.string().describe("The seniority level (e.g., Junior, Senior, Staff). Default to 'Not specified' if missing."),
  responsibilities: z.array(z.string()).describe("A list of 3-5 high-level responsibilities for the role."),
  requirements: z.array(RequirementSchema).describe("The extracted requirements."),
});

export type ExtractedRoleData = z.infer<typeof ExtractionSchema>;

export async function extractRequirements(jd: string): Promise<ExtractedRoleData> {
  const systemInstruction = `
You are an expert technical recruiter analyzing a job description. 
Extract the role details and a structured list of specific requirements.

CRITICAL RULES:
1. DO NOT invent or assume requirements that are not explicitly stated in the text.
2. For each requirement, generate a short, stable string ID (e.g., "req-1", "req-2").
3. Classify "priority" strictly as "must" or "nice". 
   - A "required" or "must-have" skill is "must". 
   - A "bonus points for" or "preferred" skill is "nice".
4. Classify "kind" strictly as "technical" (languages, frameworks, tools), "behavioural" (communication, mentoring, leadership), or "domain" (industry knowledge like fintech, healthcare).

If the job description is very short or thin, extract only what is there. Do not fabricate filler content.
`;

  // Use the secure callLLM wrapper to execute the prompt, handle retries, and validate the JSON output
  const extractedData = await callLLM<ExtractedRoleData>(
    systemInstruction,
    jd,
    ExtractionSchema
  );

  return extractedData;
}