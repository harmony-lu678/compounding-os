import { inferCaptureMode, isCaptureMode, type CaptureMode, type UsageFrequency } from "@compos/core";
import type { AssetRow, EventRow } from "@compos/db";

export function resolveCaptureMode(asset: AssetRow, events: EventRow[] = []): CaptureMode {
  if (isCaptureMode(asset.captureMode)) return asset.captureMode;
  const acquired = events.find((e) => e.type === "acquired");
  const payload = (acquired?.payload ?? {}) as { usageFrequency?: UsageFrequency };
  return inferCaptureMode({
    kind: asset.kind,
    name: asset.name,
    category: asset.category,
    usageFrequency: payload.usageFrequency,
  });
}
