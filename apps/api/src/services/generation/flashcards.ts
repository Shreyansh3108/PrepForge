import { z } from "zod";
import { Flashcard, Question, FlashcardSchema } from "@prepforge/shared-types";
import { callLLM } from "../llm/client";
import * as crypto from "crypto";

// Wrap the schema in an object array so the LLM outputs a clean top-level JSON structure
const FlashcardListSchema = z.object({
  flashcards: z.array(FlashcardSchema)
});

export async function generateFlashcards(questions: Question[]): Promise<Flashcard[]> {
  if (questions.length === 0) return [];

  const systemInstruction = `
You are an expert technical instructor creating spaced-repetition flashcards.
Your task is to convert the provided interview questions and their answer outlines into concise flashcards.

CRITICAL RULES:
1. Create EXACTLY ONE flashcard for each question provided.
2. The 'front' should be a direct, punchy version of the question.
3. The 'back' should be a concise, bulleted summary of the core answer.
4. You MUST copy the exact 'requirement_ids' array from the source question into the flashcard. Do not hallucinate these IDs.
`;

  // Map down the payload to save input tokens and avoid confusing the LLM with unnecessary fields
  const untrustedData = JSON.stringify(
    questions.map(q => ({
      prompt: q.prompt,
      answer_outline: q.answer_outline,
      requirement_ids: q.requirement_ids
    })),
    null,
    2
  );

  try {
    const result = await callLLM(
      systemInstruction,
      untrustedData,
      FlashcardListSchema
    );

    // Enforce stable UUIDs to prevent UI state issues during manual user edits later
    return result.flashcards.map(f => ({
      ...f,
      id: `f-${crypto.randomUUID()}`
    }));
  } catch (error) {
    console.warn("Failed to generate flashcards. Returning empty array.");
    return [];
  }
}