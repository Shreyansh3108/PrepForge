import { AppendixAKitSchema, Kit, Requirement, Question, Flashcard } from "@prepforge/shared-types";
import { checkCoverage } from "../coverage/checkCoverage";
import { buildSchedule } from "../scheduling/buildSchedule";
import { PipelineInput, OnProgressCallback } from "./types";

// Service imports (these will be wired to real scrapers / LLM modules in subsequent steps)
import { extractRequirements } from "../extraction/extractRequirements";
import { crawlCompanySite } from "../retrieval/crawlCompanySite";
import { fetchPage } from "../retrieval/fetchPage";
import { findHiringDiscussion } from "../retrieval/findHiringDiscussion";
import { generateCompanyBrief } from "../generation/companyBrief";
import { generateQuestions } from "../generation/generateQuestions";
import { generateFlashcards } from "../generation/flashcards";

export async function runPipeline(
  input: PipelineInput,
  onProgress?: OnProgressCallback
): Promise<Kit> {
  const { jd, company_url, days } = input;
  const researchedAt = new Date().toISOString();

  // Step 1: Extract requirements from the Job Description
  onProgress?.({ step: "extracting_requirements", pct: 10, message: "Extracting role requirements from JD..." });
  const roleData = await extractRequirements(jd);
  let requirements: Requirement[] = roleData.requirements;

  // Step 2: Company Site Crawling & Hiring Discussion Search
  let pagesUsed: string[] = [];
  let crawledContent = "";
  let hiringDiscussion = "";

  if (company_url && company_url.trim().length > 0) {
    onProgress?.({ step: "crawling_company", pct: 25, message: `Crawling ${company_url}...` });
    try {
      const candidateLinks = await crawlCompanySite(company_url);
      
      // Fetch up to 3 high-rank pages (e.g., home, careers, about)
      for (const link of candidateLinks.slice(0, 3)) {
        const page = await fetchPage(link);
        if (page && page.content) {
          pagesUsed.push(page.url);
          crawledContent += `\n--- SOURCE: ${page.url} ---\n${page.content}\n`;
        }
      }

      // Best-effort public discussion lookup (Glassdoor, Reddit, etc.)
      hiringDiscussion = await findHiringDiscussion(roleData.company || "company");
    } catch {
      // Per brief: Unreachable or failing sites must be reported/skipped, not crash the run
      pagesUsed = [];
    }
  }

  // Step 3: Generate Company Brief
  onProgress?.({ step: "generating_brief", pct: 40, message: "Synthesizing company brief..." });
  const brief = await generateCompanyBrief(crawledContent, hiringDiscussion);

  // Step 4: First pass of question generation
  onProgress?.({ step: "generating_questions", pct: 55, message: "Generating targeted interview questions..." });
  let questions: Question[] = await generateQuestions(requirements, hiringDiscussion);

  // Step 5: Flashcard Generation (derived from questions)
  onProgress?.({ step: "generating_flashcards", pct: 70, message: "Creating flashcard deck..." });
  const flashcards: Flashcard[] = await generateFlashcards(questions);

  // Step 6 & 7: The Coverage Loop (pure code check, max 2 passes)
  onProgress?.({ step: "checking_coverage", pct: 80, message: "Running requirement coverage check..." });
  let uncoveredIds = checkCoverage(requirements, questions);
  let passes = 1;

  if (uncoveredIds.length > 0 && passes < 2) {
    onProgress?.({ step: "checking_coverage", pct: 85, message: `Closing gaps for ${uncoveredIds.length} requirements...` });
    const gapRequirements = requirements.filter(r => uncoveredIds.includes(r.id));
    
    // Targeted second pass for missing requirements
    const followUpQuestions = await generateQuestions(gapRequirements, hiringDiscussion, questions.length + 1);
    questions = [...questions, ...followUpQuestions];
    passes += 1;

    // Final coverage evaluation
    uncoveredIds = checkCoverage(requirements, questions);
  }

  // Step 8: Deterministic Schedule Allocation (Pure Code)
  onProgress?.({ step: "building_schedule", pct: 90, message: "Building daily preparation schedule..." });
  const scheduleDays = buildSchedule(requirements, questions, days);

  // Assemble raw kit structure conforming to Appendix A
  const assembledKit = {
    source: {
      company: roleData.company || brief.companyName || "Unknown Company",
      company_url: company_url || "https://not-provided.local",
      role: roleData.title || "Target Role",
      location: roleData.location || "Remote / Not Specified",
      jd_chars: jd.length,
      researched_at: researchedAt,
      pages_used: pagesUsed,
    },
    company_brief: {
      summary: brief.summary,
      what_they_do: brief.what_they_do,
      sources: pagesUsed,
    },
    role: {
      title: roleData.title,
      seniority: roleData.seniority,
      responsibilities: roleData.responsibilities,
      requirements: requirements,
    },
    questions: questions,
    flashcards: flashcards,
    schedule: {
      days_available: days,
      days: scheduleDays,
    },
    coverage: {
      uncovered_requirement_ids: uncoveredIds,
      passes: passes,
    },
    edits: {
      pinnedQuestionIds: [],
      pinnedFlashcardIds: [],
      lastEditedAt: new Date(),
    }
  };

  // Step 9: Strict Zod validation against Appendix A before returning
  onProgress?.({ step: "validating", pct: 98, message: "Validating kit integrity..." });
  const validatedKit = AppendixAKitSchema.parse(assembledKit);

  onProgress?.({ step: "completed", pct: 100, message: "Kit ready!" });
  return validatedKit as Kit;
}