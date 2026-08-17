import type { ConsumableMetrics, DurableMetrics, Range } from "@compos/core";

export function yuan(cents: number): number {
  return cents / 100;
}

export function formatMoney(cents: number, digits = 2): string {
  return `¥${yuan(cents).toFixed(digits)}`;
}

export function formatMoneyRange(range: Range, digits = 2): string {
  if (Math.abs(range.max - range.min) < 0.5) return formatMoney(range.min, digits);
  return `¥${yuan(range.min).toFixed(digits)} ~ ¥${yuan(range.max).toFixed(digits)}`;
}

export function formatCountRange(range: Range, unit = "次"): string {
  const min = Math.round(range.min);
  const max = Math.round(range.max);
  if (min === max) return `${min}${unit}`;
  return `${min}~${max}${unit}`;
}

export function formatDateRange(range: { min: string; max: string }): string {
  if (range.min === range.max) return range.min;
  return `${range.min} ~ ${range.max}`;
}

export function categoryColor(_category: string): string {
  return "tag-brand-soft";
}

export function statusTagColor(): string {
  return "tag-neutral";
}

export const USAGE_RATING_LABEL: Record<string, string> = {
  high: "高频使用",
  medium: "中等使用",
  low: "低频使用",
  unknown: "待校准",
};

/**
 * 电子产品/家具这类持续使用的物品，按「日均成本」呈现更直观；
 * 衣物/箱包/饰品等按次使用的物品，按「单次成本」呈现更直观。
 * 具体归类见 packages/core/src/defaults.ts 的 costMetric。
 */
export function primaryDurableCost(durable: DurableMetrics): { range: Range; unit: string; label: string } {
  if (durable.primaryCostMetric === "daily") {
    return { range: durable.realizedDailyCostCents.value, unit: "/ 天", label: "日均成本" };
  }
  return { range: durable.perUseCostCents.value, unit: "/ 次", label: "单次成本" };
}

export function formatPrimaryDurableCost(durable: DurableMetrics): string {
  const { range, unit } = primaryDurableCost(durable);
  return `${formatMoneyRange(range)} ${unit}`;
}

/**
 * 洗护/护肤/彩妆/食品等消耗品按「单次成本」呈现更直观；
 * 会员服务/订阅这类持续计费、与使用次数无关的消耗品按「日均成本」呈现更直观。
 */
export function primaryConsumableCost(consumable: ConsumableMetrics): { range: Range; unit: string; label: string } {
  if (consumable.primaryCostMetric === "daily") {
    return { range: consumable.dailyCostCents.value, unit: "/ 天", label: "每日成本" };
  }
  return { range: consumable.perUseCostCents.value, unit: "/ 次", label: "单次成本" };
}

export function formatPrimaryConsumableCost(consumable: ConsumableMetrics): string {
  const { range, unit } = primaryConsumableCost(consumable);
  return `${formatMoneyRange(range)} ${unit}`;
}
