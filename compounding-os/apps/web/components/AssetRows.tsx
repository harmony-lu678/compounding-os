import Link from "next/link";
import type { AssetSummary } from "@/lib/metrics";
import { restockFromSummary } from "@/lib/restock";
import {
  formatPrimaryConsumableCost,
  formatPrimaryDurableCost,
  USAGE_RATING_LABEL,
} from "@/lib/format";

function statusOf(asset: AssetSummary): { label: string; trend: "up" | "down" | "" } {
  const restock = restockFromSummary(asset);
  if (restock?.urgency === "overdue") return { label: "该补了", trend: "" };
  if (asset.metrics.kind === "durable") {
    const rating = asset.metrics.durable.usageRating;
    return {
      label: USAGE_RATING_LABEL[rating] ?? "待校准",
      trend: rating === "high" ? "up" : rating === "low" ? "down" : "",
    };
  }
  const status = asset.metrics.consumable.status;
  return { label: status === "completed" ? "已用完" : restock ? "快用完" : "使用中", trend: "" };
}

export function DurableAssetRow({ asset }: { asset: AssetSummary }) {
  if (asset.metrics.kind !== "durable") return null;
  const status = statusOf(asset);
  return (
    <Link href={`/assets/${asset.id}`} className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-brand-muted/50">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{asset.name}</div>
        <div className="mt-0.5 text-xs text-ink-soft">{status.label}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-semibold tabular-nums">{formatPrimaryDurableCost(asset.metrics.durable)}</div>
        {status.trend && (
          <div className="text-xs text-ink-soft">{status.trend === "up" ? "↑" : "↓"}</div>
        )}
      </div>
    </Link>
  );
}

export function ConsumableAssetRow({ asset }: { asset: AssetSummary }) {
  if (asset.metrics.kind !== "consumable") return null;
  const status = statusOf(asset);
  return (
    <Link href={`/assets/${asset.id}`} className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-brand-muted/50">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{asset.name}</div>
        <div className="mt-0.5 text-xs text-ink-soft">{status.label}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-semibold tabular-nums">{formatPrimaryConsumableCost(asset.metrics.consumable)}</div>
      </div>
    </Link>
  );
}
