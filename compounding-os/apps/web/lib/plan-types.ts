export const PLAN_INTENTS = [
  { key: "continue", label: "继续使用" },
  { key: "upgrade", label: "升级" },
  { key: "sell", label: "出售" },
  { key: "replace", label: "更换" },
] as const;

export const SKILL_STATUSES = [
  { key: "learn", label: "学习" },
  { key: "practice", label: "实践" },
  { key: "project", label: "项目" },
  { key: "output", label: "输出" },
  { key: "return", label: "开始回报" },
] as const;

export const PLAN_HORIZONS = [
  { key: "12", months: 12, label: "12个月" },
  { key: "24", months: 24, label: "24个月" },
  { key: "36", months: 36, label: "36个月" },
] as const;

export type PlanHorizonKey = (typeof PLAN_HORIZONS)[number]["key"];

export interface ReplacementItem {
  id: string;
  name: string;
  category: string;
  purchaseDate: string;
  daysHeld: number;
  currentValueYuan: number;
  replaceCostYuan: number;
  windowStart: string;
  windowEnd: string;
  intent: string;
  intentLabel: string;
  inHorizon: boolean;
}

export interface AllocationSlice {
  category: string;
  valueYuan: number;
  share: number;
  idleShare: number;
}

export interface ReserveView {
  id: string;
  name: string;
  targetYuan: number;
  currentYuan: number;
  targetDate: string;
  progress: number;
  monthlyYuan: number;
  assetId: string | null;
}

export interface CapabilityPlanView {
  id: string;
  name: string;
  status: string;
  statusLabel: string;
  hours: number;
  moneyYuan: number;
  applications: number;
  weeklyHours: number;
  outcome: string;
  learnCount: number;
}

export interface PlanOverview {
  horizonMonths: number;
  replacements: ReplacementItem[];
  budgetYuan: number;
  monthlyYuan: number;
  allocation: AllocationSlice[];
  reserves: ReserveView[];
  capabilities: CapabilityPlanView[];
  weeklyHours: number;
  insight: string;
}

export interface AssetAccount {
  currentValueYuan: number;
  investedYuan: number;
  uses: number;
  releasedYuan: number;
  remainingYears: number | null;
  daysHeld: number;
  windowStart: string | null;
  windowEnd: string | null;
  intent: string;
  replaceCostYuan: number;
  triggerYears: string;
  triggerMaintPct: string;
  triggerUses: string;
  triggerNote: string;
  maintYuan: number;
  replaceHint: string | null;
}
