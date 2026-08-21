import {
  analyzeUsageGap,
  calendarSeason,
  CALENDAR_SEASON_LABEL,
  daysBetween,
  inferSeasonality,
  isSeasonality,
  isSeasonTransition,
  type CalendarSeason,
  type GapLevel,
  type Seasonality,
  type UsageLife,
} from "@compos/core";
import type { AssetRow, EventRow } from "@compos/db";
import { resolveCaptureMode } from "@/lib/capture";

export function resolveSeasonality(asset: AssetRow): Seasonality {
  if (isSeasonality(asset.seasonality) && asset.seasonality !== "year") {
    return asset.seasonality;
  }
  return inferSeasonality(asset.name, asset.category);
}

export interface SeasonAssetCard {
  id: string;
  name: string;
  seasonality: Seasonality;
  life: UsageLife;
  gapLevel: GapLevel;
  score: number;
  usesThisWindow: number;
  usesLastYearSameMonth: number;
  lastUsedAt: string | null;
  daysSinceLastUse: number | null;
  insight: string;
}

export interface SeasonToday {
  asOf: string;
  calendarSeason: CalendarSeason;
  seasonLabel: string;
  transitioning: boolean;
  likely: { id: string; name: string }[];
  watch: SeasonAssetCard[];
  insight: { title: string; body: string; assetId?: string } | null;
}

function insightLine(card: SeasonAssetCard, seasonLabel: string): string {
  if (card.gapLevel === "idle" && card.usesLastYearSameMonth > 0) {
    return `去年这个时间你已经用过 ${card.usesLastYearSameMonth} 次，今年还是 0。`;
  }
  if (card.gapLevel === "watch" && card.usesLastYearSameMonth > 0) {
    return `比你往年的${seasonLabel}节奏慢。去年同期 ${card.usesLastYearSameMonth} 次，今年 ${card.usesThisWindow} 次。`;
  }
  return "进入预期使用窗口后，还没有对上你的历史节奏。";
}

export function buildSeasonToday(
  assets: AssetRow[],
  eventsByAsset: Map<string, EventRow[]>,
  asOf: string,
): SeasonToday {
  const season = calendarSeason(asOf);
  const seasonLabel = CALENDAR_SEASON_LABEL[season];
  const cards: SeasonAssetCard[] = [];
  const likely: { id: string; name: string }[] = [];

  for (const asset of assets) {
    if (asset.status !== "active" || asset.kind !== "durable") continue;
    const events = eventsByAsset.get(asset.id) ?? [];
    const seasonality = resolveSeasonality(asset);
    const capture = resolveCaptureMode(asset, events);
    if (seasonality === "year" && capture === "auto") continue;

    const usageDates = events.filter((e) => e.type === "usage_logged").map((e) => e.occurredAt);
    const gap = analyzeUsageGap({ seasonality, asOf, usageDates });
    const daysSinceLastUse = gap.lastUsedAt ? daysBetween(gap.lastUsedAt, asOf) : null;
    const card: SeasonAssetCard = {
      id: asset.id,
      name: asset.name,
      seasonality,
      life: gap.life,
      gapLevel: gap.gapLevel,
      score: gap.score,
      usesThisWindow: gap.usesThisWindow,
      usesLastYearSameMonth: gap.usesLastYearSameMonth,
      lastUsedAt: gap.lastUsedAt,
      daysSinceLastUse,
      insight: "",
    };
    card.insight = insightLine(card, seasonLabel);

    if (gap.inWindow && (seasonality !== "year" || gap.usesLastYearSameMonth > 0)) {
      likely.push({ id: asset.id, name: asset.name });
    }
    if (gap.gapLevel !== "none") cards.push(card);
  }

  const watch = cards.sort((a, b) => b.score - a.score).slice(0, 4);

  const top = watch[0];
  const insight = top
    ? {
        title: top.gapLevel === "idle" ? "季节资产值得看一眼" : "使用节奏慢了一点",
        body: `${top.name}：${top.insight}`,
        assetId: top.id,
      }
    : null;

  return {
    asOf,
    calendarSeason: season,
    seasonLabel,
    transitioning: isSeasonTransition(asOf),
    likely: likely.slice(0, 5),
    watch,
    insight,
  };
}
