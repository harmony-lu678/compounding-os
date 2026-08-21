export const SEASONALITIES = ["year", "spring_autumn", "summer", "winter", "scene"] as const;
export type Seasonality = (typeof SEASONALITIES)[number];

export const SEASONALITY_LABEL: Record<Seasonality, string> = {
  year: "全年",
  spring_autumn: "春秋",
  summer: "夏季",
  winter: "冬季",
  scene: "特定场景",
};

export type CalendarSeason = "spring" | "summer" | "autumn" | "winter";

export const CALENDAR_SEASON_LABEL: Record<CalendarSeason, string> = {
  spring: "春季",
  summer: "夏季",
  autumn: "秋季",
  winter: "冬季",
};

export type UsageLife = "active" | "dormant" | "low" | "idle";
export type GapLevel = "none" | "watch" | "idle";

export function monthOf(iso: string): number {
  return Number(iso.slice(5, 7));
}

export function yearOf(iso: string): number {
  return Number(iso.slice(0, 4));
}

export function calendarSeason(iso: string): CalendarSeason {
  const month = monthOf(iso);
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

export function expectedMonths(seasonality: Seasonality): number[] {
  if (seasonality === "summer") return [5, 6, 7, 8, 9];
  if (seasonality === "winter") return [11, 12, 1, 2];
  if (seasonality === "spring_autumn") return [3, 4, 5, 9, 10, 11];
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
}

export function inCalendarWindow(seasonality: Seasonality, iso: string): boolean {
  if (seasonality === "year") return true;
  if (seasonality === "scene") return false;
  return expectedMonths(seasonality).includes(monthOf(iso));
}

export function inferSeasonality(name: string, category: string): Seasonality {
  if (/羽绒|雪地|围巾|手套|棉服|暖|冬靴|大衣|毛衣|大豆被|豆被|冬被|棉被|厚被|电热毯/.test(name)) return "winter";
  if (/凉鞋|防晒|遮阳|泳|草帽|凉拖|短袖|夏被|空调被|凉被/.test(name)) return "summer";
  if (/风衣|薄外套|夹克|开衫/.test(name)) return "spring_autumn";
  if (/相机|单反|微单|行李|登山|冲浪|滑雪|帐篷|吉他|无人机|画架/.test(name)) return "scene";
  if (["电子产品", "家具", "床品"].includes(category)) return "year";
  return "year";
}

export function isSeasonality(value: unknown): value is Seasonality {
  return SEASONALITIES.includes(value as Seasonality);
}

export function countUsesInMonth(dates: string[], year: number, month: number): number {
  return dates.filter((d) => yearOf(d) === year && monthOf(d) === month).length;
}

export function windowStart(seasonality: Seasonality, asOf: string): string {
  const year = yearOf(asOf);
  const month = monthOf(asOf);
  if (seasonality === "winter") {
    const startYear = month <= 2 ? year - 1 : year;
    return `${startYear}-11-01`;
  }
  if (seasonality === "summer") return `${year}-05-01`;
  if (seasonality === "spring_autumn") {
    return month >= 9 ? `${year}-09-01` : `${year}-03-01`;
  }
  const mm = String(month).padStart(2, "0");
  return `${year}-${mm}-01`;
}

export function isSeasonTransition(asOf: string): boolean {
  const month = monthOf(asOf);
  const day = Number(asOf.slice(8, 10));
  return [3, 6, 9, 12, 5, 11].includes(month) && day <= 14;
}

export interface UsageGap {
  inWindow: boolean;
  life: UsageLife;
  gapLevel: GapLevel;
  score: number;
  usesThisWindow: number;
  usesLastYearSameMonth: number;
  lastUsedAt: string | null;
}

/**
 * 只对「此刻理论上该用、但实际明显落后」计分。
 * 休眠（羽绒服在 8 月）不是闲置。
 */
export function analyzeUsageGap(input: {
  seasonality: Seasonality;
  asOf: string;
  usageDates: string[];
}): UsageGap {
  const dates = input.usageDates.filter((d) => d <= input.asOf).sort();
  const lastUsedAt = dates[dates.length - 1] ?? null;
  const lastYear = yearOf(input.asOf) - 1;
  const month = monthOf(input.asOf);
  const usesLastYearSameMonth = countUsesInMonth(dates, lastYear, month);
  const start = windowStart(input.seasonality, input.asOf);
  const usesThisWindow = dates.filter((d) => d >= start && d <= input.asOf).length;

  const personalWindow = input.seasonality === "scene" && usesLastYearSameMonth > 0;
  const inWindow = inCalendarWindow(input.seasonality, input.asOf) || personalWindow;

  if (!inWindow && (input.seasonality === "winter" || input.seasonality === "summer" || input.seasonality === "spring_autumn")) {
    return {
      inWindow: false,
      life: "dormant",
      gapLevel: "none",
      score: 0,
      usesThisWindow,
      usesLastYearSameMonth,
      lastUsedAt,
    };
  }

  if (!inWindow) {
    return {
      inWindow: false,
      life: usesThisWindow > 0 ? "active" : "low",
      gapLevel: "none",
      score: 0,
      usesThisWindow,
      usesLastYearSameMonth,
      lastUsedAt,
    };
  }

  const expected = Math.max(usesLastYearSameMonth, 0);
  const lag = expected - usesThisWindow;
  const score = Math.max(0, expected) * (usesThisWindow === 0 ? 2 : 1) + (lag > 0 ? lag : 0);

  if (expected >= 2 && usesThisWindow === 0) {
    return { inWindow, life: "idle", gapLevel: "idle", score: score + 4, usesThisWindow, usesLastYearSameMonth, lastUsedAt };
  }
  if (expected >= 4 && usesThisWindow < expected * 0.35) {
    return { inWindow, life: "idle", gapLevel: "watch", score: score + 2, usesThisWindow, usesLastYearSameMonth, lastUsedAt };
  }
  if (expected >= 1 && usesThisWindow === 0) {
    return { inWindow, life: "low", gapLevel: "watch", score, usesThisWindow, usesLastYearSameMonth, lastUsedAt };
  }
  if (usesThisWindow > 0) {
    return { inWindow, life: "active", gapLevel: "none", score: 0, usesThisWindow, usesLastYearSameMonth, lastUsedAt };
  }
  return { inWindow, life: "low", gapLevel: "none", score: 0, usesThisWindow, usesLastYearSameMonth, lastUsedAt };
}
