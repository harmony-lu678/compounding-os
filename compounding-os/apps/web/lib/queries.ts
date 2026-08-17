import { addDays, daysBetween, todayIso, type Range } from "@compos/core";
import { getAsset, getAssetEvents, getEventsForAssets, listAssets, type EventRow } from "@compos/db";
import { db } from "@/lib/db";
import { computeAssetMetrics, summarize, type AssetSummary } from "@/lib/metrics";

function sumRanges(ranges: Range[]): Range {
  return ranges.reduce((acc, r) => ({ min: acc.min + r.min, max: acc.max + r.max }), { min: 0, max: 0 });
}

function mid(range: Range): number {
  return (range.min + range.max) / 2;
}

export async function getAssetList(filter: { kind?: "durable" | "consumable"; status?: "active" | "disposed" | "archived" } = {}): Promise<AssetSummary[]> {
  const instance = await db();
  const rows = await listAssets(instance, filter);
  const eventsByAsset = await getEventsForAssets(instance, rows.map((r) => r.id));
  const asOf = todayIso();
  return rows.map((asset) => summarize(asset, eventsByAsset.get(asset.id) ?? [], asOf));
}

export async function getAssetDetail(id: string): Promise<{ asset: AssetSummary; events: ReturnType<typeof getAssetEvents> extends Promise<infer T> ? T : never } | null> {
  const instance = await db();
  const asset = await getAsset(instance, id);
  if (!asset) return null;
  const events = await getAssetEvents(instance, id);
  return { asset: summarize(asset, events), events };
}

export interface Quadrant {
  count: number;
  valueCents: Range;
}

export type QuadrantKey = "highValueHighFreq" | "highValueLowFreq" | "lowValueHighFreq" | "lowValueLowFreq";

export const QUADRANT_LABELS: Record<QuadrantKey, string> = {
  highValueHighFreq: "高价值 · 高频使用",
  highValueLowFreq: "高价值 · 低频使用",
  lowValueHighFreq: "低价值 · 高频使用",
  lowValueLowFreq: "低价值 · 低频使用",
};

function quadrantKeyFor(isHighValue: boolean, isHighFreq: boolean): QuadrantKey {
  return isHighValue
    ? isHighFreq
      ? "highValueHighFreq"
      : "highValueLowFreq"
    : isHighFreq
      ? "lowValueHighFreq"
      : "lowValueLowFreq";
}

/** 与 getDashboardData 里四象限完全一致的分类口径：仅统计在用耐用品，价格中位数 × usageRating==high。 */
export async function getQuadrantAssets(key: QuadrantKey): Promise<AssetSummary[]> {
  const instance = await db();
  const asOf = todayIso();
  const activeAssets = await listAssets(instance, { status: "active" });
  const eventsByAsset = await getEventsForAssets(instance, activeAssets.map((a) => a.id));
  const durableAssets = activeAssets.filter((a) => a.kind === "durable");

  const prices = durableAssets.map((a) => a.priceCents).sort((a, b) => a - b);
  const medianPrice = prices.length > 0 ? prices[Math.floor(prices.length / 2)]! : 0;

  return durableAssets
    .map((asset) => {
      const metrics = computeAssetMetrics(asset, eventsByAsset.get(asset.id) ?? [], asOf);
      return { asset, metrics: metrics.kind === "durable" ? metrics.durable : null };
    })
    .filter(({ asset, metrics }) => {
      if (!metrics) return false;
      const isHighValue = asset.priceCents >= medianPrice;
      const isHighFreq = metrics.usageRating === "high";
      return quadrantKeyFor(isHighValue, isHighFreq) === key;
    })
    .map(({ asset }) => summarize(asset, eventsByAsset.get(asset.id) ?? [], asOf));
}

export interface DashboardData {
  asOf: string;
  physicalAssetCount: number;
  consumableAssetCount: number;
  totalValueCents: Range;
  todayCostCents: Range;
  durableDailyCostCents: Range;
  consumableDailyCostCents: Range;
  quadrants: {
    highValueHighFreq: Quadrant;
    highValueLowFreq: Quadrant;
    lowValueHighFreq: Quadrant;
    lowValueLowFreq: Quadrant;
  };
  releasableCashCents: Range;
  consumableInProgress: {
    id: string;
    name: string;
    dailyCostCents: Range;
    perUseCostCents: Range;
    primaryCostMetric: "daily" | "per_use";
    predictedDepletionDate?: { min: string; max: string };
  }[];
  /** 按天计成本的类目（电子产品/家具等耐用品）里最贵的几件 */
  topDailyCost: { id: string; name: string; category: string; dailyCostCents: Range }[];
  /** 按次计成本的类目（衣物/箱包/饰品/洗护/护肤/彩妆等）里最贵的几件 */
  topPerUseCost: { id: string; name: string; category: string; perUseCostCents: Range }[];
}

export async function getDashboardData(): Promise<DashboardData> {
  const instance = await db();
  const asOf = todayIso();
  const activeAssets = await listAssets(instance, { status: "active" });
  const eventsByAsset = await getEventsForAssets(instance, activeAssets.map((a) => a.id));

  const durableAssets = activeAssets.filter((a) => a.kind === "durable");
  const consumableAssets = activeAssets.filter((a) => a.kind === "consumable");

  const durableComputed = durableAssets.map((asset) => {
    const metrics = computeAssetMetrics(asset, eventsByAsset.get(asset.id) ?? [], asOf);
    return { asset, metrics: metrics.kind === "durable" ? metrics.durable : null };
  });

  const consumableComputed = consumableAssets.map((asset) => {
    const metrics = computeAssetMetrics(asset, eventsByAsset.get(asset.id) ?? [], asOf);
    return { asset, metrics: metrics.kind === "consumable" ? metrics.consumable : null };
  });

  const totalValueCents = sumRanges(durableComputed.map((d) => d.metrics?.currentValueCents.value ?? { min: 0, max: 0 }));
  const durableDailyCostCents = sumRanges(
    durableComputed.map((d) => d.metrics?.realizedDailyCostCents.value ?? { min: 0, max: 0 }),
  );
  const consumableDailyCostCents = sumRanges(
    consumableComputed.map((c) => c.metrics?.dailyCostCents.value ?? { min: 0, max: 0 }),
  );

  const prices = durableAssets.map((a) => a.priceCents).sort((a, b) => a - b);
  const medianPrice = prices.length > 0 ? prices[Math.floor(prices.length / 2)]! : 0;

  const quadrants: DashboardData["quadrants"] = {
    highValueHighFreq: { count: 0, valueCents: { min: 0, max: 0 } },
    highValueLowFreq: { count: 0, valueCents: { min: 0, max: 0 } },
    lowValueHighFreq: { count: 0, valueCents: { min: 0, max: 0 } },
    lowValueLowFreq: { count: 0, valueCents: { min: 0, max: 0 } },
  };

  for (const { asset, metrics } of durableComputed) {
    if (!metrics) continue;
    const isHighValue = asset.priceCents >= medianPrice;
    const isHighFreq = metrics.usageRating === "high";
    const key = quadrantKeyFor(isHighValue, isHighFreq);
    quadrants[key].count += 1;
    quadrants[key].valueCents.min += metrics.currentValueCents.value.min;
    quadrants[key].valueCents.max += metrics.currentValueCents.value.max;
  }

  const consumableInProgress = consumableComputed
    .filter((c) => c.metrics?.status === "in_progress")
    .map((c) => ({
      id: c.asset.id,
      name: c.asset.name,
      dailyCostCents: c.metrics!.dailyCostCents.value,
      perUseCostCents: c.metrics!.perUseCostCents.value,
      primaryCostMetric: c.metrics!.primaryCostMetric,
      predictedDepletionDate: c.metrics!.predictedDepletionDate,
    }))
    .sort((a, b) => {
      const aVal = a.primaryCostMetric === "daily" ? mid(a.dailyCostCents) : mid(a.perUseCostCents);
      const bVal = b.primaryCostMetric === "daily" ? mid(b.dailyCostCents) : mid(b.perUseCostCents);
      return bVal - aVal;
    });

  const topDailyCost = durableComputed
    .filter((d) => d.metrics?.primaryCostMetric === "daily")
    .map((d) => ({
      id: d.asset.id,
      name: d.asset.name,
      category: d.asset.category,
      dailyCostCents: d.metrics!.realizedDailyCostCents.value,
    }))
    .concat(
      consumableComputed
        .filter((c) => c.metrics?.primaryCostMetric === "daily")
        .map((c) => ({
          id: c.asset.id,
          name: c.asset.name,
          category: c.asset.category,
          dailyCostCents: c.metrics!.dailyCostCents.value,
        })),
    )
    .sort((a, b) => mid(b.dailyCostCents) - mid(a.dailyCostCents))
    .slice(0, 5);

  const topPerUseCost = durableComputed
    .filter((d) => d.metrics?.primaryCostMetric === "per_use")
    .map((d) => ({
      id: d.asset.id,
      name: d.asset.name,
      category: d.asset.category,
      perUseCostCents: d.metrics!.perUseCostCents.value,
    }))
    .concat(
      consumableComputed
        .filter((c) => c.metrics?.primaryCostMetric === "per_use")
        .map((c) => ({
          id: c.asset.id,
          name: c.asset.name,
          category: c.asset.category,
          perUseCostCents: c.metrics!.perUseCostCents.value,
        })),
    )
    .sort((a, b) => mid(b.perUseCostCents) - mid(a.perUseCostCents))
    .slice(0, 5);

  return {
    asOf,
    physicalAssetCount: durableAssets.length,
    consumableAssetCount: consumableAssets.length,
    totalValueCents,
    todayCostCents: sumRanges([durableDailyCostCents, consumableDailyCostCents]),
    durableDailyCostCents,
    consumableDailyCostCents,
    quadrants,
    releasableCashCents: quadrants.highValueLowFreq.valueCents,
    consumableInProgress,
    topDailyCost,
    topPerUseCost,
  };
}

// ---------------------------------------------------------------------------
// 周报摘要（Phase 1 留存钩子）：本周动态 + 最值/最不值 Top3 + 待校准提醒。
// 没有定时任务/邮件基础设施，采用「打开即生成」的滚动 7 天窗口，而不是真正的
// 按周定时快照——用户每次访问这个页面看到的都是「过去 7 天」的实时摘要。
// ---------------------------------------------------------------------------

export interface WeeklyDigest {
  windowStart: string;
  windowEnd: string;
  newAssets: {
    id: string;
    name: string;
    kind: "durable" | "consumable";
    category: string;
    priceCents: number;
    occurredAt: string;
  }[];
  depletedConsumables: {
    id: string;
    name: string;
    category: string;
    occurredAt: string;
    cycleDays: number;
    dailyCostCents: number;
  }[];
  calibrationTouchCount: number;
  todayCostCents: Range;
  cheapestDaily: { id: string; name: string; category: string; dailyCostCents: Range }[];
  costliestDaily: { id: string; name: string; category: string; dailyCostCents: Range }[];
  cheapestPerUse: { id: string; name: string; category: string; perUseCostCents: Range }[];
  costliestPerUse: { id: string; name: string; category: string; perUseCostCents: Range }[];
  calibrationReminders: { id: string; name: string; category: string; daysSinceCalibration: number }[];
}

const CALIBRATION_TOUCH_TYPES = new Set(["acquired", "assumption_changed", "usage_calibrated"]);
/** 低于这个天数不打扰用户——「轻校准」只提醒那些确实很久没碰过的资产。 */
const CALIBRATION_REMINDER_THRESHOLD_DAYS = 20;

function lastCalibrationTouch(events: EventRow[]): string {
  let latest = "";
  for (const e of events) {
    if (CALIBRATION_TOUCH_TYPES.has(e.type) && e.occurredAt > latest) latest = e.occurredAt;
  }
  return latest;
}

export async function getWeeklyDigest(windowDays = 7): Promise<WeeklyDigest> {
  const instance = await db();
  const asOf = todayIso();
  const windowStart = addDays(asOf, -windowDays);

  const allAssets = await listAssets(instance);
  const eventsByAsset = await getEventsForAssets(instance, allAssets.map((a) => a.id));
  const assetById = new Map(allAssets.map((a) => [a.id, a]));

  const newAssets: WeeklyDigest["newAssets"] = [];
  const depletedConsumables: WeeklyDigest["depletedConsumables"] = [];
  let calibrationTouchCount = 0;

  for (const asset of allAssets) {
    const events = eventsByAsset.get(asset.id) ?? [];
    for (const event of events) {
      if (event.occurredAt < windowStart || event.occurredAt > asOf) continue;
      if (event.type === "acquired") {
        newAssets.push({
          id: asset.id,
          name: asset.name,
          kind: asset.kind,
          category: asset.category,
          priceCents: asset.priceCents,
          occurredAt: event.occurredAt,
        });
      } else if (event.type === "depleted") {
        const metrics = computeAssetMetrics(asset, events, event.occurredAt);
        if (metrics.kind === "consumable" && metrics.consumable.status === "completed") {
          depletedConsumables.push({
            id: asset.id,
            name: asset.name,
            category: asset.category,
            occurredAt: event.occurredAt,
            cycleDays: metrics.consumable.cycleDays.value.min,
            dailyCostCents: mid(metrics.consumable.dailyCostCents.value),
          });
        }
      } else if (CALIBRATION_TOUCH_TYPES.has(event.type) && event.type !== "acquired") {
        calibrationTouchCount += 1;
      }
    }
  }
  newAssets.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  depletedConsumables.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));

  const activeAssets = allAssets.filter((a) => a.status === "active");
  const durableAssets = activeAssets.filter((a) => a.kind === "durable");
  const consumableAssets = activeAssets.filter((a) => a.kind === "consumable");

  const durableComputed = durableAssets.map((asset) => {
    const metrics = computeAssetMetrics(asset, eventsByAsset.get(asset.id) ?? [], asOf);
    return { asset, metrics: metrics.kind === "durable" ? metrics.durable : null };
  });
  const consumableComputed = consumableAssets.map((asset) => {
    const metrics = computeAssetMetrics(asset, eventsByAsset.get(asset.id) ?? [], asOf);
    return { asset, metrics: metrics.kind === "consumable" ? metrics.consumable : null };
  });

  const dailyCostItems = [
    ...durableComputed
      .filter((d) => d.metrics?.primaryCostMetric === "daily")
      .map((d) => ({ id: d.asset.id, name: d.asset.name, category: d.asset.category, dailyCostCents: d.metrics!.realizedDailyCostCents.value })),
    ...consumableComputed
      .filter((c) => c.metrics?.primaryCostMetric === "daily")
      .map((c) => ({ id: c.asset.id, name: c.asset.name, category: c.asset.category, dailyCostCents: c.metrics!.dailyCostCents.value })),
  ];
  const perUseCostItems = [
    ...durableComputed
      .filter((d) => d.metrics?.primaryCostMetric === "per_use")
      .map((d) => ({ id: d.asset.id, name: d.asset.name, category: d.asset.category, perUseCostCents: d.metrics!.perUseCostCents.value })),
    ...consumableComputed
      .filter((c) => c.metrics?.primaryCostMetric === "per_use")
      .map((c) => ({ id: c.asset.id, name: c.asset.name, category: c.asset.category, perUseCostCents: c.metrics!.perUseCostCents.value })),
  ];

  const durableDailyCostCents = sumRanges(durableComputed.map((d) => d.metrics?.realizedDailyCostCents.value ?? { min: 0, max: 0 }));
  const consumableDailyCostCents = sumRanges(consumableComputed.map((c) => c.metrics?.dailyCostCents.value ?? { min: 0, max: 0 }));

  const calibrationReminders = activeAssets
    .map((asset) => {
      const events = eventsByAsset.get(asset.id) ?? [];
      const lastTouch = lastCalibrationTouch(events) || asset.createdAt.slice(0, 10);
      return { asset, daysSinceCalibration: daysBetween(lastTouch, asOf) };
    })
    .filter((x) => x.daysSinceCalibration >= CALIBRATION_REMINDER_THRESHOLD_DAYS)
    .sort((a, b) => b.daysSinceCalibration - a.daysSinceCalibration)
    .slice(0, 3)
    .map((x) => ({
      id: x.asset.id,
      name: x.asset.name,
      category: x.asset.category,
      daysSinceCalibration: x.daysSinceCalibration,
    }));

  return {
    windowStart,
    windowEnd: asOf,
    newAssets,
    depletedConsumables,
    calibrationTouchCount,
    todayCostCents: sumRanges([durableDailyCostCents, consumableDailyCostCents]),
    cheapestDaily: [...dailyCostItems].sort((a, b) => mid(a.dailyCostCents) - mid(b.dailyCostCents)).slice(0, 3),
    costliestDaily: [...dailyCostItems].sort((a, b) => mid(b.dailyCostCents) - mid(a.dailyCostCents)).slice(0, 3),
    cheapestPerUse: [...perUseCostItems].sort((a, b) => mid(a.perUseCostCents) - mid(b.perUseCostCents)).slice(0, 3),
    costliestPerUse: [...perUseCostItems].sort((a, b) => mid(b.perUseCostCents) - mid(a.perUseCostCents)).slice(0, 3),
    calibrationReminders,
  };
}

