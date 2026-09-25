import { z } from "zod";
import { callLLM } from "../llm/client";

// The shape required by Appendix A (Note: 'sources' array is attached in runPipeline.ts)
const CompanyBriefSchema = z.object({
  summary: z.string().describe("A 2-3 sentence overview of the company and its hiring culture."),
  what_they_do: z.string().describe("A concise explanation of the company's core product, service, or industry."),
  companyName: z.string().optional().describe("The extracted name of the company, if available.")
});

export type GeneratedBrief = z.infer<typeof CompanyBriefSchema>;

export async function generateCompanyBrief(
  crawledContent: string,
  hiringDiscussion: string
): Promise<GeneratedBrief> {
  const systemInstruction = `
You are an expert company researcher. Your task is to analyze the provided web page text and public discussion to generate a short company brief.

CRITICAL RULES:
1. If the provided text is empty, contains no useful information, or indicates the site was unreachable, DO NOT invent facts or hallucinate a company profile.
2. Instead, provide an honest brief stating that information could not be found (e.g., "Company information was not accessible" for both fields).
3. If information IS available, synthesize what they do and how they hire, putting the hiring culture/process details into the 'summary' field.
`;

  const untrustedData = `
--- CRAWLED SITE CONTENT ---
${crawledContent || "No site content retrieved."}

--- PUBLIC DISCUSSION ---
${hiringDiscussion || "No public discussion found."}
`;

  return await callLLM<GeneratedBrief>(
    systemInstruction,
    untrustedData,
    CompanyBriefSchema
  );
}