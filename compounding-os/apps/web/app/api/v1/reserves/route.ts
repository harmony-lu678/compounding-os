import { createReserve, listReserves, updateReserve } from "@compos/db";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api";
import { db } from "@/lib/db";

const createSchema = z.object({
  name: z.string().min(1),
  targetYuan: z.number().positive(),
  targetDate: z.string().min(8),
  currentYuan: z.number().nonnegative().optional(),
  assetId: z.string().optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  currentYuan: z.number().nonnegative().optional(),
  targetYuan: z.number().positive().optional(),
  targetDate: z.string().optional(),
  name: z.string().optional(),
});

export async function GET() {
  const instance = await db();
  return apiOk({ reserves: await listReserves(instance) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError("invalid_body", "请填写储备金名称、目标和日期");
  const instance = await db();
  const reserve = await createReserve(instance, {
    name: parsed.data.name,
    targetCents: Math.round(parsed.data.targetYuan * 100),
    targetDate: parsed.data.targetDate,
    currentCents: Math.round((parsed.data.currentYuan ?? 0) * 100),
    assetId: parsed.data.assetId,
  });
  return apiOk({ reserve }, 201);
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError("invalid_body", "请指定要更新的储备金");
  const instance = await db();
  const reserve = await updateReserve(instance, parsed.data.id, {
    name: parsed.data.name,
    targetCents: parsed.data.targetYuan != null ? Math.round(parsed.data.targetYuan * 100) : undefined,
    targetDate: parsed.data.targetDate,
    currentCents: parsed.data.currentYuan != null ? Math.round(parsed.data.currentYuan * 100) : undefined,
  });
  if (!reserve) return apiError("not_found", "储备金不存在", 404);
  return apiOk({ reserve });
}
