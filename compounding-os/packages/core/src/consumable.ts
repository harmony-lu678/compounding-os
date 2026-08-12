import { addDays, daysBetween } from "./date";
import { getConsumableDefault } from "./defaults";
import {
  freqLabel,
  freqRangePerMonth,
  usageFrequencyFromCount,
  type AcquiredConsumablePayload,
  type Assumption,
  type AssetEvent,
  type AssumptionChangedPayload,
  type AssumptionSource,
  type ConsumableMetrics,
  type IsoDate,
  type Range,
  type UsageCalibratedPayload,
  type UsageFrequency,
} from "./types";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

interface ConsumableState {
  category: string;
  subcategory?: string;
  priceCents: number;
  startDate: IsoDate;
  depletedAt: IsoDate | null;
  usageFrequency: UsageFrequency | null;
  frequencySource: AssumptionSource;
}

export function foldConsumableState(events: AssetEvent[]): ConsumableState {
  const acquired = events.find((e) => e.type === "acquired");
  if (!acquired) throw new Error("资产缺少 acquired 事件，无法计算");
  const payload = acquired.payload as AcquiredConsumablePayload;
  const depleted = events.find((e) => e.type === "depleted");

  const state: ConsumableState = {
    category: payload.category,
    subcategory: payload.subcategory,
    priceCents: payload.priceCents,
    startDate: payload.startDate ?? acquired.occurredAt,
    depletedAt: depleted?.occurredAt ?? null,
    usageFrequency: payload.usageFrequency ?? null,
    frequencySource: payload.usageFrequency ? "user" : "category_default",
  };

  for (const event of events) {
    if (event.type === "assumption_changed") {
      const p = event.payload as AssumptionChangedPayload;
      if (p.field === "usageFrequency") {
        state.usageFrequency = p.newValue as UsageFrequency;
        state.frequencySource = "user";
      }
    } else if (event.type === "usage_calibrated") {
      const p = event.payload as UsageCalibratedPayload;
      state.usageFrequency = usageFrequencyFromCount(p.periodDays, p.count);
      state.frequencySource = "measured";
    }
  }

  return state;
}

function frequencyAssumption(freq: UsageFrequency, source: AssumptionSource): Assumption {
  const range = freqRangePerMonth(freq);
  return {
    key: "usageFrequency",
    label: `预估使用频率：${freqLabel(freq)}（${round1(range.min)}~${round1(range.max)} 次/月）`,
    value: freq,
    source,
    editable: true,
  };
}

export function computeConsumable(events: AssetEvent[], asOf: IsoDate): ConsumableMetrics {
  const state = foldConsumableState(events);
  const daysSinceStart = Math.max(daysBetween(state.startDate, state.depletedAt ?? asOf), 1);
  const def = getConsumableDefault(state.subcategory);

  const usageFrequency: UsageFrequency = state.usageFrequency ?? { type: "tier", tier: def.defaultFreqTier };
  const freqRange = freqRangePerMonth(usageFrequency);
  const freqAssumption = frequencyAssumption(usageFrequency, state.frequencySource);

  if (state.depletedAt) {
    const cycleDays = Math.max(daysBetween(state.startDate, state.depletedAt), 1);
    const dailyCost = state.priceCents / cycleDays;
    const cycleAssumption: Assumption = {
      key: "measured_cycle",
      label: `实测消耗周期：${cycleDays} 天（${state.startDate} ~ ${state.depletedAt}）`,
      value: cycleDays,
      source: "measured",
      editable: false,
    };

    const usesRange: Range = { min: (freqRange.min * cycleDays) / 30, max: (freqRange.max * cycleDays) / 30 };
    const safeUsesMin = Math.max(usesRange.min, 0.5);
    const safeUsesMax = Math.max(usesRange.max, 0.5);
    const perUseCost: Range = { min: state.priceCents / safeUsesMax, max: state.priceCents / safeUsesMin };

    return {
      status: "completed",
      cycleDays: { value: { min: cycleDays, max: cycleDays }, assumptions: [cycleAssumption] },
      dailyCostCents: { value: { min: dailyCost, max: dailyCost }, assumptions: [cycleAssumption] },
      estimatedUsageCount: { value: usesRange, assumptions: [freqAssumption] },
      perUseCostCents: { value: perUseCost, assumptions: [freqAssumption, cycleAssumption] },
      daysSinceStart,
      primaryCostMetric: def.costMetric,
    };
  }

  const cycleRange: Range = { min: def.cycleDaysMin, max: def.cycleDaysMax };
  const cycleAssumption: Assumption = {
    key: "consumable_cycle_estimate",
    label: `预估消耗周期：${def.cycleDaysMin}~${def.cycleDaysMax} 天（${def.label} 类目默认，待用完后转为实测）`,
    value: cycleRange,
    source: "category_default",
    editable: true,
  };

  const dailyCostRange: Range = {
    min: state.priceCents / cycleRange.max,
    max: state.priceCents / cycleRange.min,
  };

  const usesRange: Range = {
    min: (freqRange.min * cycleRange.min) / 30,
    max: (freqRange.max * cycleRange.max) / 30,
  };
  const safeUsesMin = Math.max(usesRange.min, 0.5);
  const safeUsesMax = Math.max(usesRange.max, 0.5);
  const perUseCost: Range = { min: state.priceCents / safeUsesMax, max: state.priceCents / safeUsesMin };

  const predictedDepletionDate = {
    min: addDays(state.startDate, cycleRange.min),
    max: addDays(state.startDate, cycleRange.max),
  };

  return {
    status: "in_progress",
    cycleDays: { value: cycleRange, assumptions: [cycleAssumption] },
    dailyCostCents: { value: dailyCostRange, assumptions: [cycleAssumption] },
    estimatedUsageCount: { value: usesRange, assumptions: [freqAssumption, cycleAssumption] },
    perUseCostCents: { value: perUseCost, assumptions: [freqAssumption, cycleAssumption] },
    predictedDepletionDate,
    daysSinceStart,
    primaryCostMetric: def.costMetric,
  };
}
