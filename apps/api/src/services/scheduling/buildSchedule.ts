import { Requirement, Question } from "@prepforge/shared-types";

// Fixed minute estimates per difficulty level to avoid LLM hallucinations
const DIFFICULTY_MINUTES: Record<number, number> = {
  1: 15,
  2: 25,
  3: 40
};

export function buildSchedule(
  requirements: Requirement[],
  questions: Question[],
  daysAvailable: number
) {
  // 1. Identify all "must" requirement IDs
  const mustReqIds = new Set(requirements.filter(r => r.priority === "must").map(r => r.id));

  // 2. Tag questions that cover at least one "must" requirement
  const enrichedQuestions = questions.map(q => {
    const isMust = q.requirement_ids.some(id => mustReqIds.has(id));
    return { ...q, isMust };
  });

  // 3. Sort questions: "must" requirements first, then by difficulty descending (hardest first)
  enrichedQuestions.sort((a, b) => {
    if (a.isMust && !b.isMust) return -1;
    if (!a.isMust && b.isMust) return 1;
    return b.difficulty - a.difficulty; 
  });

  // 4. Initialize empty day buckets based on user's requested timeline
  const days = Array.from({ length: daysAvailable }, (_, i) => ({
    day: i + 1,
    focus: "",
    question_ids: [] as string[],
    minutes: 0,
    categories: new Set<string>()
  }));

  // 5. Distribute questions round-robin to front-load the hardest material
  enrichedQuestions.forEach((q, index) => {
    const dayIndex = index % daysAvailable;
    days[dayIndex].question_ids.push(q.id);
    days[dayIndex].minutes += DIFFICULTY_MINUTES[q.difficulty] || 20;
    days[dayIndex].categories.add(q.category);
  });

  // 6. Format output and generate a dynamic focus title based on the day's categories
  return days.map(d => {
    const catArray = Array.from(d.categories);
    let focus = "Review & Synthesis";
    
    if (catArray.length > 0) {
      focus = catArray
        .map(c => c.charAt(0).toUpperCase() + c.slice(1).replace("-", " "))
        .join(" & ");
    }
    
    // Handle edge cases where days > questions (e.g., 60-day schedule requested for a thin JD)
    if (d.question_ids.length === 0) {
       focus = "Rest or Light Review";
    }

    return {
      day: d.day,
      focus: focus,
      question_ids: d.question_ids,
      minutes: d.minutes
    };
  });
}