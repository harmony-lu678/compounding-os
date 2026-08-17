import Link from "next/link";
import { CategoryIcon, categoryTagClass } from "@/components/category";
import { InlineUsageCount } from "@/components/InlineUsageCount";
import type { AssetSummary } from "@/lib/metrics";
import { restockFromSummary } from "@/lib/restock";
import type { SkillSummary } from "@/lib/skill-types";
import {
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

function RestockTag({ asset }: { asset: AssetSummary }) {
  const restock = restockFromSummary(asset);
  if (!restock) return null;
  return (
    <span className="tag tag-brand">{restock.urgency === "overdue" ? "该补了" : "快用完"}</span>
  );
}

export function DurableAssetRow({ asset }: { asset: AssetSummary }) {
  if (asset.metrics.kind !== "durable") return null;
  const m = asset.metrics.durable;
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-brand-muted/50">
      <Link href={`/assets/${asset.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <span className="icon-chip">
            <CategoryIcon category={asset.category} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{asset.name}</span>
              <span className={`tag ${categoryTagClass("durable")}`}>{asset.category}</span>
              <RestockTag asset={asset} />
            </div>
            <div className="mt-0.5 text-xs text-ink-soft">
              购入 {formatMoney(asset.priceCents)} · 现值 {formatMoneyRange(m.currentValueCents.value, 0)} ·{" "}
              {USAGE_RATING_LABEL[m.usageRating]}
            </div>
          </div>
        </div>
      </Link>
      <div className="shrink-0 text-right">
        <div className="text-sm font-semibold tabular-nums">{formatPrimaryDurableCost(m)}</div>
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
    <div className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-brand-muted/50">
      <Link href={`/assets/${asset.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <span className="icon-chip">
            <CategoryIcon category={asset.category} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{asset.name}</span>
              <span className={`tag ${categoryTagClass("consumable")}`}>{asset.category}</span>
              <RestockTag asset={asset} />
            </div>
            <div className="mt-0.5 text-xs text-ink-soft">
              购入 {formatMoney(asset.priceCents)} · {m.status === "completed" ? "已用完" : "预估中"}
            </div>
          </div>
        </div>
      </Link>
      <div className="shrink-0 text-right">
        <div className="text-sm font-semibold tabular-nums">{formatPrimaryConsumableCost(m)}</div>
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

export function SkillAssetRow({ skill }: { skill: SkillSummary }) {
  return (
    <Link href={`/skills/${skill.id}`} className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-brand-muted/50">
      <div className="flex min-w-0 items-center gap-3">
        <span className="icon-chip">
          <CategoryIcon category="能力" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{skill.name}</span>
            <span className={`tag ${categoryTagClass("skill")}`}>能力</span>
          </div>
          <div className="mt-0.5 text-xs text-ink-soft">
            {skill.lastAt ? `最近 ${skill.lastAt.slice(5)}` : "还没记过学习"}
            {skill.createCount > 0 ? ` · 做出过 ${skill.createCount} 次` : ""}
          </div>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-semibold tabular-nums">{skill.learnCount} 次</div>
        <div className="text-xs text-ink-soft">学过</div>
      </div>
    </Link>
  );
}
