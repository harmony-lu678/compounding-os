import { acquiredPayloadSchema, inferCaptureMode, inferSeasonality } from "@compos/core";
import { createAsset, getAssetEvents } from "@compos/db";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api";
import { db } from "@/lib/db";
import { summarize } from "@/lib/metrics";
import { getAssetList } from "@/lib/queries";

const createAssetSchema = z.object({
  name: z.string().min(1),
  occurredAt: z.string(),
  payload: acquiredPayloadSchema,
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const status = url.searchParams.get("status");

  const assets = await getAssetList({
    kind: kind === "durable" || kind === "consumable" ? kind : undefined,
    status: status === "active" || status === "disposed" || status === "archived" ? status : undefined,
  });

  return apiOk({ assets });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createAssetSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_body", parsed.error.issues.map((i) => i.message).join("; "));
  }

  const { name, occurredAt, payload } = parsed.data;
  const instance = await db();
  const asset = await createAsset(instance, {
    kind: payload.kind,
    name,
    category: payload.category,
    priceCents: payload.priceCents,
    occurredAt,
    payload,
    captureMode: inferCaptureMode({
      kind: payload.kind,
      name,
      category: payload.category,
      usageFrequency: payload.usageFrequency,
    }),
    seasonality: inferSeasonality(name, payload.category),
  });

  const events = await getAssetEvents(instance, asset.id);
  return apiOk({ asset: summarize(asset, events) }, 201);
}
