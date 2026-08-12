import { describe, expect, it } from "vitest";
import { computeDurable } from "../src/durable.js";
import type { AssetEvent, AcquiredDurablePayload } from "../src/types.js";

function acquiredEvent(payload: AcquiredDurablePayload, occurredAt: string): AssetEvent {
  return {
    id: "evt_acquired",
    assetId: "asset_1",
    type: "acquired",
    occurredAt,
    payload,
    createdAt: occurredAt,
  };
}

describe("computeDurable", () => {
  it("按产品规划 §4.3 的公式计算耐用品各项指标（区间）", () => {
    const events: AssetEvent[] = [
      acquiredEvent(
        {
          kind: "durable",
          category: "电子产品",
          priceCents: 10000,
          lifespanMonths: 10, // 300 天
          residualRateMin: 0.1,
          residualRateMax: 0.2,
          usageFrequency: { type: "custom", perMonth: 30 },
        },
        "2026-01-01",
      ),
    ];

    const metrics = computeDurable(events, "2026-04-01"); // daysHeld = 90

    expect(metrics.daysHeld).toBe(90);

    // currentValue: fraction = 90/300 = 0.3
    expect(metrics.currentValueCents.value.min).toBeCloseTo(7300, 1);
    expect(metrics.currentValueCents.value.max).toBeCloseTo(7600, 1);

    // fullLifecycleDailyCost = (P - R + M) / lifespanDays
    expect(metrics.fullLifecycleDailyCostCents.value.min).toBeCloseTo(8000 / 300, 3);
    expect(metrics.fullLifecycleDailyCostCents.value.max).toBeCloseTo(9000 / 300, 3);

    // realizedDailyCost = (P - currentValue + M) / daysHeld
    expect(metrics.realizedDailyCostCents.value.min).toBeCloseTo(2400 / 90, 3);
    expect(metrics.realizedDailyCostCents.value.max).toBeCloseTo(2700 / 90, 3);

    // estimatedUsageCount: freq range [21,39] * (90/30)=3
    expect(metrics.estimatedUsageCount.value.min).toBeCloseTo(63, 3);
    expect(metrics.estimatedUsageCount.value.max).toBeCloseTo(117, 3);

    // perUseCost = realizedTotalCost / estimatedUsageCount（min 用 Cmin/countMax，max 用 Cmax/countMin）
    expect(metrics.perUseCostCents.value.min).toBeCloseTo(2400 / 117, 3);
    expect(metrics.perUseCostCents.value.max).toBeCloseTo(2700 / 63, 3);

    // 每个输出都必须携带非空的假设清单（产品原则 3）
    expect(metrics.currentValueCents.assumptions.length).toBeGreaterThan(0);
    expect(metrics.perUseCostCents.assumptions.some((a) => a.key === "usageFrequency")).toBe(true);
  });

  it("手动估值（valued 事件）会覆盖线性折旧推算，且来源标记为 user", () => {
    const events: AssetEvent[] = [
      acquiredEvent(
        {
          kind: "durable",
          category: "电子产品",
          priceCents: 700000,
          lifespanMonths: 36,
          residualRateMin: 0.1,
          residualRateMax: 0.2,
          usageFrequency: { type: "tier", tier: "daily_once" },
        },
        "2026-01-01",
      ),
      {
        id: "evt_valued",
        assetId: "asset_1",
        type: "valued",
        occurredAt: "2026-06-01",
        payload: { valueMinCents: 500000, valueMaxCents: 550000, sourceNote: "闲鱼同型号在售价" },
        createdAt: "2026-06-01",
      },
    ];

    const metrics = computeDurable(events, "2026-08-01");

    expect(metrics.currentValueCents.value).toEqual({ min: 500000, max: 550000 });
    expect(metrics.currentValueCents.assumptions[0]?.source).toBe("user");
  });

  it("assumption_changed 事件（假设面板修改）会覆盖初始档位，来源变为 user", () => {
    const events: AssetEvent[] = [
      acquiredEvent(
        {
          kind: "durable",
          category: "衣物",
          priceCents: 5000,
          lifespanMonths: 24,
          residualRateMin: 0.02,
          residualRateMax: 0.08,
          usageFrequency: { type: "tier", tier: "weekly_few" },
          sources: { usageFrequency: "category_default" },
        },
        "2026-01-01",
      ),
      {
        id: "evt_calibrate",
        assetId: "asset_1",
        type: "assumption_changed",
        occurredAt: "2026-03-01",
        payload: { field: "usageFrequency", newValue: { type: "tier", tier: "daily_once" } },
        createdAt: "2026-03-01",
      },
    ];

    const metrics = computeDurable(events, "2026-04-01");
    const freqAssumption = metrics.estimatedUsageCount.assumptions.find((a) => a.key === "usageFrequency");
    expect(freqAssumption?.source).toBe("user");
    expect(freqAssumption?.label).toContain("每天一次");
  });

  it("usage_calibrated 事件（校准使用次数）按「最近N天用了M次」折算成每月频率，来源标记为 measured", () => {
    const events: AssetEvent[] = [
      acquiredEvent(
        {
          kind: "durable",
          category: "衣物",
          priceCents: 5000,
          lifespanMonths: 24,
          residualRateMin: 0.02,
          residualRateMax: 0.08,
          usageFrequency: { type: "tier", tier: "weekly_few" },
          sources: { usageFrequency: "category_default" },
        },
        "2026-01-01",
      ),
      {
        id: "evt_usage_calibrated",
        assetId: "asset_1",
        type: "usage_calibrated",
        occurredAt: "2026-03-01",
        payload: { periodDays: 30, count: 18 },
        createdAt: "2026-03-01",
      },
    ];

    const metrics = computeDurable(events, "2026-04-01");
    const freqAssumption = metrics.estimatedUsageCount.assumptions.find((a) => a.key === "usageFrequency");
    expect(freqAssumption?.source).toBe("measured");
    expect(freqAssumption?.value).toEqual({ type: "custom", perMonth: 18 });
    expect(freqAssumption?.label).toContain("实测");
  });

  it("季节性（activeMonthsPerYear）只缩小估算使用次数/单次成本的窗口，不影响按日历天数算的折旧和持有成本", () => {
    const baseAcquired = {
      kind: "durable" as const,
      category: "衣物",
      priceCents: 60000,
      lifespanMonths: 24,
      residualRateMin: 0.02,
      residualRateMax: 0.08,
      usageFrequency: { type: "tier" as const, tier: "daily_once" as const },
    };

    const allYearEvents: AssetEvent[] = [acquiredEvent(baseAcquired, "2026-01-01")];
    const winterOnlyEvents: AssetEvent[] = [
      acquiredEvent({ ...baseAcquired, activeMonthsPerYear: 3 }, "2026-01-01"),
    ];

    const asOf = "2026-07-01"; // daysHeld = 181
    const allYear = computeDurable(allYearEvents, asOf);
    const winterOnly = computeDurable(winterOnlyEvents, asOf);

    // 折旧/持有成本按日历天数算，季节性不影响，两者应完全一致
    expect(winterOnly.currentValueCents.value).toEqual(allYear.currentValueCents.value);
    expect(winterOnly.realizedDailyCostCents.value).toEqual(allYear.realizedDailyCostCents.value);
    expect(winterOnly.daysHeld).toBe(allYear.daysHeld);

    // 冬季专属（3/12）的估算使用次数应约为全年版本的 1/4，单次成本相应更高
    expect(winterOnly.estimatedUsageCount.value.min).toBeCloseTo(allYear.estimatedUsageCount.value.min / 4, 3);
    expect(winterOnly.estimatedUsageCount.value.max).toBeCloseTo(allYear.estimatedUsageCount.value.max / 4, 3);
    expect(winterOnly.perUseCostCents.value.min).toBeGreaterThan(allYear.perUseCostCents.value.min);

    const seasonAssumption = winterOnly.estimatedUsageCount.assumptions.find(
      (a) => a.key === "activeMonthsPerYear",
    );
    expect(seasonAssumption?.source).toBe("user");
    expect(seasonAssumption?.value).toBe(3);

    // 全年可用（默认 12）不需要额外的季节性假设条目，避免噪音
    expect(allYear.estimatedUsageCount.assumptions.some((a) => a.key === "activeMonthsPerYear")).toBe(false);
  });

  it("已处置资产按实际处置价计入剩余价值，不再使用折旧推算", () => {
    const events: AssetEvent[] = [
      acquiredEvent(
        {
          kind: "durable",
          category: "电子产品",
          priceCents: 300000,
          lifespanMonths: 36,
          residualRateMin: 0.1,
          residualRateMax: 0.2,
          usageFrequency: { type: "tier", tier: "daily_once" },
        },
        "2025-01-01",
      ),
      {
        id: "evt_disposed",
        assetId: "asset_1",
        type: "disposed",
        occurredAt: "2026-01-01",
        payload: { method: "sold", disposalValueCents: 180000 },
        createdAt: "2026-01-01",
      },
    ];

    const metrics = computeDurable(events, "2026-06-01");
    expect(metrics.currentValueCents.value).toEqual({ min: 180000, max: 180000 });
    expect(metrics.daysHeld).toBe(365);
  });
});
