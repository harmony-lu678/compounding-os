import { getAsset, upsertAssetPlan } from "@compos/db";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api";
import { db } from "@/lib/db";

const schema = z.object({
  intent: z.enum(["continue", "upgrade", "sell", "replace"]),
  replaceCostYuan: z.number().nonnegative().optional(),
  windowStart: z.string().optional(),
  windowEnd: z.string().optional(),
  triggerYears: z.string().optional(),
  triggerMaintPct: z.string().optional(),
  triggerUses: z.string().optional(),
  triggerNote: z.string().optional(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError("invalid_body", "请把规划项填完整");

  const instance = await db();
  const asset = await getAsset(instance, id);
  if (!asset) return apiError("not_found", "资产不存在", 404);

  const plan = await upsertAssetPlan(instance, {
    assetId: id,
    intent: parsed.data.intent,
    replaceCostCents:
      parsed.data.replaceCostYuan != null ? Math.round(parsed.data.replaceCostYuan * 100) : asset.priceCents,
    windowStart: parsed.data.windowStart || null,
    windowEnd: parsed.data.windowEnd || null,
    triggerYears: parsed.data.triggerYears || null,
    triggerMaintPct: parsed.data.triggerMaintPct || null,
    triggerUses: parsed.data.triggerUses ? Number(parsed.data.triggerUses) : null,
    triggerNote: parsed.data.triggerNote || null,
  });
  return apiOk({ plan });
}
