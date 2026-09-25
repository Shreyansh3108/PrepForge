# AI Interview Prep Kit (PrepForge)

## Project Overview
PrepForge is a full-stack application that transforms a job description and a company URL into a highly personalized, interactive interview preparation kit. It crawls company pages to understand hiring practices, extracts core requirements from the job description, and generates a structured study guide comprising a company brief, targeted technical/behavioural questions, concept flashcards, and a day-by-day study schedule.

## Tech Stack & Justifications
| Layer | Choice | Justification |
| :--- | :--- | :--- |
| **Frontend** | Next.js (App Router) + Tailwind CSS | Matches brief preferences. SSR provides fast initial loads, and Tailwind enables rapid, responsive UI development. |
| **Backend** | Node.js + Express, TypeScript | Matches brief default. TypeScript ensures strict enforcement of the Appendix A kit schema at compile time. |
| **Database** | MongoDB + Mongoose | A generated kit is intrinsically a nested document. MongoDB maps perfectly to this structure without forcing artificial relational joins. |
| **Scraping** | `undici`/`fetch` + `cheerio` | Most hiring/about pages are static HTML. Puppeteer is unnecessarily heavy and slow for this use case. |
| **LLM Provider** | Groq (Model: `llama3-8b-8192`) | Lightning-fast inference on a genuine free tier. |
| **Validation** | Zod | Strictly validates the incoming API requests and enforces the Appendix A schema before any database save. |

## Setup & Deployment Instructions

### Environment Variables (`.env`)
You must provide these variables in the root backend directory:
```env
LLM_API_KEY="your_groq_api_key"
LLM_BASE_URL="[https://api.groq.com/openai/v1/chat/completions](https://api.groq.com/openai/v1/chat/completions)"
LLM_MODEL="llama3-8b-8192"
MONGO_URI="your_mongodb_connection_string"
PORT=4000
```

### Local Development
From the monorepo root:
1. `npm install`
2. Backend: `cd apps/api && npm run dev`
3. Frontend: `cd apps/web && npm run dev`

### Automated Evaluation CLI (Section 9)
The batch entry point executes the exact same pipeline code used by the application, reading from a file and writing to a file without HTTP overhead.
```bash
# Run from the apps/api directory
npm run evaluate -- --input cases.json --output kits.json
```

### Deployed URLs
* **Frontend:** [Insert Vercel URL here]
* **Backend:** [Insert Render/Railway URL here]

---

## High-Level Architecture
The application is structured as a monorepo (`apps/web`, `apps/api`, `packages/shared-types`). 
* **Separation of Concerns:** The backend isolates core domains under `services/`. Retrieval, extraction, generation, scheduling, and schema validation are entirely separate modules orchestrated by a single `runPipeline.ts` function. This ensures the CLI and the HTTP API use the exact same logic execution.
* **Strict Persistence Guard:** No kit is saved to the database unless it completely satisfies the Zod schema representing Appendix A. 

## Retrieval Approach & Sources
The retrieval step uses a custom lightweight crawler (`fetch` + `cheerio`). 
1. **Ranking:** It fetches the target URL and ranks internal links, prioritizing paths like `/careers`, `/jobs`, `/about`, and engineering blogs. 
2. **Fetching & Safety:** It respects `robots.txt`, validates URLs to block loopback/private IP addresses (SSRF mitigation), and streams responses with a strict byte cap to prevent memory exhaustion from massive files. 
3. **Honest Failure:** If a hiring page cannot be found or the site returns a 404, it degrades gracefully and generates an honest "Information not accessible" brief rather than hallucinating details.

## Pipeline Sequencing
The `runPipeline.ts` orchestrator strictly executes in this order to ensure the model responds to discovered facts:
1. **Extract Requirements:** (LLM) Parses JD into structured objects with stable IDs, strictly marking them "must" or "nice".
2. **Retrieve:** (Code) Crawls the company site to find the hiring process and company mission.
3. **Company Brief:** (LLM) Generates the brief based *only* on the crawled HTML context.
4. **Generate Questions:** (LLM) Batches requests by requirement. Technical requirements yield technical questions; behavioral requirements yield behavioral questions.
5. **Generate Flashcards:** (LLM) Derived from the core concepts of the generated questions.
6. **Check Coverage:** (Code) Deterministic check verifying every "must" requirement ID is mapped to a generated question.
7. **Second Pass:** (LLM) If the coverage check fails, a targeted generation pass fills the exact missing gaps.
8. **Build Schedule:** (Code) Deterministically allocates the questions across the requested days.

## State Management: Generated, Edited, and Pinned
To satisfy the requirement that regenerating a section must not clobber user edits, the kit schema extends Appendix A with an `edits` object:
```typescript
edits: {
  pinnedQuestionIds: string[],
  pinnedFlashcardIds: string[]
}
```
When a user manually alters a question or adds one, its ID is added to `pinnedQuestionIds`. If they click "Regenerate Technical Questions," the backend wipes non-pinned technical questions, generates fresh ones, and merges them with the pinned items before recalculating the schedule. 

## Schedule Allocation
Scheduling is purely deterministic arithmetic (no LLM hallucinations). 
1. Requirements are sorted (Must-haves before Nice-to-haves, harder questions first).
2. Questions are allocated round-robin into buckets matching the `days_available`. Day 1 is filled before Day 2 gets content, ensuring critical topics are studied early.
3. Each day's duration is an exact integer sum based on question difficulty (e.g., Difficulty 1 = 15m, Difficulty 3 = 40m).
4. If a user requests a 60-day plan for a small JD, the algorithm pads later days with "Active Recall & Review" rather than fabricating non-existent technical requirements.

## Creative Feature: Clean PDF Export & Interactive Practice Mode
* **PDF Export:** I implemented an aggressive CSS `@media print` layout. While the web UI keeps tabs isolated to save screen space, clicking "Save as PDF" instantly expands all tabs, un-flips flashcards to stack the Q&A text sequentially, and removes all UI buttons. This solves the real-world problem of needing a distraction-free, printable study guide for offline review.
* **Practice Mode:** A dedicated route (`/kits/[id]/practice`) isolates the flashcards, forcing the user to reveal the answer and rate their confidence (Hard, Good, Easy) to prioritize weaker subjects in future sessions.

## Key Design Decisions, Trade-offs & Limitations
* **LLM Rate-Limit Shield (Graceful Degradation):** Because free-tier LLM APIs strictly throttle tokens-per-minute, a pipeline making 6 concurrent requests will often crash. To ensure the application *never* strands the user with a broken UI, I built an aggressive auto-healer. If the LLM rate-limits or returns malformed JSON, the backend catches the error and instantly injects high-quality, structured fallback data (bullet-pointed React/Node/System Design questions). 
* **Limitation - Deep Crawling:** The crawler only searches a shallow depth to respect the timebox. Companies hosting their engineering blogs on separate subdomains (e.g., Medium/Substack) may not be successfully indexed. 
* **Trade-off - Session Auth:** I utilized a minimal state setup. Given the assignment's explicit directive to "keep this layer minimal," I focused engineering time on the robust data pipeline and the builder UI interactions rather than complex JWT rotation schemas.