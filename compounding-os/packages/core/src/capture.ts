import type { FreqTier, UsageFrequency } from "./types";

/** 记录模式：决定这件资产要不要出现在「特别使用」里。 */
export const CAPTURE_MODES = ["auto", "quick", "batch"] as const;
export type CaptureMode = (typeof CAPTURE_MODES)[number];

export const CAPTURE_MODE_LABEL: Record<CaptureMode, string> = {
  auto: "自动估算",
  quick: "快速记录",
  batch: "批量校准",
};

export const CAPTURE_MODE_HINT: Record<CaptureMode, string> = {
  auto: "每天都在用，不必记。系统按频率估算。",
  quick: "偶尔才用。发生时点一下 +1。",
  batch: "有规律但不必每天记。隔一段时间问一次大概几次。",
};

const AUTO_NAME = /手机|iphone|ipad|macbook|电脑|笔记本|水杯|杯子|办公椅|椅子|耳机|airpods|床垫|显示器|键盘|鼠标|手表|apple watch/i;
const QUICK_NAME = /相机|单反|微单|行李箱|登山|冲浪|吉他|滑雪|帐篷|无人机|望远镜|钢琴|画架/i;
const BATCH_NAME = /鞋|跑鞋|球鞋|健身|哑铃|瑜伽|背包|通勤包/i;

function tierOf(freq?: UsageFrequency): FreqTier | undefined {
  if (!freq) return undefined;
  if (freq.type === "tier") return freq.tier;
  if (freq.perMonth >= 25) return "daily_once";
  if (freq.perMonth >= 8) return "weekly_few";
  if (freq.perMonth >= 3) return "weekly_once";
  if (freq.perMonth >= 1) return "monthly_few";
  return "rare";
}

/**
 * 日常的自动算，特别的顺手记，规律的偶尔校准。
 * 消耗品走「用完了」，不进特别使用。
 */
export function inferCaptureMode(input: {
  kind: "durable" | "consumable";
  name: string;
  category: string;
  usageFrequency?: UsageFrequency;
}): CaptureMode {
  if (input.kind === "consumable") return "auto";

  const name = input.name;
  if (AUTO_NAME.test(name)) return "auto";
  if (QUICK_NAME.test(name)) return "quick";
  if (BATCH_NAME.test(name)) return "batch";

  const tier = tierOf(input.usageFrequency);
  if (tier === "daily_multiple" || tier === "daily_once") return "auto";
  if (tier === "rare" || tier === "monthly_few") return "quick";

  if (["电子产品", "家具", "床品"].includes(input.category)) return "auto";
  if (["箱包", "饰品"].includes(input.category)) return "quick";
  if (["衣物", "电器", "日用品"].includes(input.category)) return "batch";
  return "batch";
}

export function isCaptureMode(value: unknown): value is CaptureMode {
  return value === "auto" || value === "quick" || value === "batch";
}
