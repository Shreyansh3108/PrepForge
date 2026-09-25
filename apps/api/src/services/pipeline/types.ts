export interface PipelineInput {
  jd: string;
  company_url?: string;
  days: number;
}

export type PipelineStep =
  | "extracting_requirements"
  | "crawling_company"
  | "generating_brief"
  | "generating_questions"
  | "generating_flashcards"
  | "checking_coverage"
  | "building_schedule"
  | "validating"
  | "completed";

export interface PipelineProgress {
  step: PipelineStep;
  pct: number;
  message: string;
}

export type OnProgressCallback = (progress: PipelineProgress) => void;