import { describe, expect, it } from "vitest";
import { computeConsumable } from "../src/consumable.js";
import type { AcquiredConsumablePayload, AssetEvent } from "../src/types.js";

function acquiredEvent(payload: AcquiredConsumablePayload, occurredAt: string): AssetEvent {
  return {
    id: "evt_acquired",
    assetId: "asset_1",
    type: "acquired",
    occurredAt,
    payload,
    createdAt: occurredAt,
  };
}

describe("computeConsumable", () => {
  it("已用完：消耗周期与每日成本为实测精确值（无需区间）", () => {
    const events: AssetEvent[] = [
      acquiredEvent(
        { kind: "consumable", category: "消耗品", subcategory: "洗护", priceCents: 10000, startDate: "2026-01-01" },
        "2026-01-01",
      ),
      {
        id: "evt_depleted",
        assetId: "asset_1",
        type: "depleted",
        occurredAt: "2026-03-01",
        payload: {},
        createdAt: "2026-03-01",
      },
    ];

    const metrics = computeConsumable(events, "2026-03-15");
    expect(metrics.status).toBe("completed");
    expect(metrics.cycleDays.value).toEqual({ min: 59, max: 59 });
    expect(metrics.dailyCostCents.value.min).toBeCloseTo(10000 / 59, 3);
    expect(metrics.dailyCostCents.value.max).toBeCloseTo(10000 / 59, 3);
    expect(metrics.dailyCostCents.assumptions[0]?.source).toBe("measured");
  });

  it("未用完：按类目默认周期给出区间预估，并标注为 category_default", () => {
    const events: AssetEvent[] = [
      acquiredEvent(
        { kind: "consumable", category: "消耗品", subcategory: "洗护", priceCents: 6000, startDate: "2026-01-01" },
        "2026-01-01",
      ),
    ];

    const metrics = computeConsumable(events, "2026-01-15");
    expect(metrics.status).toBe("in_progress");
    expect(metrics.dailyCostCents.value.min).toBeCloseTo(6000 / 90, 3);
    expect(metrics.dailyCostCents.value.max).toBeCloseTo(6000 / 45, 3);
    expect(metrics.dailyCostCents.assumptions[0]?.source).toBe("category_default");
    expect(metrics.predictedDepletionDate?.min).toBe("2026-02-15");
    expect(metrics.predictedDepletionDate?.max).toBe("2026-04-01");
  });

  it("彩妆类默认按次计成本，且按预估使用频率折算单次成本", () => {
    const events: AssetEvent[] = [
      acquiredEvent(
        { kind: "consumable", category: "消耗品", subcategory: "彩妆", priceCents: 6000, startDate: "2026-01-01" },
        "2026-01-01",
      ),
    ];

    const metrics = computeConsumable(events, "2026-01-15");
    expect(metrics.primaryCostMetric).toBe("per_use");
    expect(metrics.perUseCostCents.value.min).toBeGreaterThan(0);
    expect(metrics.perUseCostCents.value.max).toBeGreaterThanOrEqual(metrics.perUseCostCents.value.min);
    expect(metrics.estimatedUsageCount.value.max).toBeGreaterThan(0);
  });

  it("会员服务/订阅类默认按天计成本", () => {
    const events: AssetEvent[] = [
      acquiredEvent(
        { kind: "consumable", category: "消耗品", subcategory: "会员服务", priceCents: 8800, startDate: "2026-01-01" },
        "2026-01-01",
      ),
    ];

    const metrics = computeConsumable(events, "2026-01-15");
    expect(metrics.primaryCostMetric).toBe("daily");
  });

  it("usage_calibrated 事件（校准使用次数）覆盖使用频率，来源标记为 measured", () => {
    const events: AssetEvent[] = [
      acquiredEvent(
        { kind: "consumable", category: "消耗品", subcategory: "彩妆", priceCents: 6000, startDate: "2026-01-01" },
        "2026-01-01",
      ),
      {
        id: "evt_usage_calibrated",
        assetId: "asset_1",
        type: "usage_calibrated",
        occurredAt: "2026-01-20",
        payload: { periodDays: 14, count: 5 },
        createdAt: "2026-01-20",
      },
    ];

    const metrics = computeConsumable(events, "2026-02-01");
    const freqAssumption = metrics.perUseCostCents.assumptions.find((a) => a.key === "usageFrequency");
    expect(freqAssumption?.source).toBe("measured");
    expect(freqAssumption?.value).toEqual({ type: "custom", perMonth: 10.7 });
  });

  it("用户显式指定使用频率时，来源标记为 user 并覆盖类目默认", () => {
    const events: AssetEvent[] = [
      acquiredEvent(
        {
          kind: "consumable",
          category: "消耗品",
          subcategory: "彩妆",
          priceCents: 6000,
          startDate: "2026-01-01",
          usageFrequency: { type: "tier", tier: "daily_once" },
        },
        "2026-01-01",
      ),
    ];

    const metrics = computeConsumable(events, "2026-01-15");
    expect(metrics.perUseCostCents.assumptions.find((a) => a.key === "usageFrequency")?.source).toBe("user");
  });
});
