import { z } from "zod";

// --- Appendix A Enums ---
export const RequirementPrioritySchema = z.enum(["must", "nice"]);
export const RequirementKindSchema = z.enum(["technical", "behavioural", "domain"]);
export const QuestionCategorySchema = z.enum(["technical", "behavioural", "system-design", "company-fit"]);

// --- Appendix A Sub-Schemas ---
export const RequirementSchema = z.object({
  id: z.string(),
  text: z.string(),
  kind: RequirementKindSchema,
  priority: RequirementPrioritySchema,
});

export const QuestionSchema = z.object({
  id: z.string(),
  requirement_ids: z.array(z.string()),
  category: QuestionCategorySchema,
  prompt: z.string(),
  answer_outline: z.string(),
  difficulty: z.number().int().min(1).max(3),
});

export const FlashcardSchema = z.object({
  id: z.string(),
  front: z.string(),
  back: z.string(),
  requirement_ids: z.array(z.string()),
});

export const ScheduleDaySchema = z.object({
  day: z.number().int().positive(),
  focus: z.string(),
  question_ids: z.array(z.string()),
  minutes: z.number().int().nonnegative(),
});

// --- Core Kit Schema (Strictly matches Appendix A) ---
export const AppendixAKitSchema = z.object({
  source: z.object({
    company: z.string(),
    company_url: z.string().url(),
    role: z.string(),
    location: z.string(),
    jd_chars: z.number().int().nonnegative(),
    researched_at: z.string().datetime(),
    pages_used: z.array(z.string().url()),
  }),
  company_brief: z.object({
    summary: z.string(),
    what_they_do: z.string(),
    sources: z.array(z.string().url()),
  }),
  role: z.object({
    title: z.string(),
    seniority: z.string(),
    responsibilities: z.array(z.string()),
    requirements: z.array(RequirementSchema),
  }),
  questions: z.array(QuestionSchema),
  flashcards: z.array(FlashcardSchema),
  schedule: z.object({
    days_available: z.number().int().positive(),
    days: z.array(ScheduleDaySchema),
  }),
  coverage: z.object({
    uncovered_requirement_ids: z.array(z.string()),
    passes: z.number().int().nonnegative(),
  }),
});

// --- App-Level Extension (Survives UI regeneration) ---
export const AppKitSchema = AppendixAKitSchema.extend({
  edits: z.object({
    pinnedQuestionIds: z.array(z.string()).default([]),
    pinnedFlashcardIds: z.array(z.string()).default([]),
    lastEditedAt: z.date().optional(),
  }).optional(),
});

// --- Exported Types ---
export type Kit = z.infer<typeof AppKitSchema>;
export type Requirement = z.infer<typeof RequirementSchema>;
export type Question = z.infer<typeof QuestionSchema>;