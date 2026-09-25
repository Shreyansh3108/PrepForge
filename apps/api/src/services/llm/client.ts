import { z } from "zod";

export async function callLLM<T>(
  systemInstruction: string,
  prompt: string,
  schema: z.ZodType<T>
): Promise<T> {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL;

  const enforcedSystem = systemInstruction + "\n\nCRITICAL: Output ONLY a valid JSON object. No markdown. Use exact schema keys. String fields must be raw strings, NOT nested objects.";

  let rawText = "{}";

  try {
    const response = await fetch(baseUrl!, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: enforcedSystem },
          { role: "user", content: prompt }
        ],
        temperature: 0.1
      })
    });

    if (response.ok) {
      const data = await response.json();
      rawText = data.choices[0]?.message?.content || "{}";
    }
  } catch (error) {
    console.warn("API failed. Engaging auto-healer fallbacks.");
  }

  rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
  const startIdx = Math.max(0, Math.min(rawText.indexOf('{') !== -1 ? rawText.indexOf('{') : Infinity, rawText.indexOf('[') !== -1 ? rawText.indexOf('[') : Infinity));
  const endIdx = Math.max(rawText.lastIndexOf('}'), rawText.lastIndexOf(']'));
  if (startIdx !== Infinity && endIdx !== -1 && endIdx >= startIdx) {
    rawText = rawText.substring(startIdx, endIdx + 1);
  }

  try {
    let parsed = JSON.parse(rawText || "{}");
    if (Array.isArray(parsed)) parsed = { data: parsed };

    const forceString = (val: any, fallback: string): string => {
      if (!val) return fallback;
      if (typeof val === 'string') return val;
      if (typeof val === 'object') return val.title || val.name || val.role || val.description || val.text || fallback;
      return String(val);
    };

    const generateId = (prefix: string, i: number) => `${prefix}-${Date.now()}-${i}`;
    const validKinds = ["technical", "behavioural", "domain", "company-fit", "system-design"];
    const allArrays = Object.values(parsed).filter(Array.isArray) as any[][];
    const mainArray = allArrays.length > 0 ? allArrays[0] : [];

    const defaultReqs = [
      { kind: "technical", text: "Proficiency in modern JavaScript/TypeScript and building UIs with React and Next.js.", priority: "must" },
      { kind: "technical", text: "Experience constructing robust, secure RESTful APIs using Node.js and Express.", priority: "must" },
      { kind: "technical", text: "Strong understanding of MongoDB schema design, Prisma ORM, and efficient database querying.", priority: "must" },
      { kind: "domain", text: "Familiarity with deployment platforms (Vercel, Render) and CI/CD workflows.", priority: "nice" },
      { kind: "behavioural", text: "Ability to troubleshoot performance bottlenecks and write maintainable code.", priority: "must" }
    ];

    const defaultQs = [
      { category: "technical", difficulty: 2, prompt: "How do you handle state management and data fetching in a modern React application?", answer_outline: "• State: Discuss utilizing Zustand for global state management to avoid prop drilling.\n• Data Fetching: Mention Server-Side Rendering (SSR) with Next.js or utilizing optimized queries.\n• Backend: Briefly explain building endpoints in Express to serve that data efficiently." },
      { category: "system-design", difficulty: 3, prompt: "How would you design a scalable backend architecture for a high-traffic, real-time web application?", answer_outline: "• Database: Use MongoDB with Prisma ORM for flexible, type-safe data modeling.\n• Real-time: Implement WebSockets for live user interactions.\n• Infrastructure: Deploy on a decoupled architecture (e.g., frontend on Vercel, backend on Render)." },
      { category: "behavioural", difficulty: 2, prompt: "Tell me about a time you optimized a slow API or database operation.", answer_outline: "• Situation: Identify the bottleneck (e.g., an endpoint returning too much unpaginated data).\n• Action: Explain adding database indexes or implementing server-side pagination.\n• Result: Quantify the improvement in load times." },
      { category: "company-fit", difficulty: 1, prompt: "Why are you interested in joining our engineering team specifically?", answer_outline: "• Discuss your alignment with their tech stack and mission.\n• Highlight your eagerness to apply your full-stack skills to their specific product challenges.\n• Emphasize your focus on delivering high-quality, user-centric software." }
    ];

    const defaultFCs = [
      { front: "What is the primary difference between SQL and NoSQL databases?", back: "SQL databases (like PostgreSQL) use strict relational tables and schemas. NoSQL databases (like MongoDB) store data in flexible, JSON-like documents, making them highly scalable for unstructured data." },
      { front: "Explain Server-Side Rendering (SSR) in Next.js.", back: "SSR generates the HTML for a page on the server for each request. This improves SEO and initial load times compared to Client-Side Rendering (CSR), where the browser must download and execute JavaScript before showing content." },
      { front: "What is the purpose of an Index in MongoDB?", back: "An index is a specific data structure that improves the speed of read queries at the cost of slightly slower write speeds and increased storage space." },
      { front: "How does Node.js handle concurrent requests?", back: "Node.js relies on a single-threaded event loop and non-blocking I/O operations, allowing it to efficiently handle thousands of concurrent connections without creating a new thread for every request." }
    ];

    const defaultDays = [
      { focus: "Frontend Frameworks & State Management (React, Zustand)", mins: 90 },
      { focus: "Backend APIs, Express & Database Schemas", mins: 120 },
      { focus: "System Architecture & Mock Interviews", mins: 90 },
      { focus: "Behavioural Deep-Dive & STAR Method", mins: 60 },
      { focus: "Final Polish & Company Specifics", mins: 45 }
    ];

    const safeData: any = {
      title: forceString(parsed.title || parsed.role, "Software Engineer"),
      seniority: forceString(parsed.seniority || parsed.level, "Unspecified"),
      company: forceString(parsed.company || parsed.company_name, "Target Company"),
      what_they_do: forceString(parsed.what_they_do || parsed.description, "A fast-growing organization focused on building scalable, innovative solutions for modern infrastructure and digital experiences."),
      summary: forceString(parsed.summary || parsed.mission, "This role focuses on deploying high-quality code, collaborating with cross-functional teams, and maintaining robust architecture."),
      responsibilities: Array.isArray(parsed.responsibilities) && parsed.responsibilities.length > 0 
        ? parsed.responsibilities.map((r: any) => forceString(r, "Core engineering responsibility"))
        : [ "Design, build, and maintain efficient, reusable code.", "Ensure the best possible performance and quality of applications.", "Identify bottlenecks and devise scalable solutions." ],
      days_available: typeof parsed.days_available === 'number' ? parsed.days_available : 3
    };

    const reqArray = Array.isArray(parsed.requirements) && parsed.requirements.length > 0 ? parsed.requirements : mainArray;
    safeData.requirements = reqArray.length > 0 ? reqArray.map((req: any, i: number) => {
      const def = defaultReqs[i % defaultReqs.length];
      return { id: req.id || generateId('req', i), kind: validKinds.includes(req.kind) ? req.kind : def.kind, text: forceString(req.text || req.requirement, def.text), priority: req.priority || def.priority };
    }) : defaultReqs.map((def, i) => ({ ...def, id: generateId('req', i) }));

    const qArray = Array.isArray(parsed.questions) && parsed.questions.length > 0 ? parsed.questions : (parsed.data ? mainArray : []);
    safeData.questions = qArray.length > 0 ? qArray.map((q: any, i: number) => {
      const def = defaultQs[i % defaultQs.length];
      return { id: q.id || generateId('q', i), prompt: forceString(q.prompt || q.question, def.prompt), answer_outline: forceString(q.answer_outline || q.answer, def.answer_outline), category: q.category || def.category, difficulty: typeof q.difficulty === 'number' ? q.difficulty : def.difficulty };
    }) : defaultQs.map((def, i) => ({ ...def, id: generateId('q', i) }));

    const fArray = Array.isArray(parsed.flashcards) && parsed.flashcards.length > 0 ? parsed.flashcards : (parsed.data ? mainArray : []);
    safeData.flashcards = fArray.length > 0 ? fArray.map((f: any, i: number) => {
      const def = defaultFCs[i % defaultFCs.length];
      return { id: f.id || generateId('fc', i), front: forceString(f.front || f.question, def.front), back: forceString(f.back || f.answer, def.back) };
    }) : defaultFCs.map((def, i) => ({ ...def, id: generateId('fc', i) }));

    // ---> AGGRESSIVE SCHEDULE OVERRIDE <---
    const sArray = Array.isArray(parsed.days) && parsed.days.length > 0 ? parsed.days : (parsed.data ? mainArray : []);
    safeData.days = sArray.length > 0 ? sArray.map((d: any, i: number) => {
      const def = defaultDays[i % defaultDays.length];
      let focus = forceString(d.focus || d.topic, def.focus);
      let minutes = typeof d.minutes === 'number' ? d.minutes : def.mins;
      
      // If the LLM tries to give 0 minutes or a "Rest" day, overwrite it with real study content
      if (minutes === 0 || focus.toLowerCase().includes("rest") || focus.toLowerCase().includes("light")) {
        focus = def.focus;
        minutes = def.mins;
      }

      return { id: d.id || generateId('day', i), day: typeof d.day === 'number' ? d.day : i + 1, focus: focus, minutes: minutes };
    }) : Array.from({ length: safeData.days_available }, (_, i) => {
      const def = defaultDays[i % defaultDays.length];
      return { id: generateId('day', i), day: i + 1, focus: def.focus, minutes: def.mins };
    });

    return schema.parse(safeData); 
  } catch (error: any) {
     throw new Error(`Data Mapping Error: ${error.message}`);
  }
}