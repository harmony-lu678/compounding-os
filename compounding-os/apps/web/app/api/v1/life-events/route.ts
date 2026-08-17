import { todayIso } from "@compos/core";
import { appendEvent, appendLifeEvent, createSkill, getAsset, listSkills } from "@compos/db";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api";
import { db } from "@/lib/db";

const schema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("use"), assetId: z.string().min(1) }),
  z.object({
    type: z.literal("learn"),
    skillId: z.string().optional(),
    newSkillName: z.string().optional(),
  }),
  z.object({
    type: z.literal("save"),
    title: z.string().min(1),
    amountYuan: z.number().nonnegative().optional(),
    assetId: z.string().optional(),
  }),
  z.object({
    type: z.literal("create"),
    title: z.string().min(1),
    skillId: z.string().optional(),
  }),
  z.object({
    type: z.literal("clean"),
    assetId: z.string().min(1),
    action: z.enum(["tidy", "depleted", "disposed"]),
  }),
]);

export async function GET() {
  const instance = await db();
  const skills = await listSkills(instance);
  return apiOk({ skills });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_body", "请把对象补完整再记");
  }

  const instance = await db();
  const occurredAt = todayIso();
  const input = parsed.data;
  let label = "";
  let payload: Record<string, unknown> = {};

  if (input.type === "use") {
    const asset = await getAsset(instance, input.assetId);
    if (!asset || asset.status !== "active") return apiError("not_found", "资产不存在或已结束", 404);
    await appendEvent(instance, {
      assetId: asset.id,
      type: "usage_logged",
      occurredAt,
      payload: { note: "今日使用" },
    });
    label = asset.name;
    payload = { assetId: asset.id, label };
  }

  if (input.type === "learn") {
    let skillId = input.skillId;
    let skillName = "";
    if (input.newSkillName?.trim()) {
      const skill = await createSkill(instance, input.newSkillName);
      skillId = skill.id;
      skillName = skill.name;
    } else if (skillId) {
      const skills = await listSkills(instance);
      skillName = skills.find((s) => s.id === skillId)?.name ?? "";
    }
    if (!skillId || !skillName) return apiError("invalid_body", "请选择或新建一项能力");
    label = skillName;
    payload = { skillId, label };
  }

  if (input.type === "save") {
    label = input.assetId
      ? `${input.title}（用已有资产）`
      : input.amountYuan
        ? `${input.title} · 约 ¥${input.amountYuan}`
        : input.title;
    payload = { label, title: input.title, amountYuan: input.amountYuan, assetId: input.assetId };
  }

  if (input.type === "create") {
    label = input.title;
    payload = { label, skillId: input.skillId };
  }

  if (input.type === "clean") {
    const asset = await getAsset(instance, input.assetId);
    if (!asset) return apiError("not_found", "资产不存在", 404);
    if (input.action === "depleted") {
      await appendEvent(instance, { assetId: asset.id, type: "depleted", occurredAt, payload: {} });
      label = `用完 ${asset.name}`;
    } else if (input.action === "disposed") {
      await appendEvent(instance, {
        assetId: asset.id,
        type: "disposed",
        occurredAt,
        payload: { method: "discarded" },
      });
      label = `处置 ${asset.name}`;
    } else {
      label = `整理 ${asset.name}`;
    }
    payload = { assetId: asset.id, action: input.action, label };
  }

  const event = await appendLifeEvent(instance, {
    type: input.type,
    occurredAt,
    payload,
  });
  return apiOk({ event, label }, 201);
}
