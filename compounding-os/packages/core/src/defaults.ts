import type { FreqTier, Range } from "./types";

/**
 * 类目默认值——用户不填就用这里的值，来源标记为 category_default。
 * 全部可在 Settings 覆盖，覆盖后来源变为 user。
 *
 * 这些数字是产品原则 1（估算优先于记录）的直接体现：宁可先给一个合理的
 * 默认区间让用户立刻看到结果，也不逼用户在录入时填一堆精确参数。
 */
/** 该类目的「主计费方式」——决定成本以哪个口径呈现为主指标。 */
export type CostMetric = "daily" | "per_use";

export interface DurableCategoryDefault {
  label: string;
  lifespanMonths: number;
  residualRateMin: number;
  residualRateMax: number;
  defaultFreqTier: FreqTier;
  /** 用于「使用率评级」基准：该类目典型的每月使用次数中值 */
  referenceFreqPerMonth: number;
  /**
   * daily：长期持续在使用的物品（电子产品、家具），按「日均成本」计价更直观；
   * per_use：一次一次穿/用的物品（衣物、箱包、饰品……），按「单次成本」计价更直观。
   */
  costMetric: CostMetric;
}

export const DURABLE_CATEGORY_DEFAULTS: Record<string, DurableCategoryDefault> = {
  电子产品: {
    label: "电子产品",
    lifespanMonths: 36,
    residualRateMin: 0.05,
    residualRateMax: 0.15,
    defaultFreqTier: "daily_once",
    referenceFreqPerMonth: 28,
    costMetric: "daily",
  },
  家具: {
    label: "家具",
    lifespanMonths: 96,
    residualRateMin: 0.05,
    residualRateMax: 0.15,
    defaultFreqTier: "daily_once",
    referenceFreqPerMonth: 28,
    costMetric: "daily",
  },
  电器: {
    label: "电器",
    lifespanMonths: 60,
    residualRateMin: 0.05,
    residualRateMax: 0.15,
    defaultFreqTier: "weekly_few",
    referenceFreqPerMonth: 12,
    costMetric: "per_use",
  },
  衣物: {
    label: "衣物",
    lifespanMonths: 24,
    residualRateMin: 0.02,
    residualRateMax: 0.08,
    defaultFreqTier: "weekly_few",
    referenceFreqPerMonth: 12,
    costMetric: "per_use",
  },
  箱包: {
    label: "箱包",
    lifespanMonths: 48,
    residualRateMin: 0.05,
    residualRateMax: 0.15,
    defaultFreqTier: "weekly_once",
    referenceFreqPerMonth: 4,
    costMetric: "per_use",
  },
  日用品: {
    label: "日用品",
    lifespanMonths: 24,
    residualRateMin: 0,
    residualRateMax: 0.05,
    defaultFreqTier: "weekly_few",
    referenceFreqPerMonth: 12,
    costMetric: "per_use",
  },
  饰品: {
    label: "饰品",
    lifespanMonths: 60,
    residualRateMin: 0.05,
    residualRateMax: 0.2,
    defaultFreqTier: "weekly_once",
    referenceFreqPerMonth: 4,
    costMetric: "per_use",
  },
  床品: {
    label: "床品",
    lifespanMonths: 36,
    residualRateMin: 0,
    residualRateMax: 0.05,
    defaultFreqTier: "daily_once",
    referenceFreqPerMonth: 30,
    costMetric: "per_use",
  },
};

export const DURABLE_FALLBACK_DEFAULT: DurableCategoryDefault = {
  label: "其他",
  lifespanMonths: 36,
  residualRateMin: 0.02,
  residualRateMax: 0.1,
  defaultFreqTier: "weekly_few",
  referenceFreqPerMonth: 10,
  costMetric: "per_use",
};

export function resolveDurableDefaults(
  overrides?: Record<string, DurableCategoryDefault> | null,
): Record<string, DurableCategoryDefault> {
  return { ...DURABLE_CATEGORY_DEFAULTS, ...(overrides ?? {}) };
}

export function getDurableDefault(
  category: string,
  map?: Record<string, DurableCategoryDefault>,
): DurableCategoryDefault {
  return (map ?? DURABLE_CATEGORY_DEFAULTS)[category] ?? DURABLE_FALLBACK_DEFAULT;
}

/** 消耗品子类目的默认消耗周期（天）——首瓶未用完前的预估依据。 */
export interface ConsumableSubcategoryDefault {
  label: string;
  cycleDaysMin: number;
  cycleDaysMax: number;
  /** 预估「每次使用」的频率档位——用于折算单次成本 */
  defaultFreqTier: FreqTier;
  /**
   * per_use：一次一次用的消耗品（洗护/护肤/彩妆/食品……），按「单次成本」呈现更直观；
   * daily：持续按天计费、与使用次数无关的服务型消耗品（会员/订阅），按「日均成本」呈现更直观。
   */
  costMetric: CostMetric;
}

export const CONSUMABLE_SUBCATEGORY_DEFAULTS: Record<string, ConsumableSubcategoryDefault> = {
  洗护: {
    label: "洗护（洗发水/沐浴露等）",
    cycleDaysMin: 45,
    cycleDaysMax: 90,
    defaultFreqTier: "daily_once",
    costMetric: "per_use",
  },
  护肤: {
    label: "护肤品",
    cycleDaysMin: 60,
    cycleDaysMax: 120,
    defaultFreqTier: "daily_once",
    costMetric: "per_use",
  },
  彩妆: {
    label: "彩妆",
    cycleDaysMin: 90,
    cycleDaysMax: 200,
    defaultFreqTier: "weekly_few",
    costMetric: "per_use",
  },
  会员服务: {
    label: "会员服务/订阅",
    cycleDaysMin: 330,
    cycleDaysMax: 365,
    defaultFreqTier: "daily_once",
    costMetric: "daily",
  },
  食品: {
    label: "食品",
    cycleDaysMin: 15,
    cycleDaysMax: 45,
    defaultFreqTier: "daily_once",
    costMetric: "per_use",
  },
};

export const CONSUMABLE_FALLBACK_DEFAULT: ConsumableSubcategoryDefault = {
  label: "其他消耗品",
  cycleDaysMin: 60,
  cycleDaysMax: 120,
  defaultFreqTier: "weekly_few",
  costMetric: "per_use",
};

export function resolveConsumableDefaults(
  overrides?: Record<string, ConsumableSubcategoryDefault> | null,
): Record<string, ConsumableSubcategoryDefault> {
  return { ...CONSUMABLE_SUBCATEGORY_DEFAULTS, ...(overrides ?? {}) };
}

export function getConsumableDefault(
  subcategory?: string,
  map?: Record<string, ConsumableSubcategoryDefault>,
): ConsumableSubcategoryDefault {
  if (!subcategory) return CONSUMABLE_FALLBACK_DEFAULT;
  return (map ?? CONSUMABLE_SUBCATEGORY_DEFAULTS)[subcategory] ?? CONSUMABLE_FALLBACK_DEFAULT;
}

export function residualRange(priceCents: number, def: DurableCategoryDefault): Range {
  return {
    min: Math.round(priceCents * def.residualRateMin),
    max: Math.round(priceCents * def.residualRateMax),
  };
}
