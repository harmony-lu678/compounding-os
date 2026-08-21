import type { SeasonToday } from "@/lib/season";

export const RITUAL_TITLE: Record<string, string> = {
  use: "使用了已有资产",
  learn: "给能力账户加了一次投入",
  save: "做了一次节省",
  create: "创造了一次产出",
  clean: "清理了资产",
};

export function ritualTimelineTitle(type: string, label?: string): string {
  if (type === "use") return label ? `使用 ${label}` : RITUAL_TITLE.use!;
  if (type === "learn") return label ? `学习 ${label}` : RITUAL_TITLE.learn!;
  if (type === "save") return label ? `节省 · ${label}` : RITUAL_TITLE.save!;
  if (type === "create") return label ? `创造 · ${label}` : RITUAL_TITLE.create!;
  if (type === "clean") return label ?? RITUAL_TITLE.clean!;
  return RITUAL_TITLE[type] ?? type;
}

export function timelineItemFromRecord(input: {
  type: RitualKey;
  event: { id: string; occurredAt: string; createdAt?: string; payload?: unknown };
  label: string;
}): TimelineItem {
  const payload = (input.event.payload ?? {}) as { assetId?: string; skillId?: string };
  return {
    id: input.event.id,
    date: input.event.occurredAt,
    title: ritualTimelineTitle(input.type, input.label),
    detail: input.label || "今日动作",
    href:
      typeof payload.assetId === "string"
        ? `/assets/${payload.assetId}`
        : typeof payload.skillId === "string"
          ? `/skills/${payload.skillId}`
          : undefined,
    createdAt: input.event.createdAt,
  };
}

export const RITUALS = [
  { key: "use", label: "使用", hint: "选一件具体资产" },
  { key: "learn", label: "学习", hint: "选或新建一项能力" },
  { key: "save", label: "节省", hint: "记下少买了什么" },
  { key: "create", label: "创造", hint: "记下做出了什么" },
  { key: "clean", label: "清理", hint: "用完 / 处置 / 整理" },
] as const;

export type RitualKey = (typeof RITUALS)[number]["key"];

export interface RitualOptionAsset {
  id: string;
  name: string;
  category: string;
  kind: "durable" | "consumable";
}

export interface RitualOptionSkill {
  id: string;
  name: string;
}

export interface RitualCount {
  key: RitualKey;
  count: number;
  lastLabel?: string;
}

export interface TodayInsight {
  title: string;
  body: string;
}

export interface RecentChange {
  sign: "+" | "-" | "";
  text: string;
}

export interface SpecialUseAsset {
  id: string;
  name: string;
  category: string;
  todayCount: number;
}

export interface CalibrationAsk {
  id: string;
  name: string;
  loggedCount30: number;
}

export interface WatchHint {
  id: string;
  name: string;
  daysSinceLastUse: number | null;
}

export interface CaptureToday {
  dailyAuto: { id: string; name: string }[];
  specials: SpecialUseAsset[];
  others: SpecialUseAsset[];
  todaySpecialCount: number;
  budget: number;
  calibration: CalibrationAsk | null;
  watchHint: WatchHint | null;
  watchPool: WatchHint[];
  calibPool: CalibrationAsk[];
}

export interface TimelineItem {
  id: string;
  date: string;
  title: string;
  detail: string;
  href?: string;
  createdAt?: string;
}

export interface TodayView {
  asOf: string;
  weekday: string;
  monthDay: string;
  releasedYuan: number;
  dailyCostYuan: number;
  yesterdayDailyCostYuan: number;
  assetUseCount: number;
  learnCount: number;
  noBuyStreakDays: number;
  comparison30: {
    usageRateNow: number;
    usageRateThen: number;
    dailyCostNow: number;
    dailyCostThen: number;
    acquiredCount: number;
    valueNow: number;
    valueThen: number;
  };
  insight: TodayInsight;
  recentChanges: RecentChange[];
  usageRateNow: number;
  usageDelta30: number;
  timeline: TimelineItem[];
  todayRituals: RitualCount[];
  ritualAssets: RitualOptionAsset[];
  ritualSkills: RitualOptionSkill[];
  capture: CaptureToday;
  season: SeasonToday;
  restock: {
    id: string;
    name: string;
    category: string;
    urgency: "overdue" | "soon";
    daysLeft: number;
    until: string;
    label: string;
  }[];
}
