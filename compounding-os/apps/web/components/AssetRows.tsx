import Link from "next/link";
import type { AssetSummary } from "@/lib/metrics";
import { InlineUsageCount } from "@/components/InlineUsageCount";
import {
  categoryColor,
  formatMoney,
  formatMoneyRange,
  formatPrimaryConsumableCost,
  formatPrimaryDurableCost,
  primaryConsumableCost,
  primaryDurableCost,
  USAGE_RATING_LABEL,
} from "@/lib/format";

function mid(range: { min: number; max: number }) {
  return (range.min + range.max) / 2;
}

export function DurableAssetRow({ asset }: { asset: AssetSummary }) {
  if (asset.metrics.kind !== "durable") return null;
  const m = asset.metrics.durable;
  return (
    <div className="flex items-center justify-between gap-4 p-4 hover:bg-paper">
      <Link href={`/assets/${asset.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`tag ${categoryColor(asset.category)}`}>{asset.category}</span>
          <span className="truncate text-sm font-medium">{asset.name}</span>
        </div>
        <div className="mt-1 text-xs text-ink-soft">
          购入 {formatMoney(asset.priceCents)} · 现值 {formatMoneyRange(m.currentValueCents.value, 0)} ·{" "}
          {USAGE_RATING_LABEL[m.usageRating]}
        </div>
      </Link>
      <div className="shrink-0 text-right">
        <div className="text-sm font-semibold">{formatPrimaryDurableCost(m)}</div>
        <div className="text-xs text-ink-soft">{primaryDurableCost(m).label}</div>
        {m.primaryCostMetric === "per_use" && asset.status === "active" && (
          <InlineUsageCount
            assetId={asset.id}
            periodDays={m.daysHeld}
            initialCount={Math.round(mid(m.estimatedUsageCount.value))}
          />
        )}
      </div>
    </div>
  );
}

export function ConsumableAssetRow({ asset }: { asset: AssetSummary }) {
  if (asset.metrics.kind !== "consumable") return null;
  const m = asset.metrics.consumable;
  return (
    <div className="flex items-center justify-between gap-4 p-4 hover:bg-paper">
      <Link href={`/assets/${asset.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`tag ${categoryColor(asset.category)}`}>{asset.category}</span>
          <span className="truncate text-sm font-medium">{asset.name}</span>
        </div>
        <div className="mt-1 text-xs text-ink-soft">
          购入 {formatMoney(asset.priceCents)} · {m.status === "completed" ? "已用完" : "预估中"}
        </div>
      </Link>
      <div className="shrink-0 text-right">
        <div className="text-sm font-semibold">{formatPrimaryConsumableCost(m)}</div>
        <div className="text-xs text-ink-soft">{primaryConsumableCost(m).label}</div>
        {m.primaryCostMetric === "per_use" && asset.status === "active" && (
          <InlineUsageCount
            assetId={asset.id}
            periodDays={m.daysSinceStart}
            initialCount={Math.round(mid(m.estimatedUsageCount.value))}
          />
        )}
      </div>
    </div>
  );
}
