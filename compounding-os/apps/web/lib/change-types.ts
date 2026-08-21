export const CHART_RANGES = [
  { key: "7", days: 7, label: "7天", question: "最近发生了什么？", emphasis: "events" },
  { key: "30", days: 30, label: "30天", question: "最近一个月我有什么变化？", emphasis: "change" },
  { key: "90", days: 90, label: "90天", question: "我是不是在形成新的生活模式？", emphasis: "trend" },
] as const;

export type ChartRangeKey = (typeof CHART_RANGES)[number]["key"];

export const CHANGE_QUESTIONS = [
  { key: "better", label: "我的资产变好了吗？" },
  { key: "worth", label: "我的消费划算吗？" },
  { key: "used", label: "我的东西用起来了吗？" },
  { key: "waste", label: "哪些东西正在浪费？" },
  { key: "what", label: "我最近有什么变化？" },
] as const;

export type ChangeQuestionKey = (typeof CHANGE_QUESTIONS)[number]["key"];

export interface HealthPoint {
  date: string;
  valueYuan: number;
  dailyCostYuan: number;
  usageRate: number;
}

export interface WhyItem {
  id?: string;
  label: string;
  detail: string;
  deltaYuan: number;
}

export interface CostDecayRow {
  id: string;
  name: string;
  category: string;
  priceYuan: number;
  usesNow: number;
  perUseNowYuan: number;
  nextUses: number;
  perUseNextYuan: number;
  curve: { uses: number; perUseYuan: number }[];
}

export interface UtilBucket {
  key: "high" | "mid" | "low" | "idle";
  label: string;
  hint: string;
  count: number;
  valueYuan: number;
  assets: { id: string; name: string }[];
}

export interface MatrixAsset {
  id: string;
  name: string;
  dailyCostYuan: number;
  usageRate: number;
}

export interface MatrixQuad {
  key: "core" | "super" | "review" | "idle";
  title: string;
  hint: string;
  assets: MatrixAsset[];
}

export interface FunnelStep {
  key: string;
  label: string;
  yuan: number;
}

export interface ChangeInsight {
  verdict: "better" | "mixed" | "worse";
  headline: string;
  body: string;
  why: WhyItem[];
}

export type StoryKind = "usage" | "cost" | "spend" | "idle" | "season" | "lifecycle" | "steady";
export type RangeEmphasis = "events" | "change" | "trend";

export interface ChangeStory {
  kind: StoryKind;
  headline: string;
  body: string;
  usageThen: number;
  usageNow: number;
  usageDelta: number;
  costThenYuan: number;
  costNowYuan: number;
  costDeltaYuan: number;
  costDeltaPct: number | null;
}

export interface AttentionItem {
  id: string;
  kind: "season" | "idle" | "rising" | "consumable";
  name: string;
  line: string;
  detail?: string;
  href: string;
  action?: "use";
}

export interface ChangeTimelineItem {
  id: string;
  date: string;
  kind: "acquired" | "used" | "depleted" | "disposed" | "calibrated";
  title: string;
  detail?: string;
  href?: string;
}

export interface UsageRankItem {
  id: string;
  name: string;
  value: string;
  href: string;
}

export interface UsageRanks {
  most: UsageRankItem[];
  rising: UsageRankItem[];
  unused: UsageRankItem[];
}

export interface UtilShare {
  key: "high" | "mid" | "low" | "idle";
  label: string;
  hint: string;
  count: number;
  pct: number;
}

export interface UpcomingItem {
  id: string;
  kind: "season" | "consumable" | "replace";
  title: string;
  detail: string;
  href?: string;
}

export interface ChangeData {
  rangeKey: ChartRangeKey;
  windowStart: string;
  windowEnd: string;
  rangeLabel: string;
  rangeQuestion: string;
  emphasis: RangeEmphasis;
  series: HealthPoint[];
  cards: {
    valueYuan: number;
    valueDeltaYuan: number;
    dailyCostYuan: number;
    dailyCostDeltaYuan: number;
    usageRate: number;
    usageDelta: number;
    spendYuan: number;
    spendDeltaPct: number | null;
  };
  insight: ChangeInsight;
  story: ChangeStory;
  attention: AttentionItem[];
  timeline: ChangeTimelineItem[];
  ranks: UsageRanks;
  shares: UtilShare[];
  upcoming: UpcomingItem[];
  flow: { acquired: number; used: number; depleted: number; disposed: number };
  decay: CostDecayRow[];
  utilization: UtilBucket[];
  matrix: MatrixQuad[];
  funnel: FunnelStep[];
}

export function parseChartRange(raw?: string): ChartRangeKey {
  if (raw === "365" || raw === "180") return "90";
  return CHART_RANGES.some((r) => r.key === raw) ? (raw as ChartRangeKey) : "30";
}

export function parseChangeQuestion(raw?: string): ChangeQuestionKey {
  return CHANGE_QUESTIONS.some((q) => q.key === raw) ? (raw as ChangeQuestionKey) : "better";
}
