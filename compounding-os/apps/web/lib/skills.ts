import { getSkill, listAllLifeEvents, listSkills, type LifeEventRow } from "@compos/db";
import { db } from "@/lib/db";
import type { SkillSummary, SkillTimelineItem, SkillView } from "@/lib/skill-types";

function payloadOf(event: LifeEventRow): { skillId?: string; label?: string; title?: string } {
  return (event.payload ?? {}) as { skillId?: string; label?: string; title?: string };
}

function toSummary(
  skill: { id: string; name: string },
  events: LifeEventRow[],
): SkillSummary {
  const related = events.filter((e) => payloadOf(e).skillId === skill.id);
  const learns = related.filter((e) => e.type === "learn");
  const creates = related.filter((e) => e.type === "create");
  const last = related[0];
  return {
    id: skill.id,
    name: skill.name,
    learnCount: learns.length,
    createCount: creates.length,
    lastAt: last?.occurredAt,
  };
}

export async function getSkillSummaries(): Promise<SkillSummary[]> {
  const instance = await db();
  const [skills, events] = await Promise.all([listSkills(instance), listAllLifeEvents(instance)]);
  return skills.map((skill) => toSummary(skill, events));
}

export async function getSkillView(id: string): Promise<SkillView | null> {
  const instance = await db();
  const skill = await getSkill(instance, id);
  if (!skill) return null;
  const events = await listAllLifeEvents(instance);
  const related = events.filter((e) => {
    const payload = payloadOf(e);
    return payload.skillId === skill.id && (e.type === "learn" || e.type === "create");
  });
  const timeline: SkillTimelineItem[] = related.map((e) => {
    const payload = payloadOf(e);
    return {
      id: e.id,
      type: e.type as "learn" | "create",
      date: e.occurredAt,
      title: e.type === "learn" ? `学了一次${payload.label ? ` · ${payload.label}` : ""}` : payload.title ?? payload.label ?? "做出了东西",
    };
  });
  return { skill: toSummary(skill, events), timeline };
}
