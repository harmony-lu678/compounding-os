import { daysBetween } from "./date";
import { getDurableDefault, residualRange } from "./defaults";
import {
  freqLabel,
  freqRangePerMonth,
  point,
  usageFrequencyFromCount,
  type Assumption,
  type AssetEvent,
  type AssumptionChangedPayload,
  type AssumptionSource,
  type AcquiredDurablePayload,
  type DurableMetrics,
  type IsoDate,
  type MaintenanceAddedPayload,
  type MetricResult,
  type Range,
  type UsageCalibratedPayload,
  type UsageFrequency,
  type UsageRating,
  type ValuedPayload,
  type DisposedPayload,
} from "./types";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

interface DurableState {
  category: string;
  priceCents: number;
  purchaseDate: IsoDate;
  lifespanMonths: number;
  lifespanSource: AssumptionSource;
  residualRateMin: number;
  residualRateMax: number;
  residualSource: AssumptionSource;
  usageFrequency: UsageFrequency;
  frequencySource: AssumptionSource;
  activeMonthsPerYear: number;
  seasonSource: AssumptionSource;
  cumulativeMaintenanceCents: number;
  maintenanceNotes: string[];
  valuedOverride: { min: number; max: number; note?: string; occurredAt: IsoDate } | null;
  disposedAt: IsoDate | null;
  disposalValueCents: number | null;
}

function sortByOccurredAt<T extends { occurredAt: IsoDate; createdAt?: string }>(events: T[]): T[] {
  return [...events].sort((a, b) => {
    if (a.occurredAt !== b.occurredAt) return a.occurredAt < b.occurredAt ? -1 : 1;
    return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
  });
}

export function foldDurableState(events: AssetEvent[]): DurableState {
  const sorted = sortByOccurredAt(events);
  const acquired = sorted.find((e) => e.type === "acquired");
  if (!acquired) throw new Error("资产缺少 acquired 事件，无法计算");
  const payload = acquired.payload as AcquiredDurablePayload & {
    sources?: Record<string, AssumptionSource>;
  };

  const state: DurableState = {
    category: payload.category,
    priceCents: payload.priceCents,
    purchaseDate: acquired.occurredAt,
    lifespanMonths: payload.lifespanMonths,
    lifespanSource: payload.sources?.lifespanMonths ?? "user",
    residualRateMin: payload.residualRateMin,
    residualRateMax: payload.residualRateMax,
    residualSource: payload.sources?.residualRate ?? "user",
    usageFrequency: payload.usageFrequency,
    frequencySource: payload.sources?.usageFrequency ?? "user",
    activeMonthsPerYear: payload.activeMonthsPerYear ?? 12,
    seasonSource: payload.activeMonthsPerYear != null ? (payload.sources?.activeMonthsPerYear ?? "user") : "category_default",
    cumulativeMaintenanceCents: 0,
    maintenanceNotes: [],
    valuedOverride: null,
    disposedAt: null,
    disposalValueCents: null,
  };

  for (const event of sorted) {
    switch (event.type) {
      case "assumption_changed": {
        const p = event.payload as AssumptionChangedPayload;
        if (p.field === "lifespanMonths") {
          state.lifespanMonths = p.newValue as number;
          state.lifespanSource = "user";
        } else if (p.field === "residualRate") {
          const v = p.newValue as { min: number; max: number };
          state.residualRateMin = v.min;
          state.residualRateMax = v.max;
          state.residualSource = "user";
        } else if (p.field === "usageFrequency") {
          state.usageFrequency = p.newValue as UsageFrequency;
          state.frequencySource = "user";
        } else if (p.field === "activeMonthsPerYear") {
          state.activeMonthsPerYear = p.newValue as number;
          state.seasonSource = "user";
        }
        break;
      }
      case "usage_calibrated": {
        const p = event.payload as UsageCalibratedPayload;
        state.usageFrequency = usageFrequencyFromCount(p.periodDays, p.count);
        state.frequencySource = "measured";
        break;
      }
      case "maintenance_added": {
        const p = event.payload as MaintenanceAddedPayload;
        state.cumulativeMaintenanceCents += p.amountCents;
        if (p.note) state.maintenanceNotes.push(p.note);
        break;
      }
      case "valued": {
        const p = event.payload as ValuedPayload;
        state.valuedOverride = {
          min: p.valueMinCents,
          max: p.valueMaxCents,
          note: p.sourceNote,
          occurredAt: event.occurredAt,
        };
        break;
      }
      case "disposed": {
        const p = event.payload as DisposedPayload;
        state.disposedAt = event.occurredAt;
        state.disposalValueCents = p.disposalValueCents ?? 0;
        break;
      }
      default:
        break;
    }
  }

  return state;
}

function lifespanAssumption(state: DurableState): Assumption {
  const years = (state.lifespanMonths / 12).toFixed(1);
  return {
    key: "lifespanMonths",
    label: `预计寿命：${years} 年`,
    value: state.lifespanMonths,
    source: state.lifespanSource,
    editable: true,
  };
}

function residualAssumption(state: DurableState, finalResidual: Range): Assumption {
  return {
    key: "residualRate",
    label: `预计残值：¥${(finalResidual.min / 100).toFixed(0)} ~ ¥${(finalResidual.max / 100).toFixed(0)}`,
    value: { min: state.residualRateMin, max: state.residualRateMax },
    source: state.residualSource,
    editable: true,
  };
}

function frequencyAssumption(state: DurableState): Assumption {
  const range = freqRangePerMonth(state.usageFrequency);
  return {
    key: "usageFrequency",
    label: `使用频率：${freqLabel(state.usageFrequency)}（${round1(range.min)}~${round1(range.max)} 次/月）`,
    value: state.usageFrequency,
    source: state.frequencySource,
    editable: true,
  };
}

function seasonAssumption(state: DurableState): Assumption | null {
  if (state.activeMonthsPerYear >= 12) return null;
  return {
    key: "activeMonthsPerYear",
    label: `季节性：约每年 ${state.activeMonthsPerYear} 个月会用到（其余月份不计入使用次数估算，因地制宜自行调整）`,
    value: state.activeMonthsPerYear,
    source: state.seasonSource,
    editable: true,
  };
}

function valuationAssumption(state: DurableState): Assumption | null {
  if (!state.valuedOverride) return null;
  return {
    key: "valuation",
    label: `手动估值（${state.valuedOverride.occurredAt}${state.valuedOverride.note ? "：" + state.valuedOverride.note : ""}）`,
    value: { min: state.valuedOverride.min, max: state.valuedOverride.max },
    source: "user",
    editable: true,
  };
}

function maintenanceAssumption(state: DurableState): Assumption | null {
  if (state.cumulativeMaintenanceCents === 0) return null;
  return {
    key: "maintenance",
    label: `累计维护/耗材成本：¥${(state.cumulativeMaintenanceCents / 100).toFixed(0)}`,
    value: state.cumulativeMaintenanceCents,
    source: "measured",
    editable: false,
  };
}

export function computeDurable(events: AssetEvent[], asOf: IsoDate): DurableMetrics {
  const state = foldDurableState(events);
  const price = state.priceCents;
  const lifespanDays = state.lifespanMonths * 30;
  const endDate = state.disposedAt ?? asOf;
  const daysHeld = Math.max(daysBetween(state.purchaseDate, endDate), 1);

  const finalResidual: Range =
    state.disposedAt != null
      ? point(state.disposalValueCents ?? 0)
      : residualRange(price, {
          label: state.category,
          lifespanMonths: state.lifespanMonths,
          residualRateMin: state.residualRateMin,
          residualRateMax: state.residualRateMax,
          defaultFreqTier: "weekly_few",
          referenceFreqPerMonth: 0,
          costMetric: "per_use",
        });

  const fraction = Math.min(daysHeld, lifespanDays) / lifespanDays;

  let currentValue: Range;
  let currentValueAssumptions: Assumption[];
  if (state.disposedAt != null) {
    currentValue = point(state.disposalValueCents ?? 0);
    currentValueAssumptions = [
      { key: "disposal", label: "已处置，按实际处置价计入", value: state.disposalValueCents, source: "measured", editable: false },
    ];
  } else if (state.valuedOverride) {
    currentValue = { min: state.valuedOverride.min, max: state.valuedOverride.max };
    const va = valuationAssumption(state);
    currentValueAssumptions = va ? [va] : [];
  } else {
    currentValue = {
      min: price - (price - finalResidual.min) * fraction,
      max: price - (price - finalResidual.max) * fraction,
    };
    currentValueAssumptions = [lifespanAssumption(state), residualAssumption(state, finalResidual)];
  }

  const maintenanceA = maintenanceAssumption(state);

  const fullLifecycleCost: Range = {
    min: (price - finalResidual.max + state.cumulativeMaintenanceCents) / lifespanDays,
    max: (price - finalResidual.min + state.cumulativeMaintenanceCents) / lifespanDays,
  };
  const fullLifecycleAssumptions = [
    lifespanAssumption(state),
    residualAssumption(state, finalResidual),
    ...(maintenanceA ? [maintenanceA] : []),
  ];

  const realizedTotalCost: Range = {
    min: price - currentValue.max + state.cumulativeMaintenanceCents,
    max: price - currentValue.min + state.cumulativeMaintenanceCents,
  };
  const realizedDailyCost: Range = {
    min: realizedTotalCost.min / daysHeld,
    max: realizedTotalCost.max / daysHeld,
  };
  const realizedAssumptions = [...currentValueAssumptions, ...(maintenanceA ? [maintenanceA] : [])];

  // 季节性只影响「使用次数/单次成本」的估算窗口——折旧/持有成本仍按日历天数算，
  // 因为物理老化不会因为放在衣柜里没穿就停止。
  const seasonA = seasonAssumption(state);
  const effectiveDaysHeld = daysHeld * (state.activeMonthsPerYear / 12);

  const freqRange = freqRangePerMonth(state.usageFrequency);
  const rawCountMin = (freqRange.min * effectiveDaysHeld) / 30;
  const rawCountMax = (freqRange.max * effectiveDaysHeld) / 30;
  const estimatedUsageCount: Range = { min: rawCountMin, max: rawCountMax };
  const freqAssumptions = [frequencyAssumption(state), ...(seasonA ? [seasonA] : [])];

  const safeCountMin = Math.max(rawCountMin, 0.5);
  const safeCountMax = Math.max(rawCountMax, 0.5);
  const perUseCost: Range = {
    min: realizedTotalCost.min / safeCountMax,
    max: realizedTotalCost.max / safeCountMin,
  };
  const perUseAssumptions = [...freqAssumptions, ...realizedAssumptions];

  const def = getDurableDefault(state.category);
  const freqMid = (freqRange.min + freqRange.max) / 2;
  const ratio = def.referenceFreqPerMonth > 0 ? freqMid / def.referenceFreqPerMonth : 1;
  const usageRating: UsageRating = ratio >= 1.2 ? "high" : ratio <= 0.8 ? "low" : "medium";

  const dedupe = (list: Assumption[]): Assumption[] => {
    const seen = new Set<string>();
    return list.filter((a) => {
      if (seen.has(a.key)) return false;
      seen.add(a.key);
      return true;
    });
  };

  const metric = (value: Range, assumptions: Assumption[]): MetricResult => ({
    value,
    assumptions: dedupe(assumptions),
  });

  return {
    fullLifecycleDailyCostCents: metric(fullLifecycleCost, fullLifecycleAssumptions),
    realizedDailyCostCents: metric(realizedDailyCost, realizedAssumptions),
    estimatedUsageCount: metric(estimatedUsageCount, freqAssumptions),
    perUseCostCents: metric(perUseCost, perUseAssumptions),
    currentValueCents: metric(currentValue, currentValueAssumptions),
    daysHeld,
    usageRating,
    primaryCostMetric: def.costMetric,
  };
}
