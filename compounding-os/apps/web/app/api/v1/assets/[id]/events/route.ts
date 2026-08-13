import { eventPayloadByType, todayIso, type EventType } from "@compos/core";
import { appendEvent, getAsset, getAssetEvents } from "@compos/db";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api";
import { db } from "@/lib/db";
import { summarize } from "@/lib/metrics";

const APPENDABLE_TYPES = Object.keys(eventPayloadByType).filter((t) => t !== "acquired") as EventType[];

const appendEventSchema = z.object({
  type: z.enum(APPENDABLE_TYPES as [EventType, ...EventType[]]),
  occurredAt: z.string().default(() => todayIso()),
  payload: z.unknown(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const instance = await db();
  const asset = await getAsset(instance, id);
  if (!asset) return apiError("not_found", "资产不存在", 404);

  const body = await request.json().catch(() => null);
  const parsed = appendEventSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_body", parsed.error.issues.map((i) => i.message).join("; "));
  }

  const payloadSchema = eventPayloadByType[parsed.data.type];
  const payloadResult = payloadSchema.safeParse(parsed.data.payload);
  if (!payloadResult.success) {
    return apiError(
      "invalid_payload",
      `事件 ${parsed.data.type} 的 payload 不合法：${payloadResult.error.issues.map((i) => i.message).join("; ")}`,
    );
  }

  await appendEvent(instance, {
    assetId: id,
    type: parsed.data.type,
    occurredAt: parsed.data.occurredAt,
    payload: payloadResult.data,
  });

  const refreshedAsset = await getAsset(instance, id);
  const events = await getAssetEvents(instance, id);
  return apiOk({ asset: summarize(refreshedAsset!, events) }, 201);
}
