import { addDays, getDurableDefault, todayIso } from "@compos/core";
import {
  getAssetPlan,
  getEventsForAssets,
  listAssetPlans,
  listAssets,
  listReserves,
  listSkillPlans,
  listSkills,
  type AssetPlanRow,
  type AssetRow,
  type EventRow,
} from "@compos/db";
import { db } from "@/lib/db";
import { computeAssetMetrics } from "@/lib/metrics";
import {
  PLAN_INTENTS,
  SKILL_STATUSES,
  type AllocationSlice,
  type AssetAccount,
  type CapabilityPlanView,
  type PlanOverview,
  type ReplacementItem,
  type ReserveView,
} from "@/lib/plan-types";
import { getSkillSummaries } from "@/lib/skills";

function mid(range: { min: number; max: number }) {
  return (range.min + range.max) / 2;
}

function addMonths(date: string, months: number): string {
  return addDays(date, Math.round(months * 30));
}

function intentLabel(intent: string) {
  return PLAN_INTENTS.find((i) => i.key === intent)?.label ?? "继续使用";
}

function purchaseDateOf(events: EventRow[]): string | null {
  return events.find((e) => e.type === "acquired")?.occurredAt ?? null;
}

function lifespanMonthsOf(asset: AssetRow, events: EventRow[]): number {
  const acquired = events.find((e) => e.type === "acquired");
  const payload = (acquired?.payload ?? {}) as { lifespanMonths?: number };
  if (typeof payload.lifespanMonths === "number" && payload.lifespanMonths > 0) return payload.lifespanMonths;
  return getDurableDefault(asset.category).lifespanMonths;
}

function maintenanceCents(events: EventRow[]): number {
  return events
    .filter((e) => e.type === "maintenance_added")
    .reduce((sum, e) => sum + (((e.payload as { amountCents?: number })?.amountCents ?? 0) as number), 0);
}

function defaultWindow(purchase: string, lifespanMonths: number): { start: string; end: string } {
  return {
    start: addMonths(purchase, lifespanMonths * 0.8),
    end: addMonths(purchase, lifespanMonths),
  };
}

function overlapsHorizon(windowStart: string, windowEnd: string, asOf: string, months: number) {
  const horizonEnd = addMonths(asOf, months);
  return windowStart <= horizonEnd && windowEnd >= asOf;
}

export async function getAssetAccount(assetId: string): Promise<AssetAccount | null> {
  const instance = await db();
  const assets = await listAssets(instance);
  const asset = assets.find((a) => a.id === assetId);
  if (!asset) return null;
  const eventsMap = await getEventsForAssets(instance, [assetId]);
  const events = eventsMap.get(assetId) ?? [];
  const plan = await getAssetPlan(instance, assetId);
  const asOf = todayIso();
  const metrics = computeAssetMetrics(asset, events, asOf);
  const purchase = purchaseDateOf(events) ?? asset.createdAt.slice(0, 10);
  const lifespan = lifespanMonthsOf(asset, events);
  const window = plan?.windowStart && plan.windowEnd
    ? { start: plan.windowStart, end: plan.windowEnd }
    : defaultWindow(purchase, lifespan);
  const maint = maintenanceCents(events);
  const replaceCost = plan?.replaceCostCents ?? asset.priceCents;

  let currentValue = 0;
  let uses = 0;
  let daysHeld = 0;
  if (metrics.kind === "durable") {
    currentValue = mid(metrics.durable.currentValueCents.value);
    uses = mid(metrics.durable.estimatedUsageCount.value);
    daysHeld = metrics.durable.daysHeld;
  } else {
    uses = mid(metrics.consumable.estimatedUsageCount.value);
    daysHeld = metrics.consumable.daysSinceStart;
  }

  const remainingDays = lifespan * 30 - daysHeld;
  const rawMaint = plan?.triggerMaintPct ? Number(plan.triggerMaintPct) : NaN;
  const triggerMaint = Number.isFinite(rawMaint) ? (rawMaint > 1 ? rawMaint / 100 : rawMaint) : null;
  let replaceHint: string | null = null;
  if (triggerMaint && replaceCost > 0 && maint / replaceCost >= triggerMaint) {
    replaceHint = "维修投入已经接近你设的成本触发线。这是窗口提醒，不是必须换。";
  } else if (asOf >= window.start && asOf <= window.end) {
    replaceHint = "现在落在预计更换窗口里。可以继续用，也可以开始准备储备金。";
  }

  return {
    currentValueYuan: currentValue / 100,
    investedYuan: (asset.priceCents + maint) / 100,
    uses,
    releasedYuan: Math.max(asset.priceCents - currentValue, 0) / 100,
    remainingYears: remainingDays > 0 ? remainingDays / 365 : 0,
    daysHeld,
    windowStart: window.start,
    windowEnd: window.end,
    intent: plan?.intent ?? "continue",
    replaceCostYuan: replaceCost / 100,
    triggerYears: plan?.triggerYears ?? "",
    triggerMaintPct: plan?.triggerMaintPct ?? "",
    triggerUses: plan?.triggerUses != null ? String(plan.triggerUses) : "",
    triggerNote: plan?.triggerNote ?? "",
    maintYuan: maint / 100,
    replaceHint,
  };
}

export async function getPlanOverview(horizonMonths = 24): Promise<PlanOverview> {
  const instance = await db();
  const asOf = todayIso();
  const [allAssets, plans, reserves, skillRows, skillPlanRows, summaries] = await Promise.all([
    listAssets(instance, { status: "active" }),
    listAssetPlans(instance),
    listReserves(instance),
    listSkills(instance),
    listSkillPlans(instance),
    getSkillSummaries(),
  ]);
  const durables = allAssets.filter((a) => a.kind === "durable");
  const eventsByAsset = await getEventsForAssets(
    instance,
    durables.map((a) => a.id),
  );
  const planMap = new Map(plans.map((p) => [p.assetId, p]));

  const replacements: ReplacementItem[] = durables.map((asset) => {
    const events = eventsByAsset.get(asset.id) ?? [];
    const plan = planMap.get(asset.id);
    const purchase = purchaseDateOf(events) ?? asset.createdAt.slice(0, 10);
    const lifespan = lifespanMonthsOf(asset, events);
    const window = plan?.windowStart && plan.windowEnd
      ? { start: plan.windowStart, end: plan.windowEnd }
      : defaultWindow(purchase, lifespan);
    const metrics = computeAssetMetrics(asset, events, asOf);
    const value = metrics.kind === "durable" ? mid(metrics.durable.currentValueCents.value) : 0;
    const daysHeld = metrics.kind === "durable" ? metrics.durable.daysHeld : 0;
    const intent = plan?.intent ?? "continue";
    return {
      id: asset.id,
      name: asset.name,
      category: asset.category,
      purchaseDate: purchase,
      daysHeld,
      currentValueYuan: value / 100,
      replaceCostYuan: (plan?.replaceCostCents ?? asset.priceCents) / 100,
      windowStart: window.start,
      windowEnd: window.end,
      intent,
      intentLabel: intentLabel(intent),
      inHorizon: overlapsHorizon(window.start, window.end, asOf, horizonMonths) && intent !== "sell",
    };
  });

  const upcoming = replacements
    .filter((r) => r.inHorizon)
    .sort((a, b) => (a.windowStart < b.windowStart ? -1 : 1));
  const budgetYuan = upcoming.reduce((sum, r) => sum + r.replaceCostYuan, 0);
  const monthlyYuan = horizonMonths > 0 ? budgetYuan / horizonMonths : 0;

  const allocation = buildAllocation(durables, eventsByAsset, asOf);
  const reserveViews = buildReserves(reserves, asOf);
  const capabilities = buildCapabilities(skillRows, skillPlanRows, summaries);
  const weeklyHours = capabilities.reduce((sum, c) => sum + c.weeklyHours, 0);
  const idle = allocation.sort((a, b) => b.idleShare - a.idleShare)[0];
  const insight = buildInsight(upcoming, budgetYuan, monthlyYuan, idle, horizonMonths);

  return {
    horizonMonths,
    replacements: upcoming,
    budgetYuan,
    monthlyYuan,
    allocation: allocation.sort((a, b) => b.valueYuan - a.valueYuan),
    reserves: reserveViews,
    capabilities,
    weeklyHours,
    insight,
  };
}

function buildAllocation(
  durables: AssetRow[],
  eventsByAsset: Map<string, EventRow[]>,
  asOf: string,
): AllocationSlice[] {
  const groups = new Map<string, { value: number; idle: number }>();
  for (const asset of durables) {
    const events = eventsByAsset.get(asset.id) ?? [];
    const metrics = computeAssetMetrics(asset, events, asOf);
    if (metrics.kind !== "durable") continue;
    const value = mid(metrics.durable.currentValueCents.value);
    const idle = metrics.durable.usageRating === "low" ? value : 0;
    const prev = groups.get(asset.category) ?? { value: 0, idle: 0 };
    groups.set(asset.category, { value: prev.value + value, idle: prev.idle + idle });
  }
  const total = [...groups.values()].reduce((s, g) => s + g.value, 0) || 1;
  return [...groups.entries()].map(([category, g]) => ({
    category,
    valueYuan: g.value / 100,
    share: g.value / total,
    idleShare: g.value > 0 ? g.idle / g.value : 0,
  }));
}

function buildReserves(
  rows: Awaited<ReturnType<typeof listReserves>>,
  asOf: string,
): ReserveView[] {
  return rows.map((row) => {
    const remain = Math.max(row.targetCents - row.currentCents, 0);
    const days = Math.max(
      Math.round((new Date(`${row.targetDate}T00:00:00Z`).getTime() - new Date(`${asOf}T00:00:00Z`).getTime()) / 86400000),
      1,
    );
    const months = Math.max(days / 30, 1);
    return {
      id: row.id,
      name: row.name,
      targetYuan: row.targetCents / 100,
      currentYuan: row.currentCents / 100,
      targetDate: row.targetDate,
      progress: row.targetCents > 0 ? row.currentCents / row.targetCents : 0,
      monthlyYuan: remain / 100 / months,
      assetId: row.assetId,
    };
  });
}

function buildCapabilities(
  skills: Awaited<ReturnType<typeof listSkills>>,
  plans: Awaited<ReturnType<typeof listSkillPlans>>,
  summaries: Awaited<ReturnType<typeof getSkillSummaries>>,
): CapabilityPlanView[] {
  const planMap = new Map(plans.map((p) => [p.skillId, p]));
  const summaryMap = new Map(summaries.map((s) => [s.id, s]));
  return skills.map((skill) => {
    const plan = planMap.get(skill.id);
    const status = plan?.status ?? "learn";
    return {
      id: skill.id,
      name: skill.name,
      status,
      statusLabel: SKILL_STATUSES.find((s) => s.key === status)?.label ?? "学习",
      hours: plan?.hours ?? 0,
      moneyYuan: (plan?.moneyCents ?? 0) / 100,
      applications: plan?.applications ?? 0,
      weeklyHours: plan?.weeklyHours ?? 0,
      outcome: plan?.outcome ?? "",
      learnCount: summaryMap.get(skill.id)?.learnCount ?? 0,
    };
  });
}

function buildInsight(
  upcoming: ReplacementItem[],
  budgetYuan: number,
  monthlyYuan: number,
  idle: AllocationSlice | undefined,
  horizon: number,
): string {
  if (upcoming.length === 0) {
    return `未来 ${horizon} 个月没有进入更换窗口的资产。可以继续用已有的东西，不必为了规划而规划。`;
  }
  const first = upcoming[0]!;
  const idlePart =
    idle && idle.idleShare >= 0.3
      ? `当前更值得看的是「${idle.category}」：闲置比例约 ${Math.round(idle.idleShare * 100)}%，问题不一定是买多了，而是用得不够。`
      : `最先碰到窗口的是 ${first.name}（${first.windowStart.slice(0, 7)} 起）。`;
  return `未来 ${horizon} 个月，大约需要为 ${upcoming.length} 件资产更新准备 ¥${budgetYuan.toFixed(0)}，折合每月 ¥${monthlyYuan.toFixed(0)}。${idlePart}`;
}

export function parseHorizon(raw?: string): number {
  if (raw === "12" || raw === "36") return Number(raw);
  return 24;
}

export type { AssetPlanRow };
