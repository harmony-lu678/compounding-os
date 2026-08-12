import { z } from "zod";

/**
 * 所有金额字段单位为整数分（cents），避免浮点误差。
 * ISO 日期字符串格式：YYYY-MM-DD。
 */
export type Cents = number;
export type IsoDate = string;

export interface Range {
  min: number;
  max: number;
}

export function point(value: number): Range {
  return { min: value, max: value };
}

export function isPoint(range: Range): boolean {
  return range.min === range.max;
}

export type AssumptionSource = "user" | "category_default" | "measured";

export interface Assumption {
  key: string;
  label: string;
  value: unknown;
  source: AssumptionSource;
  editable: boolean;
}

/**
 * 引擎公开的所有推算结果都必须携带假设清单——
 * 产品原则 3（区间化 + 假设可见）的类型层落实。
 */
export interface MetricResult<T = Range> {
  value: T;
  assumptions: Assumption[];
}

export type AssetKind = "durable" | "consumable";
export type AssetStatus = "active" | "disposed" | "archived";

export const FREQ_TIERS = {
  daily_multiple: { label: "每天多次", min: 60, max: 120 },
  daily_once: { label: "每天一次", min: 25, max: 31 },
  weekly_few: { label: "每周几次", min: 8, max: 16 },
  weekly_once: { label: "每周一次", min: 3, max: 5 },
  monthly_few: { label: "每月几次", min: 1, max: 3 },
  rare: { label: "极少", min: 0, max: 1 },
} as const;

export type FreqTier = keyof typeof FREQ_TIERS;

export const freqTierSchema = z.enum([
  "daily_multiple",
  "daily_once",
  "weekly_few",
  "weekly_once",
  "monthly_few",
  "rare",
]);

/** 使用频率：可以是内置档位，也可以是用户自定义的每月次数（自动生成 ±30% 区间）。 */
export const usageFrequencySchema = z.union([
  z.object({ type: z.literal("tier"), tier: freqTierSchema }),
  z.object({ type: z.literal("custom"), perMonth: z.number().positive() }),
]);
export type UsageFrequency = z.infer<typeof usageFrequencySchema>;

export function freqRangePerMonth(freq: UsageFrequency): Range {
  if (freq.type === "tier") {
    const tier = FREQ_TIERS[freq.tier];
    return { min: tier.min, max: tier.max };
  }
  return { min: freq.perMonth * 0.7, max: freq.perMonth * 1.3 };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function freqLabel(freq: UsageFrequency): string {
  if (freq.type === "tier") return FREQ_TIERS[freq.tier].label;
  return `实测：每月约 ${round1(freq.perMonth)} 次`;
}

/** 根据「最近 N 天用了 M 次」折算成每月使用频率——用于「校准使用次数」这个快速录入入口。 */
export function usageFrequencyFromCount(periodDays: number, count: number): UsageFrequency {
  const perMonth = Math.max((count / Math.max(periodDays, 1)) * 30, 0.1);
  return { type: "custom", perMonth: round1(perMonth) };
}

// ---------------------------------------------------------------------------
// Event payload schemas — 唯一事实源。core 与 API 共用同一份 schema。
// ---------------------------------------------------------------------------

const assumptionSourceSchema = z.enum(["user", "category_default", "measured"]);

export const acquiredDurablePayloadSchema = z.object({
  kind: z.literal("durable"),
  category: z.string(),
  priceCents: z.number().int().nonnegative(),
  lifespanMonths: z.number().positive(),
  residualRateMin: z.number().min(0).max(1),
  residualRateMax: z.number().min(0).max(1),
  usageFrequency: usageFrequencySchema,
  /**
   * 季节性——一年里大概有几个月会实际用到（1~12，默认 12 = 全年皆可用）。
   * 主要用于衣物/床品这类有明显季节性的品类：因地制宜，具体月数由用户自己判断
   * （比如南方的"冬季"可能比北方短），而不是系统硬编码一个全国统一的季节长度。
   * 只影响「估算使用次数/单次成本」——不影响按日历天数计算的折旧和持有成本。
   */
  activeMonthsPerYear: z.number().min(1).max(12).optional(),
  /** 标记每个字段是用户填写、类目默认值、还是实测——假设面板据此显示来源 */
  sources: z.record(assumptionSourceSchema).optional(),
});

export const acquiredConsumablePayloadSchema = z.object({
  kind: z.literal("consumable"),
  category: z.string(),
  priceCents: z.number().int().nonnegative(),
  subcategory: z.string().optional(),
  capacity: z.string().optional(),
  startDate: z.string().optional(),
  /** 预估每次使用的频率——不填则按子类目默认值折算单次成本 */
  usageFrequency: usageFrequencySchema.optional(),
});

export const acquiredPayloadSchema = z.discriminatedUnion("kind", [
  acquiredDurablePayloadSchema,
  acquiredConsumablePayloadSchema,
]);

export const assumptionChangedPayloadSchema = z.object({
  field: z.string(),
  oldValue: z.unknown().optional(),
  newValue: z.unknown(),
  note: z.string().optional(),
});

export const usageCalibratedPayloadSchema = z.object({
  periodDays: z.number().positive(),
  count: z.number().nonnegative(),
});

export const usageLoggedPayloadSchema = z.object({
  note: z.string().optional(),
});

export const maintenanceAddedPayloadSchema = z.object({
  amountCents: z.number().int().nonnegative(),
  note: z.string().optional(),
});

export const valuedPayloadSchema = z.object({
  valueMinCents: z.number().int().nonnegative(),
  valueMaxCents: z.number().int().nonnegative(),
  sourceNote: z.string().optional(),
});

export const depletedPayloadSchema = z.object({
  note: z.string().optional(),
});

export const disposedPayloadSchema = z.object({
  method: z.enum(["sold", "discarded", "given_away"]),
  disposalValueCents: z.number().int().nonnegative().optional(),
});

export const eventTypeSchema = z.enum([
  "acquired",
  "assumption_changed",
  "usage_calibrated",
  "usage_logged",
  "maintenance_added",
  "valued",
  "depleted",
  "disposed",
]);
export type EventType = z.infer<typeof eventTypeSchema>;

export const eventPayloadByType = {
  acquired: acquiredPayloadSchema,
  assumption_changed: assumptionChangedPayloadSchema,
  usage_calibrated: usageCalibratedPayloadSchema,
  usage_logged: usageLoggedPayloadSchema,
  maintenance_added: maintenanceAddedPayloadSchema,
  valued: valuedPayloadSchema,
  depleted: depletedPayloadSchema,
  disposed: disposedPayloadSchema,
} as const;

export interface AssetEvent<
  T extends EventType = EventType,
  P = unknown,
> {
  id: string;
  assetId: string;
  type: T;
  occurredAt: IsoDate;
  payload: P;
  createdAt: string;
}

export type AcquiredDurablePayload = z.infer<typeof acquiredDurablePayloadSchema>;
export type AcquiredConsumablePayload = z.infer<typeof acquiredConsumablePayloadSchema>;
export type AssumptionChangedPayload = z.infer<typeof assumptionChangedPayloadSchema>;
export type UsageCalibratedPayload = z.infer<typeof usageCalibratedPayloadSchema>;
export type MaintenanceAddedPayload = z.infer<typeof maintenanceAddedPayloadSchema>;
export type ValuedPayload = z.infer<typeof valuedPayloadSchema>;
export type DisposedPayload = z.infer<typeof disposedPayloadSchema>;

// ---------------------------------------------------------------------------
// 引擎输出
// ---------------------------------------------------------------------------

export type UsageRating = "high" | "medium" | "low" | "unknown";

export interface DurableMetrics {
  fullLifecycleDailyCostCents: MetricResult;
  realizedDailyCostCents: MetricResult;
  estimatedUsageCount: MetricResult;
  perUseCostCents: MetricResult;
  currentValueCents: MetricResult;
  daysHeld: number;
  usageRating: UsageRating;
  /** 该类目的主计费方式：daily（电子产品/家具等持续使用品）或 per_use（衣物/箱包等按次使用品） */
  primaryCostMetric: "daily" | "per_use";
}

export interface ConsumableMetrics {
  status: "in_progress" | "completed";
  cycleDays: MetricResult;
  dailyCostCents: MetricResult;
  estimatedUsageCount: MetricResult;
  perUseCostCents: MetricResult;
  predictedDepletionDate?: { min: IsoDate; max: IsoDate };
  daysSinceStart: number;
  /** 该子类目的主计费方式：per_use（洗护/护肤/彩妆/食品等按次使用品）或 daily（会员/订阅等持续计费服务） */
  primaryCostMetric: "daily" | "per_use";
}
