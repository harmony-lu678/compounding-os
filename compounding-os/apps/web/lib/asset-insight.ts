import {
  analyzeUsageGap,
  daysBetween,
  SEASONALITY_LABEL,
  todayIso,
  type AssumptionSource,
  type CaptureMode,
  type Seasonality,
} from "@compos/core";
import type { EventRow } from "@compos/db";
import type { AssetAccount } from "@/lib/plan-types";
import type { AssetSummary } from "@/lib/metrics";
import { formatMoneyRange, primaryConsumableCost, primaryDurableCost } from "@/lib/format";

export type Confidence = "低" | "中" | "高";
export type ActionKind = "restock" | "season" | "idle" | "calibrate" | "replace" | "steady";

export interface AssetAction {
  kind: ActionKind;
  title: string;
  body: string;
  primary: { label: string; type: "use" | "replenish" | "observe" | "depleted" };
  secondary?: { label: string; type: "dismiss" | "observe" };
}

export interface LearningItem {
  tone: "ok" | "watch";
  title: string;
  body: string;
}

export interface AssetEventView {
  id: string;
  type: string;
  label: string;
  detail?: string;
  date: string;
}

export interface AssetInsight {
  id: string;
  name: string;
  kind: "durable" | "consumable";
  category: string;
  status: string;
  statusLine: string;
  priceLabel: string;
  acquiredAt: string;
  captureMode: CaptureMode;
  seasonality: Seasonality;
  action: AssetAction;
  valueLabel: string | null;
  costLabel: string;
  costHint: string;
  heldLine: string;
  account: {
    investedYuan: number;
    releasedYuan: number;
    uses: number;
    daysHeld: number;
    remainingYears: number | null;
  } | null;
  plan: {
    intent: string;
    windowStart: string | null;
    windowEnd: string | null;
    replaceCostYuan: number;
    triggerYears: string;
    triggerMaintPct: string;
    triggerUses: string;
    triggerNote: string;
    replaceHint: string | null;
  } | null;
  learning: LearningItem[];
  events: AssetEventView[];
  restock: {
    daysLeftMin: number;
    daysLeftMax: number;
    cycles: number[];
    cycleDays: number;
  } | null;
  freqSource: AssumptionSource;
  freqConfidence: Confidence;
  calibCount: number;
}

const EVENT_LABEL: Record<string, string> = {
  acquired: "购入",
  assumption_changed: "修正假设",
  usage_calibrated: "观察使用次数",
  usage_logged: "使用一次",
  maintenance_added: "维护/耗材",
  valued: "覆盖估值",
  depleted: "用完",
  disposed: "处置",
  replenished: "补货",
};

function confidence(source: AssumptionSource, measuredCount: number): Confidence {
  if (source === "category_default") return "低";
  if (source === "measured" && measuredCount >= 3) return "高";
  if (source === "measured") return "中";
  return measuredCount >= 2 ? "中" : "中";
}

function sourceOf(assumptions: { source: AssumptionSource }[] | undefined): AssumptionSource {
  if (!assumptions?.length) return "category_default";
  if (assumptions.some((a) => a.source === "measured")) return "measured";
  if (assumptions.some((a) => a.source === "user")) return "user";
  return "category_default";
}

function calibrations(events: EventRow[]) {
  return events
    .filter((e) => e.type === "usage_calibrated")
    .map((e) => {
      const p = (e.payload ?? {}) as { periodDays?: number; count?: number };
      return { date: e.occurredAt, periodDays: p.periodDays ?? 30, count: p.count ?? 0 };
    });
}

function cycleDays(events: EventRow[]): number[] {
  const marks = events
    .filter((e) => e.type === "acquired" || e.type === "depleted")
    .sort((a, b) => (a.occurredAt < b.occurredAt ? -1 : 1));
  const cycles: number[] = [];
  let start: string | null = null;
  for (const e of marks) {
    if (e.type === "acquired") start = e.occurredAt;
    if (e.type === "depleted" && start) {
      cycles.push(daysBetween(start, e.occurredAt));
      start = e.occurredAt;
    }
  }
  return cycles.filter((n) => n > 0).slice(-6);
}

function lastOfType(events: EventRow[], type: string): EventRow | undefined {
  return [...events].reverse().find((e) => e.type === type);
}

function eventDetail(event: EventRow): string | undefined {
  const p = (event.payload ?? {}) as Record<string, unknown>;
  if (event.type === "usage_calibrated") {
    return `最近 ${p.periodDays} 天用了 ${p.count} 次`;
  }
  if (event.type === "replenished") {
    if (typeof p.daysLeft === "number") return `当时还剩约 ${p.daysLeft} 天`;
    if (typeof p.previousCycleDays === "number") return `上一周期 ${p.previousCycleDays} 天`;
  }
  if (event.type === "assumption_changed" && typeof p.field === "string") {
    return `修正了 ${p.field}`;
  }
  return undefined;
}

export function buildAssetInsight(
  asset: AssetSummary,
  events: EventRow[],
  account: AssetAccount | null,
  asOf: string = todayIso(),
): AssetInsight {
  const seasonality = asset.seasonality;
  const calibs = calibrations(events);
  const freqAssumptions =
    asset.metrics.kind === "durable"
      ? asset.metrics.durable.estimatedUsageCount.assumptions
      : asset.metrics.consumable.estimatedUsageCount.assumptions;
  const freqSource = sourceOf(freqAssumptions);
  const freqConfidence = confidence(freqSource, calibs.length);
  const lastCalib = calibs[calibs.length - 1];
  const daysSinceCalib = lastCalib ? daysBetween(lastCalib.date, asOf) : null;
  const lastValued = lastOfType(events, "valued");
  const daysSinceValue = lastValued ? daysBetween(lastValued.occurredAt, asOf) : null;
  const usageDates = events.filter((e) => e.type === "usage_logged").map((e) => e.occurredAt);
  const lastUse = usageDates[usageDates.length - 1];
  const daysSinceUse = lastUse ? daysBetween(lastUse, asOf) : null;
  const gap = analyzeUsageGap({ seasonality, asOf, usageDates });
  const cycles = cycleDays(events);

  let restock: AssetInsight["restock"] = null;
  if (asset.kind === "consumable" && asset.metrics.kind === "consumable") {
    const m = asset.metrics.consumable;
    if (m.status === "in_progress" && m.predictedDepletionDate) {
      restock = {
        daysLeftMin: daysBetween(asOf, m.predictedDepletionDate.min),
        daysLeftMax: daysBetween(asOf, m.predictedDepletionDate.max),
        cycles,
        cycleDays: m.daysSinceStart,
      };
    }
  }

  const action = pickAction({
    asset,
    restock,
    gap,
    seasonality,
    daysSinceCalib,
    daysSinceValue,
    daysSinceUse,
    replaceHint: account?.replaceHint ?? null,
    captureMode: asset.captureMode,
  });

  const learning = buildLearning({
    asset,
    seasonality,
    gap,
    calibs,
    cycles,
    freqSource,
    freqConfidence,
    restock,
    daysSinceCalib,
  });

  let valueLabel: string | null = null;
  let costLabel = "—";
  let costHint = "";
  let heldLine = "";
  if (asset.metrics.kind === "durable") {
    const d = asset.metrics.durable;
    const primary = primaryDurableCost(d);
    valueLabel = formatMoneyRange(d.currentValueCents.value, 0);
    costLabel = `${formatMoneyRange(primary.range)} ${primary.unit}`;
    costHint = primary.label;
    heldLine = `已使用 ${Math.round(d.estimatedUsageCount.value.min)}~${Math.round(d.estimatedUsageCount.value.max)} 次 · 持有 ${d.daysHeld} 天`;
    if (account?.remainingYears != null) {
      heldLine += ` · 预计剩余 ${account.remainingYears.toFixed(1)} 年`;
    }
  } else {
    const c = asset.metrics.consumable;
    const primary = primaryConsumableCost(c);
    costLabel = `${formatMoneyRange(primary.range)} ${primary.unit}`;
    costHint = primary.label;
    heldLine = `已使用 ${c.daysSinceStart} 天 · 周期 ${Math.round(c.cycleDays.value.min)}~${Math.round(c.cycleDays.value.max)} 天`;
  }

  const seasonBit =
    seasonality === "year" ? "全年" : seasonality === "scene" ? "场景型" : `${SEASONALITY_LABEL[seasonality]}资产`;
  const lifeBit =
    asset.status !== "active"
      ? "已结束"
      : asset.kind === "consumable"
        ? restock
          ? `预计 ${labelDays(restock.daysLeftMin, restock.daysLeftMax)}`
          : "使用中"
        : gap.life === "dormant"
          ? "休眠中"
          : gap.life === "idle"
            ? "节奏偏慢"
            : "使用中";

  return {
    id: asset.id,
    name: asset.name,
    kind: asset.kind,
    category: asset.category,
    status: asset.status,
    statusLine: `${seasonBit} · ${lifeBit}`,
    priceLabel: `¥${(asset.priceCents / 100).toFixed(0)}`,
    acquiredAt: asset.createdAt.slice(0, 10),
    captureMode: asset.captureMode,
    seasonality,
    action,
    valueLabel,
    costLabel,
    costHint,
    heldLine,
    account: account
      ? {
          investedYuan: account.investedYuan,
          releasedYuan: account.releasedYuan,
          uses: account.uses,
          daysHeld: account.daysHeld,
          remainingYears: asset.kind === "durable" ? account.remainingYears : null,
        }
      : null,
    plan: account
      ? {
          intent: account.intent === "upgrade" ? "replace" : account.intent,
          windowStart: account.windowStart,
          windowEnd: account.windowEnd,
          replaceCostYuan: account.replaceCostYuan,
          triggerYears: account.triggerYears,
          triggerMaintPct: account.triggerMaintPct,
          triggerUses: account.triggerUses,
          triggerNote: account.triggerNote,
          replaceHint: account.replaceHint,
        }
      : null,
    learning,
    events: [...events]
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
      .map((e) => ({
        id: e.id,
        type: e.type,
        label: EVENT_LABEL[e.type] ?? e.type,
        detail: eventDetail(e),
        date: e.occurredAt,
      })),
    restock,
    freqSource,
    freqConfidence,
    calibCount: calibs.length,
  };
}

function labelDays(min: number, max: number): string {
  if (min < 0 && max < 0) return "已过预计用完日";
  if (min <= 0) return "这几天就会用完";
  if (min === max) return `${min} 天后用完`;
  return `${Math.max(min, 0)}~${Math.max(max, min)} 天后用完`;
}

function pickAction(input: {
  asset: AssetSummary;
  restock: AssetInsight["restock"];
  gap: ReturnType<typeof analyzeUsageGap>;
  seasonality: Seasonality;
  daysSinceCalib: number | null;
  daysSinceValue: number | null;
  daysSinceUse: number | null;
  replaceHint: string | null;
  captureMode: CaptureMode;
}): AssetAction {
  const { asset, restock, gap } = input;

  if (asset.status !== "active") {
    return {
      kind: "steady",
      title: "这件资产已经结束",
      body: "账还在，只是不再需要新的观察。",
      primary: { label: "查看学习记录", type: "observe" },
    };
  }

  if (restock && restock.daysLeftMin <= 14) {
    const history = restock.cycles.length ? `历史周期 ${restock.cycles.join(" / ")} 天。` : "";
    return {
      kind: "restock",
      title: restock.daysLeftMin <= 0 ? "补货窗口已经打开" : `预计 ${labelDays(restock.daysLeftMin, restock.daysLeftMax)}`,
      body: `${history}今天是第 ${restock.cycleDays} 天。补货会记下一笔观察，用来学习你通常提前几天补。`,
      primary: { label: "补货", type: "replenish" },
      secondary: { label: "先不提醒", type: "dismiss" },
    };
  }

  if (gap.life !== "dormant" && (gap.gapLevel === "idle" || gap.gapLevel === "watch")) {
    return {
      kind: "season",
      title: gap.gapLevel === "idle" ? "比历史节奏慢了" : "使用窗口到了",
      body:
        gap.usesLastYearSameMonth > 0
          ? `去年同期 ${gap.usesLastYearSameMonth} 次，今年这个窗口 ${gap.usesThisWindow} 次。`
          : "进入预期使用窗口后，还没有对上你的历史节奏。",
      primary: { label: "今天用了", type: "use" },
      secondary: { label: "暂时不用", type: "dismiss" },
    };
  }

  if (gap.life === "dormant") {
    return {
      kind: "season",
      title: `${SEASONALITY_LABEL[input.seasonality]}资产，现在是休眠`,
      body: "休眠不是闲置。窗口到了再看一眼就行。",
      primary: { label: "今天用了", type: "use" },
      secondary: { label: "知道了", type: "dismiss" },
    };
  }

  if (
    input.captureMode !== "auto" &&
    input.daysSinceUse != null &&
    input.daysSinceUse >= 30 &&
    gap.usesLastYearSameMonth >= 2
  ) {
    return {
      kind: "idle",
      title: `${input.daysSinceUse} 天没有使用记录`,
      body: `按你的历史，通常这个月会用到 ${gap.usesLastYearSameMonth} 次左右。`,
      primary: { label: "使用一次", type: "use" },
      secondary: { label: "继续忽略", type: "dismiss" },
    };
  }

  if (input.replaceHint) {
    return {
      kind: "replace",
      title: "更换窗口到了",
      body: input.replaceHint,
      primary: { label: "更新计划", type: "observe" },
      secondary: { label: "先不用看", type: "dismiss" },
    };
  }

  if (input.daysSinceCalib == null || input.daysSinceCalib >= 37) {
    return {
      kind: "calibrate",
      title: input.daysSinceCalib == null ? "还没有实测过使用节奏" : `使用假设已经 ${input.daysSinceCalib} 天没更新`,
      body: "补一个观察，预测会收窄一点。不是打卡。",
      primary: { label: "更新一下", type: "observe" },
      secondary: { label: "先不用", type: "dismiss" },
    };
  }

  if (asset.kind === "durable" && input.daysSinceValue != null && input.daysSinceValue >= 90) {
    return {
      kind: "calibrate",
      title: `估值记录于 ${input.daysSinceValue} 天前`,
      body: "如果出手价变了，覆盖一次即可。",
      primary: { label: "重新估值", type: "observe" },
      secondary: { label: "先不用", type: "dismiss" },
    };
  }

  if (asset.kind === "consumable") {
    return {
      kind: "steady",
      title: "这一瓶还在用",
      body: restock ? `预计 ${labelDays(restock.daysLeftMin, restock.daysLeftMax)}。用完时记一下，周期就变成实测。` : "用完时记一下，下一瓶的预测会更准。",
      primary: { label: "用完了", type: "depleted" },
      secondary: { label: "更新信息", type: "observe" },
    };
  }

  return {
    kind: "steady",
    title: "现在没有必须做的事",
    body: `使用频率来自${freqSourceLabel(input.asset)}。有新观察再补。`,
    primary: { label: "更新资产信息", type: "observe" },
  };
}

function assetFreqAssumptions(asset: AssetSummary) {
  return asset.metrics.kind === "durable"
    ? asset.metrics.durable.estimatedUsageCount.assumptions
    : asset.metrics.consumable.estimatedUsageCount.assumptions;
}

function freqSourceLabel(asset: AssetSummary): string {
  const source = sourceOf(assetFreqAssumptions(asset));
  if (source === "measured") return "实测";
  if (source === "user") return "你填的假设";
  return "类目默认";
}

function buildLearning(input: {
  asset: AssetSummary;
  seasonality: Seasonality;
  gap: ReturnType<typeof analyzeUsageGap>;
  calibs: { date: string; periodDays: number; count: number }[];
  cycles: number[];
  freqSource: AssumptionSource;
  freqConfidence: Confidence;
  restock: AssetInsight["restock"];
  daysSinceCalib: number | null;
}): LearningItem[] {
  const items: LearningItem[] = [];
  const { calibs, gap, seasonality } = input;

  if (calibs.length) {
    const last = calibs.slice(-3);
    const perMonth = last.map((c) => Math.round((c.count / Math.max(c.periodDays, 1)) * 30));
    const min = Math.min(...perMonth);
    const max = Math.max(...perMonth);
    items.push({
      tone: "ok",
      title: "使用频率",
      body: `最近 ${last.length} 次观察约 ${perMonth.join(" / ")} 次/月 → 预测 ${min === max ? `${min}` : `${min}~${max}`} 次/月 · 可信度${input.freqConfidence}`,
    });
  } else {
    items.push({
      tone: input.freqSource === "category_default" ? "watch" : "ok",
      title: "使用频率",
      body: `来源：${input.freqSource === "user" ? "用户填写" : "类目默认"} · 可信度${input.freqConfidence}。还没有实测观察。`,
    });
  }

  if (seasonality !== "year") {
    items.push({
      tone: gap.gapLevel === "none" ? "ok" : "watch",
      title: "季节性",
      body:
        gap.usesLastYearSameMonth > 0
          ? `已识别为${SEASONALITY_LABEL[seasonality]}。去年同期 ${gap.usesLastYearSameMonth} 次，今年窗口内 ${gap.usesThisWindow} 次。`
          : `按名称判断为${SEASONALITY_LABEL[seasonality]}。窗口内外使用还不够，置信度先记中。`,
    });
  }

  if (input.cycles.length >= 2) {
    const min = Math.min(...input.cycles);
    const max = Math.max(...input.cycles);
    items.push({
      tone: "ok",
      title: "消耗周期",
      body: `过去 ${input.cycles.length} 个周期：${input.cycles.join(" / ")} 天 → 预计下次 ${min}~${max} 天。`,
    });
  } else if (input.asset.kind === "consumable" && input.restock) {
    items.push({
      tone: "watch",
      title: "消耗周期",
      body: `当前第 ${input.restock.cycleDays} 天。用完并补货后，周期会从估算变成实测。`,
    });
  }

  if (input.daysSinceCalib != null && input.daysSinceCalib >= 37) {
    items.push({
      tone: "watch",
      title: "假设有点旧了",
      body: `上次观察在 ${input.daysSinceCalib} 天前。补一次就能收窄预测。`,
    });
  }

  return items.slice(0, 5);
}
