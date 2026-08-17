import { getSkill, upsertSkillPlan } from "@compos/db";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api";
import { db } from "@/lib/db";

const schema = z.object({
  status: z.enum(["learn", "practice", "project", "output", "return"]),
  hours: z.number().nonnegative(),
  moneyYuan: z.number().nonnegative(),
  applications: z.number().nonnegative(),
  weeklyHours: z.number().nonnegative(),
  outcome: z.string().optional(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError("invalid_body", "请把能力账户填完整");

  const instance = await db();
  const skill = await getSkill(instance, id);
  if (!skill) return apiError("not_found", "能力不存在", 404);

  const plan = await upsertSkillPlan(instance, {
    skillId: id,
    status: parsed.data.status,
    hours: Math.round(parsed.data.hours),
    moneyCents: Math.round(parsed.data.moneyYuan * 100),
    applications: Math.round(parsed.data.applications),
    weeklyHours: Math.round(parsed.data.weeklyHours),
    outcome: parsed.data.outcome?.trim() || null,
  });
  return apiOk({ plan });
}
