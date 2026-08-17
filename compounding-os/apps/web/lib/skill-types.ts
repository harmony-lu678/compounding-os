export interface SkillSummary {
  id: string;
  name: string;
  learnCount: number;
  createCount: number;
  lastAt?: string;
}

export interface SkillTimelineItem {
  id: string;
  type: "learn" | "create";
  date: string;
  title: string;
}

export interface SkillView {
  skill: SkillSummary;
  timeline: SkillTimelineItem[];
}
