import { Requirement, Question } from "@prepforge/shared-types";

export function checkCoverage(requirements: Requirement[], questions: Question[]): string[] {
  const uncovered_requirement_ids: string[] = [];

  // Filter to only "must" requirements
  const mustRequirements = requirements.filter(req => req.priority === "must");

  mustRequirements.forEach(req => {
    // Check if at least one question covers this specific requirement ID
    const isCovered = questions.some(q => q.requirement_ids.includes(req.id));
    
    if (!isCovered) {
      uncovered_requirement_ids.push(req.id);
    }
  });

  return uncovered_requirement_ids;
}