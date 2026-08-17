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

export interface TimelineItem {
  id: string;
  date: string;
  title: string;
  detail: string;
  href?: string;
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
  timeline: TimelineItem[];
  todayRituals: RitualCount[];
  ritualAssets: RitualOptionAsset[];
  ritualSkills: RitualOptionSkill[];
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
