import { isCaptureMode, isSeasonality } from "@compos/core";
import { updateAssetCaptureMode, updateAssetSeasonality } from "@compos/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api";
import { db } from "@/lib/db";
import { getAssetDetail } from "@/lib/queries";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getAssetDetail(id);
  if (!detail) return apiError("not_found", "资产不存在", 404);
  return apiOk(detail);
}

const patchSchema = z.object({
  captureMode: z.enum(["auto", "quick", "batch"]).optional(),
  seasonality: z.enum(["year", "spring_autumn", "summer", "winter", "scene"]).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError("invalid_body", "字段无效");
  const detail = await getAssetDetail(id);
  if (!detail) return apiError("not_found", "资产不存在", 404);

  const instance = await db();
  if (parsed.data.captureMode && isCaptureMode(parsed.data.captureMode)) {
    await updateAssetCaptureMode(instance, id, parsed.data.captureMode);
  }
  if (parsed.data.seasonality && isSeasonality(parsed.data.seasonality)) {
    await updateAssetSeasonality(instance, id, parsed.data.seasonality);
  }
  revalidatePath("/");
  revalidatePath("/assets");
  revalidatePath("/season");
  revalidatePath(`/assets/${id}`);
  return apiOk({ ok: true, ...parsed.data });
}
