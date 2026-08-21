import {
  computeConsumable,
  computeDurable,
  todayIso,
  type AssetEvent,
  type CaptureMode,
  type ConsumableMetrics,
  type Seasonality,
  type DurableMetrics,
  type EventType,
} from "@compos/core";
import type { AssetRow, EventRow } from "@compos/db";
import { resolveCaptureMode } from "@/lib/capture";
import { resolveSeasonality } from "@/lib/season";

export function toAssetEvents(rows: EventRow[]): AssetEvent[] {
  return rows.map((row) => ({
    id: row.id,
    assetId: row.assetId,
    type: row.type as EventType,
    occurredAt: row.occurredAt,
    payload: row.payload,
    createdAt: row.createdAt,
  }));
}

export type AssetMetrics =
  | { kind: "durable"; durable: DurableMetrics }
  | { kind: "consumable"; consumable: ConsumableMetrics };

export function computeAssetMetrics(
  asset: AssetRow,
  eventRows: EventRow[],
  asOf: string = todayIso(),
): AssetMetrics {
  const events = toAssetEvents(eventRows);
  if (asset.kind === "durable") {
    return { kind: "durable", durable: computeDurable(events, asOf) };
  }
  return { kind: "consumable", consumable: computeConsumable(events, asOf) };
}

export interface AssetSummary {
  id: string;
  name: string;
  kind: "durable" | "consumable";
  category: string;
  status: string;
  priceCents: number;
  createdAt: string;
  captureMode: CaptureMode;
  seasonality: Seasonality;
  metrics: AssetMetrics;
}

export function summarize(asset: AssetRow, eventRows: EventRow[], asOf?: string): AssetSummary {
  return {
    id: asset.id,
    name: asset.name,
    kind: asset.kind,
    category: asset.category,
    status: asset.status,
    priceCents: asset.priceCents,
    createdAt: asset.createdAt,
    captureMode: resolveCaptureMode(asset, eventRows),
    seasonality: resolveSeasonality(asset),
    metrics: computeAssetMetrics(asset, eventRows, asOf),
  };
}
