import { describe, expect, it } from "vitest";
import { inferCaptureMode } from "../src/capture.js";

describe("inferCaptureMode", () => {
  it("消耗品一律自动估算", () => {
    expect(inferCaptureMode({ kind: "consumable", name: "洗发水", category: "消耗品" })).toBe("auto");
  });

  it("手机电脑水杯走自动估算", () => {
    expect(inferCaptureMode({ kind: "durable", name: "iPhone 16", category: "电子产品" })).toBe("auto");
    expect(inferCaptureMode({ kind: "durable", name: "MacBook Pro", category: "电子产品" })).toBe("auto");
    expect(inferCaptureMode({ kind: "durable", name: "水杯", category: "日用品" })).toBe("auto");
  });

  it("相机行李箱走快速记录", () => {
    expect(inferCaptureMode({ kind: "durable", name: "Sony 相机", category: "电子产品" })).toBe("quick");
    expect(inferCaptureMode({ kind: "durable", name: "登机行李箱", category: "箱包" })).toBe("quick");
  });

  it("跑鞋走批量校准", () => {
    expect(inferCaptureMode({ kind: "durable", name: "Nike 跑鞋", category: "衣物" })).toBe("batch");
  });

  it("极少使用的耐用品走快速记录", () => {
    expect(
      inferCaptureMode({
        kind: "durable",
        name: "投影仪支架",
        category: "其他",
        usageFrequency: { type: "tier", tier: "rare" },
      }),
    ).toBe("quick");
  });
});
