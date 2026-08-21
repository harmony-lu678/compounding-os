import { describe, expect, it } from "vitest";
import {
  analyzeUsageGap,
  calendarSeason,
  inferSeasonality,
  inCalendarWindow,
} from "../src/season.js";

describe("inferSeasonality", () => {
  it("羽绒服是冬季，凉鞋是夏季，相机是场景", () => {
    expect(inferSeasonality("长款羽绒服", "衣物")).toBe("winter");
    expect(inferSeasonality("凉鞋", "衣物")).toBe("summer");
    expect(inferSeasonality("Sony 相机", "电子产品")).toBe("scene");
    expect(inferSeasonality("MacBook", "电子产品")).toBe("year");
    expect(inferSeasonality("大豆被", "床品")).toBe("winter");
    expect(inferSeasonality("空调被", "床品")).toBe("summer");
  });
});

describe("expected window", () => {
  it("8 月羽绒服休眠，11 月进入窗口", () => {
    expect(inCalendarWindow("winter", "2026-08-21")).toBe(false);
    expect(inCalendarWindow("winter", "2026-11-10")).toBe(true);
    expect(inCalendarWindow("summer", "2026-08-21")).toBe(true);
    expect(calendarSeason("2026-08-21")).toBe("summer");
  });
});

describe("analyzeUsageGap", () => {
  it("冬天没到，羽绒服不算闲置", () => {
    const gap = analyzeUsageGap({
      seasonality: "winter",
      asOf: "2026-08-21",
      usageDates: ["2025-11-12", "2025-12-01", "2026-01-08"],
    });
    expect(gap.life).toBe("dormant");
    expect(gap.gapLevel).toBe("none");
  });

  it("入冬后去年同期有使用、今年为 0，记为高度闲置", () => {
    const gap = analyzeUsageGap({
      seasonality: "winter",
      asOf: "2026-11-20",
      usageDates: ["2025-11-03", "2025-11-10", "2025-11-18"],
    });
    expect(gap.inWindow).toBe(true);
    expect(gap.usesLastYearSameMonth).toBe(3);
    expect(gap.usesThisWindow).toBe(0);
    expect(gap.gapLevel).toBe("idle");
  });

  it("场景资产：去年同月用过、今年没有，才值得关注", () => {
    const camera = analyzeUsageGap({
      seasonality: "scene",
      asOf: "2026-08-21",
      usageDates: ["2025-08-02", "2025-08-11", "2025-08-19", "2025-08-28"],
    });
    expect(camera.inWindow).toBe(true);
    expect(camera.gapLevel).toBe("idle");

    const quiet = analyzeUsageGap({
      seasonality: "scene",
      asOf: "2026-08-21",
      usageDates: ["2024-03-01"],
    });
    expect(quiet.gapLevel).toBe("none");
  });
});
