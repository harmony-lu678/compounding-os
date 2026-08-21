import { addDays, daysBetween, inCalendarWindow, todayIso } from "@compos/core";
import { getEventsForAssets, listAssets, listLifeEvents, listSkills, type AssetRow, type EventRow } from "@compos/db";
import { resolveCaptureMode } from "@/lib/capture";
import { db } from "@/lib/db";
import { buildSeasonToday, resolveSeasonality } from "@/lib/season";
import { computeAssetMetrics, summarize } from "@/lib/metrics";
import { collectRestockReminders } from "@/lib/restock";
import {
  ritualTimelineTitle,
  type CaptureToday,
  type RecentChange,
  type RitualKey,
  type SpecialUseAsset,
  type TimelineItem,
  type TodayInsight,
  type TodayView,
} from "@/lib/today-types";

const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

function mid(range: { min: number; max: number }) {
  return (range.min + range.max) / 2;
}

function usageScore(rating: string): number {
  if (rating === "high") return 1;
  if (rating === "medium") return 0.65;
  if (rating === "low") return 0.3;
  return 0.45;
}

function snapshot(asset: AssetRow, events: EventRow[], asOf: string) {
  const eventsAsOf = events.filter((e) => e.occurredAt <= asOf);
  if (!eventsAsOf.some((e) => e.type === "acquired")) return null;
  if (eventsAsOf.some((e) => e.type === "disposed")) {
    return { value: 0, dailyCost: 0, usage: 0, daysHeld: 0, name: asset.name, category: asset.category, price: asset.priceCents, perUse: 0 };
  }
  const metrics = computeAssetMetrics(asset, eventsAsOf, asOf);
  if (metrics.kind === "durable") {
    const d = metrics.durable;
    return {
      value: mid(d.currentValueCents.value),
      dailyCost: mid(d.realizedDailyCostCents.value),
      usage: usageScore(d.usageRating),
      daysHeld: d.daysHeld,
      name: asset.name,
      category: asset.category,
      price: asset.priceCents,
      perUse: mid(d.perUseCostCents.value),
    };
  }
  if (metrics.consumable.status === "completed") {
    return { value: 0, dailyCost: 0, usage: 0, daysHeld: 0, name: asset.name, category: asset.category, price: asset.priceCents, perUse: 0 };
  }
  return {
    value: 0,
    dailyCost: mid(metrics.consumable.dailyCostCents.value),
    usage: 0.7,
    daysHeld: metrics.consumable.daysSinceStart,
    name: asset.name,
    category: asset.category,
    price: asset.priceCents,
    perUse: mid(metrics.consumable.perUseCostCents.value),
  };
}

function portfolio(assets: AssetRow[], eventsByAsset: Map<string, EventRow[]>, asOf: string) {
  let value = 0;
  let dailyCost = 0;
  let usageSum = 0;
  let usageN = 0;
  const rows: NonNullable<ReturnType<typeof snapshot>>[] = [];
  for (const asset of assets) {
    const snap = snapshot(asset, eventsByAsset.get(asset.id) ?? [], asOf);
    if (!snap) continue;
    rows.push(snap);
    value += snap.value;
    dailyCost += snap.dailyCost;
    if (asset.kind === "durable" && snap.daysHeld > 0) {
      usageSum += snap.usage;
      usageN += 1;
    }
  }
  return { value, dailyCost, usageRate: usageN ? usageSum / usageN : 0, rows };
}

function noBuyStreak(eventsByAsset: Map<string, EventRow[]>, asOf: string): number {
  let lastBuy = "";
  for (const events of eventsByAsset.values()) {
    for (const e of events) {
      if (e.type === "acquired" && e.occurredAt <= asOf && e.occurredAt > lastBuy) lastBuy = e.occurredAt;
    }
  }
  if (!lastBuy) return 0;
  return Math.max(0, daysBetween(lastBuy, asOf));
}

function pickInsight(asOf: string, ctx: {
  streak: number;
  now: ReturnType<typeof portfolio>;
  then: ReturnType<typeof portfolio>;
  acquired30: number;
}): TodayInsight {
  const candidates: TodayInsight[] = [];
  const decay = [...ctx.now.rows]
    .filter((r) => r.price > 0 && r.daysHeld >= 14)
    .map((r) => ({ ...r, released: r.price - r.value, pct: (r.price - r.value) / r.price }))
    .sort((a, b) => b.pct - a.pct)[0];

  if (decay && decay.pct > 0.05) {
    candidates.push({
      title: "你可能不知道",
      body: `${decay.name} 已持有 ${decay.daysHeld} 天。按当前估算，购买成本的 ${Math.round(decay.pct * 100)}% 已经「用回来了」，今日再释放约 ¥${(decay.dailyCost / 100).toFixed(1)}。`,
    });
  }

  if (ctx.streak >= 3) {
    candidates.push({
      title: "复利提醒",
      body: `你已经连续 ${ctx.streak} 天没有新增购买。真正的变化往往不是少买一件东西，而是让已有资产继续工作。`,
    });
  }

  const usageDelta = ctx.now.usageRate - ctx.then.usageRate;
  if (Math.abs(usageDelta) >= 0.03) {
    candidates.push({
      title: "一个有趣的变化",
      body:
        usageDelta > 0
          ? `过去 30 天，资产使用率提高了 ${Math.round(usageDelta * 100)}%。变化不是更会买，而是更充分地使用已经拥有的东西。`
          : `过去 30 天，资产使用率下降了 ${Math.round(Math.abs(usageDelta) * 100)}%。有些东西可能正在变成「低频高值」——值得打开列表看一眼。`,
    });
  }

  const costDelta = ctx.now.dailyCost - ctx.then.dailyCost;
  if (ctx.then.dailyCost > 0 && Math.abs(costDelta) / ctx.then.dailyCost >= 0.05) {
    candidates.push({
      title: "成本正在变化",
      body:
        costDelta < 0
          ? `日均资产成本比 30 天前低了 ¥${(Math.abs(costDelta) / 100).toFixed(1)}。你越用它们，它们越便宜。`
          : `日均资产成本比 30 天前高了 ¥${(costDelta / 100).toFixed(1)}。新购入或低频资产会把这个数字推高。`,
    });
  }

  if (ctx.acquired30 === 0) {
    candidates.push({
      title: "今日发现",
      body: "过去 30 天没有新购入。本金留在手里，已有资产继续释放价值——这就是复利的一种形态。",
    });
  }

  const cheap = [...ctx.now.rows].filter((r) => r.perUse > 0).sort((a, b) => a.perUse - b.perUse)[0];
  if (cheap) {
    candidates.push({
      title: "你可能不知道",
      body: `${cheap.name} 的单次成本大约 ¥${(cheap.perUse / 100).toFixed(1)}。用得越多，这笔账越划算。`,
    });
  }

  if (candidates.length === 0) {
    return {
      title: "今日发现",
      body: "先让已有资产工作一天。成本会自己往下走，这就是复利开始的地方。",
    };
  }

  const seed = asOf.split("-").reduce((n, p) => n + Number(p), 0);
  return candidates[seed % candidates.length]!;
}

function pickRotated<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}

function buildRecentChanges(
  assets: AssetRow[],
  eventsByAsset: Map<string, EventRow[]>,
  asOf: string,
  weekAgo: string,
  nowP: ReturnType<typeof portfolio>,
  weekP: ReturnType<typeof portfolio>,
): RecentChange[] {
  let disposed = 0;
  let depleted = 0;
  let acquired = 0;
  let usageUp = 0;

  for (const asset of assets) {
    const events = eventsByAsset.get(asset.id) ?? [];
    for (const e of events) {
      if (e.occurredAt < weekAgo || e.occurredAt > asOf) continue;
      if (e.type === "disposed") disposed += 1;
      if (e.type === "depleted") depleted += 1;
      if (e.type === "acquired") acquired += 1;
    }
    const now = snapshot(asset, events, asOf);
    const then = snapshot(asset, events, weekAgo);
    if (now && then && now.usage - then.usage >= 0.05) usageUp += 1;
  }

  const costDelta = (nowP.dailyCost - weekP.dailyCost) / 100;
  const items: RecentChange[] = [];
  if (acquired) items.push({ sign: "+", text: `${acquired} 件新资产` });
  if (disposed) items.push({ sign: "+", text: `${disposed} 件资产被处置` });
  if (usageUp) items.push({ sign: "+", text: `${usageUp} 件资产使用率提高` });
  if (Math.abs(costDelta) >= 0.5) {
    items.push({
      sign: costDelta < 0 ? "-" : "+",
      text: `¥${Math.abs(costDelta).toFixed(0)} 日均成本`,
    });
  }
  if (depleted) items.push({ sign: "+", text: `${depleted} 个消耗品周期完成` });
  if (items.length === 0) items.push({ sign: "", text: "这 7 天很稳，资产没有大的进出。" });
  return items;
}

function buildCaptureToday(
  assets: AssetRow[],
  eventsByAsset: Map<string, EventRow[]>,
  asOf: string,
): CaptureToday {
  const monthAgo = addDays(asOf, -30);
  const dailyAuto: { id: string; name: string }[] = [];
  const offSeasonDaily: SpecialUseAsset[] = [];
  const specialPool: Array<{
    id: string;
    name: string;
    category: string;
    todayCount: number;
    lastUsedAt?: string;
    loggedCount30: number;
    lastCalibratedAt?: string;
    mode: "quick" | "batch";
  }> = [];

  for (const asset of assets) {
    if (asset.status !== "active" || asset.kind !== "durable") continue;
    const events = eventsByAsset.get(asset.id) ?? [];
    const mode = resolveCaptureMode(asset, events);
    const uses = events.filter((e) => e.type === "usage_logged");
    const todayCount = uses.filter((e) => e.occurredAt === asOf).length;
    const lastUsedAt = uses.length ? uses[uses.length - 1]!.occurredAt : undefined;
    const loggedCount30 = uses.filter((e) => e.occurredAt >= monthAgo).length;
    const lastCalibratedAt = events.filter((e) => e.type === "usage_calibrated").at(-1)?.occurredAt;

    const seasonality = resolveSeasonality(asset);
    const inSeason = seasonality === "year" || seasonality === "scene" || inCalendarWindow(seasonality, asOf);

    if (mode === "auto") {
      if (inSeason) {
        dailyAuto.push({ id: asset.id, name: asset.name });
        continue;
      }
      offSeasonDaily.push({ id: asset.id, name: asset.name, category: asset.category, todayCount });
      continue;
    }
    if (!inSeason) {
      offSeasonDaily.push({ id: asset.id, name: asset.name, category: asset.category, todayCount });
      continue;
    }
    specialPool.push({
      id: asset.id,
      name: asset.name,
      category: asset.category,
      todayCount,
      lastUsedAt,
      loggedCount30,
      lastCalibratedAt,
      mode,
    });
  }

  specialPool.sort((a, b) => {
    if (a.todayCount !== b.todayCount) return b.todayCount - a.todayCount;
    if ((a.lastUsedAt ?? "") !== (b.lastUsedAt ?? "")) return (a.lastUsedAt ?? "") < (b.lastUsedAt ?? "") ? 1 : -1;
    return a.name.localeCompare(b.name, "zh");
  });

  const chips = specialPool.slice(0, 8).map(({ id, name, category, todayCount }) => ({
    id,
    name,
    category,
    todayCount,
  }));
  const chipIds = new Set(chips.map((c) => c.id));
  const others = [
    ...specialPool
      .filter((a) => !chipIds.has(a.id))
      .map(({ id, name, category, todayCount }) => ({ id, name, category, todayCount })),
    ...offSeasonDaily.filter((a) => !chipIds.has(a.id)),
  ];

  const todaySpecialCount = specialPool.filter((a) => a.todayCount > 0).length;

  const weekAgo = addDays(asOf, -7);
  const lowFreq = specialPool.filter((a) => {
    if (a.todayCount > 0) return false;
    if (a.loggedCount30 >= 8) return false;
    return a.mode === "quick" || a.loggedCount30 <= 3;
  });

  const watchCandidates = lowFreq.filter((a) => !a.lastUsedAt || a.lastUsedAt <= weekAgo);
  const calibCandidates = lowFreq.filter((a) => !a.lastCalibratedAt || a.lastCalibratedAt < monthAgo);

  const watchAsset = pickRotated(watchCandidates);
  const calibrationAsset = pickRotated(calibCandidates.filter((a) => a.id !== watchAsset?.id));

  const watchPool = watchCandidates.map((a) => ({
    id: a.id,
    name: a.name,
    daysSinceLastUse: a.lastUsedAt ? daysBetween(a.lastUsedAt, asOf) : null,
  }));
  const calibAsks = calibCandidates.map((a) => ({
    id: a.id,
    name: a.name,
    loggedCount30: a.loggedCount30,
  }));

  return {
    dailyAuto: dailyAuto.slice(0, 6),
    specials: chips,
    others,
    todaySpecialCount,
    budget: 3,
    calibration: calibrationAsset
      ? { id: calibrationAsset.id, name: calibrationAsset.name, loggedCount30: calibrationAsset.loggedCount30 }
      : null,
    watchHint: watchAsset
      ? {
          id: watchAsset.id,
          name: watchAsset.name,
          daysSinceLastUse: watchAsset.lastUsedAt ? daysBetween(watchAsset.lastUsedAt, asOf) : null,
        }
      : null,
    watchPool,
    calibPool: calibAsks,
  };
}

export async function getTodayView(): Promise<TodayView> {
  const instance = await db();
  const asOf = todayIso();
  const then = addDays(asOf, -30);
  const weekAgo = addDays(asOf, -7);
  const yesterday = addDays(asOf, -1);
  const date = new Date(`${asOf}T00:00:00`);

  const assets = await listAssets(instance);
  const eventsByAsset = await getEventsForAssets(
    instance,
    assets.map((a) => a.id),
  );
  const life = await listLifeEvents(instance, 80);

  const nowP = portfolio(assets, eventsByAsset, asOf);
  const thenP = portfolio(assets, eventsByAsset, then);
  const weekP = portfolio(assets, eventsByAsset, weekAgo);
  const yP = portfolio(assets, eventsByAsset, yesterday);

  const usedByLife = new Set(
    life
      .filter((e) => e.type === "use")
      .map((e) => `${(e.payload as { assetId?: string } | null)?.assetId ?? ""}|${e.occurredAt}`),
  );

  let acquired30 = 0;
  const timeline: TimelineItem[] = [];
  for (const asset of assets) {
    for (const e of eventsByAsset.get(asset.id) ?? []) {
      if (e.occurredAt >= then && e.occurredAt <= asOf && e.type === "acquired") acquired30 += 1;
      if (e.type === "usage_logged" && usedByLife.has(`${asset.id}|${e.occurredAt}`)) continue;
      if (["acquired", "depleted", "disposed", "valued", "usage_calibrated", "usage_logged"].includes(e.type)) {
        const label =
          e.type === "acquired"
            ? "买入"
            : e.type === "depleted"
              ? "用完"
              : e.type === "disposed"
                ? "处置"
                : e.type === "valued"
                  ? "估值"
                  : e.type === "usage_logged"
                    ? "使用"
                    : "校准";
        timeline.push({
          id: e.id,
          date: e.occurredAt,
          title: `${label} ${asset.name}`,
          detail: asset.category,
          href: `/assets/${asset.id}`,
          createdAt: e.createdAt,
        });
      }
    }
  }

  for (const e of life) {
    const payload = (e.payload ?? {}) as { label?: string; assetId?: string; skillId?: string };
    const href =
      typeof payload.assetId === "string"
        ? `/assets/${payload.assetId}`
        : typeof payload.skillId === "string"
          ? `/skills/${payload.skillId}`
          : undefined;
    timeline.push({
      id: e.id,
      date: e.occurredAt,
      title: ritualTimelineTitle(e.type, payload.label),
      detail: payload.label ?? "今日动作",
      href,
      createdAt: e.createdAt,
    });
  }

  timeline.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (a.createdAt ?? "") < (b.createdAt ?? "") ? 1 : -1;
  });

  const todayLife = life.filter((e) => e.occurredAt === asOf);
  const todayRituals = (["use", "learn", "save", "create", "clean"] as RitualKey[]).map((key) => {
    const items = todayLife.filter((e) => e.type === key);
    const last = items[0];
    const label = last ? ((last.payload as { label?: string } | null)?.label ?? undefined) : undefined;
    return { key, count: items.length, lastLabel: label };
  });
  const learnCount = life.filter((e) => e.type === "learn" && e.occurredAt >= addDays(asOf, -7)).length;
  const assetUseCount = todayLife.filter((e) => e.type === "use").length || nowP.rows.filter((r) => r.usage >= 0.65).length;

  const skillRows = await listSkills(instance);
  const ritualAssets = assets
    .filter((a) => a.status === "active")
    .map((a) => ({ id: a.id, name: a.name, category: a.category, kind: a.kind }));
  const ritualSkills = skillRows.map((s) => ({ id: s.id, name: s.name }));

  const streak = noBuyStreak(eventsByAsset, asOf);

  return {
    asOf,
    weekday: WEEKDAYS[date.getDay()] ?? "",
    monthDay: `${date.getMonth() + 1}月${date.getDate()}日`,
    releasedYuan: nowP.dailyCost / 100,
    dailyCostYuan: nowP.dailyCost / 100,
    yesterdayDailyCostYuan: yP.dailyCost / 100,
    assetUseCount,
    learnCount,
    noBuyStreakDays: streak,
    comparison30: {
      usageRateNow: nowP.usageRate,
      usageRateThen: thenP.usageRate,
      dailyCostNow: nowP.dailyCost / 100,
      dailyCostThen: thenP.dailyCost / 100,
      acquiredCount: acquired30,
      valueNow: nowP.value / 100,
      valueThen: thenP.value / 100,
    },
    insight: pickInsight(asOf, { streak, now: nowP, then: thenP, acquired30 }),
    recentChanges: buildRecentChanges(assets, eventsByAsset, asOf, weekAgo, nowP, weekP),
    usageRateNow: nowP.usageRate,
    usageDelta30: nowP.usageRate - thenP.usageRate,
    timeline: timeline.slice(0, 20),
    todayRituals,
    ritualAssets,
    ritualSkills,
    capture: buildCaptureToday(assets, eventsByAsset, asOf),
    season: buildSeasonToday(assets, eventsByAsset, asOf),
    restock: collectRestockReminders(
      assets.filter((a) => a.status === "active").map((a) => summarize(a, eventsByAsset.get(a.id) ?? [], asOf)),
      asOf,
    ),
  };
}
