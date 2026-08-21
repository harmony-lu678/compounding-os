import {
  addDays,
  daysBetween,
  getDurableDefault,
  inCalendarWindow,
  todayIso,
} from "@compos/core";
import { getEventsForAssets, listAssets, type AssetRow, type EventRow } from "@compos/db";
import {
  CHART_RANGES,
  type AttentionItem,
  type ChangeData,
  type ChangeInsight,
  type ChangeStory,
  type ChangeTimelineItem,
  type ChartRangeKey,
  type CostDecayRow,
  type FunnelStep,
  type HealthPoint,
  type MatrixQuad,
  type UpcomingItem,
  type UsageRanks,
  type UtilBucket,
  type UtilShare,
  type WhyItem,
} from "@/lib/change-types";
import { resolveCaptureMode } from "@/lib/capture";
import { db } from "@/lib/db";
import { computeAssetMetrics, summarize } from "@/lib/metrics";
import { collectRestockReminders } from "@/lib/restock";
import { buildSeasonToday, resolveSeasonality } from "@/lib/season";

function mid(range: { min: number; max: number }) {
  return (range.min + range.max) / 2;
}

function usageScore(rating: string): number {
  if (rating === "high") return 1;
  if (rating === "medium") return 0.65;
  if (rating === "low") return 0.3;
  return 0.45;
}

function sampleDates(end: string, days: number): string[] {
  const step = days <= 30 ? 1 : days <= 90 ? 3 : 14;
  const dates: string[] = [];
  for (let offset = days; offset >= 0; offset -= step) {
    dates.push(addDays(end, -offset));
  }
  if (dates[dates.length - 1] !== end) dates.push(end);
  return dates;
}

interface Snap {
  id: string;
  name: string;
  category: string;
  kind: "durable" | "consumable";
  price: number;
  value: number;
  dailyCost: number;
  usage: number;
  rating: string;
  perUse: number;
  uses: number;
  daysHeld: number;
  active: boolean;
}

function snapAt(asset: AssetRow, events: EventRow[], asOf: string): Snap | null {
  const eventsAsOf = events.filter((e) => e.occurredAt <= asOf);
  if (!eventsAsOf.some((e) => e.type === "acquired")) return null;
  const disposed = eventsAsOf.some((e) => e.type === "disposed");
  if (disposed) {
    return {
      id: asset.id,
      name: asset.name,
      category: asset.category,
      kind: asset.kind,
      price: asset.priceCents,
      value: 0,
      dailyCost: 0,
      usage: 0,
      rating: "unknown",
      perUse: 0,
      uses: 0,
      daysHeld: 0,
      active: false,
    };
  }
  const metrics = computeAssetMetrics(asset, eventsAsOf, asOf);
  if (metrics.kind === "durable") {
    const d = metrics.durable;
    return {
      id: asset.id,
      name: asset.name,
      category: asset.category,
      kind: "durable",
      price: asset.priceCents,
      value: mid(d.currentValueCents.value),
      dailyCost: mid(d.realizedDailyCostCents.value),
      usage: usageScore(d.usageRating),
      rating: d.usageRating,
      perUse: mid(d.perUseCostCents.value),
      uses: mid(d.estimatedUsageCount.value),
      daysHeld: d.daysHeld,
      active: true,
    };
  }
  if (metrics.consumable.status === "completed") {
    return {
      id: asset.id,
      name: asset.name,
      category: asset.category,
      kind: "consumable",
      price: asset.priceCents,
      value: 0,
      dailyCost: 0,
      usage: 0,
      rating: "unknown",
      perUse: 0,
      uses: 0,
      daysHeld: 0,
      active: false,
    };
  }
  return {
    id: asset.id,
    name: asset.name,
    category: asset.category,
    kind: "consumable",
    price: asset.priceCents,
    value: 0,
    dailyCost: mid(metrics.consumable.dailyCostCents.value),
    usage: 0.7,
    rating: "medium",
    perUse: mid(metrics.consumable.perUseCostCents.value),
    uses: mid(metrics.consumable.estimatedUsageCount.value),
    daysHeld: metrics.consumable.daysSinceStart,
    active: true,
  };
}

function portfolio(snaps: Snap[]) {
  const durables = snaps.filter((s) => s.kind === "durable" && s.active);
  const usageN = durables.length;
  return {
    value: snaps.reduce((a, s) => a + s.value, 0),
    dailyCost: snaps.reduce((a, s) => a + s.dailyCost, 0),
    usageRate: usageN ? durables.reduce((a, s) => a + s.usage, 0) / usageN : 0,
  };
}

function buildWhy(thenSnaps: Snap[], nowSnaps: Snap[], eventsByAsset: Map<string, EventRow[]>, windowStart: string, asOf: string): WhyItem[] {
  const thenMap = new Map(thenSnaps.map((s) => [s.id, s]));
  const nowMap = new Map(nowSnaps.map((s) => [s.id, s]));
  const items: WhyItem[] = [];

  for (const now of nowSnaps) {
    const then = thenMap.get(now.id);
    const events = eventsByAsset.get(now.id) ?? [];
    const acquiredHere = events.some((e) => e.type === "acquired" && e.occurredAt >= windowStart && e.occurredAt <= asOf);
    const disposedHere = events.some((e) => e.type === "disposed" && e.occurredAt >= windowStart && e.occurredAt <= asOf);
    const delta = now.dailyCost - (then?.dailyCost ?? 0);
    if (acquiredHere && now.active) {
      items.push({ id: now.id, label: `新买了 ${now.name}`, detail: "新增持有成本", deltaYuan: now.dailyCost / 100 });
      continue;
    }
    if (disposedHere) {
      items.push({
        id: now.id,
        label: `处置了 ${now.name}`,
        detail: "不再计入每天成本",
        deltaYuan: -((then?.dailyCost ?? 0) / 100),
      });
      continue;
    }
    if (Math.abs(delta) < 1) continue;
    items.push({
      id: now.id,
      label: now.usage > (then?.usage ?? 0) ? `${now.name} 用得更勤` : `${now.name} 成本在变`,
      detail: now.usage > (then?.usage ?? 0) ? "使用把单次成本摊薄了" : "持有假设或估值变了",
      deltaYuan: delta / 100,
    });
  }

  for (const then of thenSnaps) {
    if (nowMap.has(then.id)) continue;
    items.push({ id: then.id, label: then.name, detail: "这段时间离开了账本", deltaYuan: -(then.dailyCost / 100) });
  }

  return items
    .filter((i) => Math.abs(i.deltaYuan) >= 0.05)
    .sort((a, b) => Math.abs(b.deltaYuan) - Math.abs(a.deltaYuan))
    .slice(0, 4);
}

function buildInsight(
  usageDelta: number,
  costDeltaYuan: number,
  spendYuan: number,
  why: WhyItem[],
): ChangeInsight {
  const better = usageDelta > 0.03 && costDeltaYuan <= 0;
  const worse = usageDelta < -0.03 && costDeltaYuan > 0;
  let verdict: ChangeInsight["verdict"] = "mixed";
  let headline = "这段时间资产状态大体平稳";
  let body = "没有大起大落。真正的复利往往看起来很普通：继续用已经有的东西。";

  if (better && spendYuan <= 0) {
    verdict = "better";
    headline = "你不是买得更少，而是开始更充分地使用已有资产";
    body = "使用效率在升，每天的持有成本在降。变化发生在已经拥有的东西上。";
  } else if (better) {
    verdict = "better";
    headline = "买了新的，也把旧的用起来了";
    body = "新购入会抬高成本，但使用效率跟着上来了。东西在变成资产，而不是堆积。";
  } else if (spendYuan <= 0 && costDeltaYuan < 0) {
    verdict = "better";
    headline = "这段时间没有新买，持有成本自己在往下走";
    body = "本金留在已有资产上。用得越久，每天分摊就越薄。";
  } else if (worse) {
    verdict = "worse";
    headline = "东西在闲下来，每天却更贵了";
    body = "使用效率下降，同时持有成本上升。值得看一眼哪些高成本资产几乎没在用。";
  } else if (usageDelta < -0.03) {
    verdict = "worse";
    headline = "已有的东西正在变得更闲";
    body = "价值还在，但使用效率掉了。先问一句：这些东西还在为你工作吗？";
  } else if (costDeltaYuan > 1 && spendYuan > 0) {
    verdict = "mixed";
    headline = "最近的变化主要来自新购入";
    body = "日均成本被新资产推高了。关键不是别买，而是它们会不会被用起来。";
  }

  return { verdict, headline, body, why };
}

function loggedUses(events: EventRow[], start: string, end: string): number {
  let n = 0;
  for (const e of events) {
    if (e.occurredAt < start || e.occurredAt > end) continue;
    if (e.type === "usage_logged") n += 1;
    if (e.type === "usage_calibrated") {
      const count = (e.payload as { count?: number } | null)?.count;
      n += typeof count === "number" && count > 0 ? count : 1;
    }
  }
  return n;
}

function lastUsedAt(events: EventRow[], asOf: string): string | null {
  const dates = events
    .filter((e) => (e.type === "usage_logged" || e.type === "usage_calibrated") && e.occurredAt <= asOf)
    .map((e) => e.occurredAt);
  return dates.length ? dates[dates.length - 1]! : null;
}

function pctLabel(n: number): string {
  return `${Math.round(Math.abs(n) * 100)}%`;
}

function pickStory(input: {
  emphasis: "events" | "change" | "trend";
  usageThen: number;
  usageNow: number;
  usageDelta: number;
  costThenYuan: number;
  costNowYuan: number;
  costDeltaYuan: number;
  spendYuan: number;
  acquired: number;
  disposed: number;
  idleCount: number;
  seasonLabel: string;
  seasonEntering: number;
  seasonLagging: number;
  transitioning: boolean;
  replaceCount: number;
  risingNames: string[];
}): ChangeStory {
  const usageThenPct = Math.round(input.usageThen * 100);
  const usageNowPct = Math.round(input.usageNow * 100);
  const costDeltaPct =
    input.costThenYuan > 0.2 ? input.costDeltaYuan / input.costThenYuan : null;
  const rising = input.risingNames.slice(0, 3).join("、");
  const boost = (kind: ChangeStory["kind"]) => {
    if (input.emphasis === "events") return kind === "spend" || kind === "lifecycle" ? 8 : 0;
    if (input.emphasis === "trend") return kind === "idle" || kind === "usage" || kind === "season" ? 8 : 0;
    return kind === "usage" || kind === "cost" ? 6 : 0;
  };

  const candidates: Array<{ kind: ChangeStory["kind"]; score: number; headline: string; body: string }> = [];

  if (input.usageDelta >= 0.03) {
    candidates.push({
      kind: "usage",
      score: 18 + Math.round(input.usageDelta * 80) + boost("usage"),
      headline:
        input.emphasis === "trend"
          ? "过去这段时间，你最明显的变化不是少买，而是把已有东西用得更多"
          : "这段时间，你开始更充分地使用已经拥有的东西",
      body: rising
        ? `资产使用率 ${usageThenPct}% → ${usageNowPct}%。主要来自 ${rising} 的使用增加。`
        : `资产使用率 ${usageThenPct}% → ${usageNowPct}%。变化发生在已经拥有的东西上。`,
    });
  } else if (input.usageDelta <= -0.03) {
    candidates.push({
      kind: "usage",
      score: 16 + Math.round(Math.abs(input.usageDelta) * 80) + boost("usage"),
      headline: "已有的东西正在变得更闲",
      body: `资产使用率 ${usageThenPct}% → ${usageNowPct}%。价值还在，但使用效率掉了。`,
    });
  }

  if (input.acquired === 0 && input.spendYuan <= 0) {
    const up = input.usageDelta >= 0.03;
    candidates.push({
      kind: "spend",
      score: 14 + (up ? 10 : 4) + (input.costDeltaYuan < 0 ? 4 : 0) + boost("spend"),
      headline: up
        ? `这段时间你没有新增资产，但已有资产的使用效率提高了 ${pctLabel(input.usageDelta)}`
        : "本周期没有新增资产，持有成本自己在往下走",
      body: up
        ? "少买只是背景。真正的变化是：已经拥有的东西被用起来了。"
        : "本金留在已有资产上。用得越久，每天分摊就越薄。",
    });
  } else if (input.spendYuan > 0 && input.costDeltaYuan > 0.4) {
    candidates.push({
      kind: "spend",
      score: 12 + Math.min(input.acquired, 4) * 3 + boost("spend"),
      headline: "最近的变化主要来自新购入",
      body: `新增 ${input.acquired} 件。日均成本被新资产推高了。关键不是别买，而是它们会不会被用起来。`,
    });
  }

  if (input.costThenYuan > 0.2 && costDeltaPct !== null && costDeltaPct <= -0.04) {
    candidates.push({
      kind: "cost",
      score: 12 + Math.round(Math.abs(costDeltaPct) * 60) + boost("cost"),
      headline: `你的平均持有成本下降了 ${pctLabel(costDeltaPct)}`,
      body: `日均持有成本 ¥${input.costThenYuan.toFixed(1)} → ¥${input.costNowYuan.toFixed(1)}。东西在变得更划算。`,
    });
  }

  if (input.idleCount >= 2) {
    candidates.push({
      kind: "idle",
      score: 10 + input.idleCount * 4 + boost("idle"),
      headline: `${input.idleCount} 件资产低于自己的历史使用节奏`,
      body: "不是闲置判决。只是它们现在的使用，还没对上你过去同一时期的习惯。",
    });
  }

  if (input.transitioning || input.seasonEntering >= 2) {
    candidates.push({
      kind: "season",
      score: (input.transitioning ? 22 : 10) + input.seasonEntering + boost("season"),
      headline: input.transitioning
        ? `${input.seasonLabel}资产开始进入使用期`
        : `有 ${input.seasonEntering} 件季节资产正处在使用窗口`,
      body:
        input.seasonLagging > 0
          ? `其中 ${input.seasonLagging} 件比历史节奏慢。休眠不是闲置，但窗口到了可以看一眼。`
          : `窗口到了，用到的时候记一下就行，不必每天打卡。`,
    });
  }

  if (input.replaceCount > 0) {
    candidates.push({
      kind: "lifecycle",
      score: 11 + input.replaceCount * 5 + boost("lifecycle"),
      headline: `${input.replaceCount} 件资产进入预计更换窗口`,
      body: "可以继续用，也可以开始准备。这不是「该换了」。",
    });
  }

  if (input.disposed > 0 && input.emphasis === "events") {
    candidates.push({
      kind: "lifecycle",
      score: 16 + input.disposed * 4,
      headline: `这段时间你清理了 ${input.disposed} 件资产`,
      body: "进出本身就是变化。账本轻一点，剩下的才更清楚。",
    });
  }

  const top = candidates.sort((a, b) => b.score - a.score)[0] ?? {
    kind: "steady" as const,
    headline: "这段时间资产状态大体平稳",
    body: "没有大起大落。真正的复利往往看起来很普通：继续用已经有的东西。",
  };

  return {
    kind: top.kind,
    headline: top.headline,
    body: top.body,
    usageThen: input.usageThen,
    usageNow: input.usageNow,
    usageDelta: input.usageDelta,
    costThenYuan: input.costThenYuan,
    costNowYuan: input.costNowYuan,
    costDeltaYuan: input.costDeltaYuan,
    costDeltaPct,
  };
}

function buildShares(nowSnaps: Snap[]): UtilShare[] {
  const durables = nowSnaps.filter((s) => s.kind === "durable" && s.active);
  const high = durables.filter((s) => s.rating === "high");
  const idle = durables.filter((s) => s.rating !== "high" && s.usage <= 0.3);
  const mid = durables.filter((s) => s.rating === "medium" && !idle.includes(s));
  const low = durables.filter((s) => !high.includes(s) && !mid.includes(s) && !idle.includes(s));
  const total = durables.length || 1;
  const rows = [
    { key: "high" as const, label: "高频使用", hint: "正在充分工作", items: high },
    { key: "mid" as const, label: "正常使用", hint: "还算用得上", items: mid },
    { key: "low" as const, label: "低频使用", hint: "偶尔才用", items: low },
    { key: "idle" as const, label: "闲置倾向", hint: "值得重新看一眼", items: idle },
  ];
  return rows.map((row) => ({
    key: row.key,
    label: row.label,
    hint: row.hint,
    count: row.items.length,
    pct: row.items.length / total,
  }));
}

function buildRanks(
  assets: AssetRow[],
  eventsByAsset: Map<string, EventRow[]>,
  windowStart: string,
  asOf: string,
): UsageRanks {
  const prevStart = addDays(windowStart, -daysBetween(windowStart, asOf));
  const scored = assets
    .filter((a) => a.status === "active" && a.kind === "durable")
    .map((asset) => {
      const events = eventsByAsset.get(asset.id) ?? [];
      const now = loggedUses(events, windowStart, asOf);
      const prev = loggedUses(events, prevStart, addDays(windowStart, -1));
      const last = lastUsedAt(events, asOf);
      const mode = resolveCaptureMode(asset, events);
      const seasonality = resolveSeasonality(asset);
      const dormant = !inCalendarWindow(seasonality, asOf) && seasonality !== "year" && seasonality !== "scene";
      const deltaPct = prev > 0 ? (now - prev) / prev : now > 0 ? 1 : 0;
      return { asset, now, prev, last, mode, dormant, deltaPct };
    });

  const most = scored
    .filter((s) => s.now > 0)
    .sort((a, b) => b.now - a.now || a.asset.name.localeCompare(b.asset.name, "zh"))
    .slice(0, 3)
    .map((s) => ({ id: s.asset.id, name: s.asset.name, value: `${s.now} 次`, href: `/assets/${s.asset.id}` }));

  const rising = scored
    .filter((s) => s.now >= 2 && s.now > s.prev)
    .sort((a, b) => b.deltaPct - a.deltaPct)
    .slice(0, 3)
    .map((s) => ({
      id: s.asset.id,
      name: s.asset.name,
      value: s.prev > 0 ? `+${Math.round(s.deltaPct * 100)}%` : `新增 ${s.now} 次`,
      href: `/assets/${s.asset.id}`,
    }));

  const unused = scored
    .filter((s) => s.now === 0 && s.mode !== "auto" && !s.dormant)
    .sort((a, b) => (a.last ?? "") < (b.last ?? "") ? -1 : 1)
    .slice(0, 3)
    .map((s) => ({
      id: s.asset.id,
      name: s.asset.name,
      value: s.last ? `${daysBetween(s.last, asOf)} 天未用` : "这段时间 0 次",
      href: `/assets/${s.asset.id}`,
    }));

  return { most, rising, unused };
}

function buildAttention(input: {
  seasonWatch: Array<{
    id: string;
    name: string;
    insight: string;
    usesThisWindow: number;
    usesLastYearSameMonth: number;
  }>;
  unused: UsageRanks["unused"];
  rising: UsageRanks["rising"];
  consumables: AttentionItem[];
}): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const w of input.seasonWatch.slice(0, 2)) {
    items.push({
      id: w.id,
      kind: "season",
      name: w.name,
      line: w.usesLastYearSameMonth > 0 ? `去年同期 ${w.usesLastYearSameMonth} 次，今年 ${w.usesThisWindow} 次` : w.insight,
      detail: w.insight,
      href: `/assets/${w.id}`,
      action: "use",
    });
  }
  for (const u of input.unused.slice(0, 2)) {
    if (items.some((i) => i.id === u.id)) continue;
    items.push({
      id: u.id,
      kind: "idle",
      name: u.name,
      line: u.value,
      href: u.href,
      action: "use",
    });
  }
  for (const r of input.rising.slice(0, 1)) {
    if (items.some((i) => i.id === r.id)) continue;
    items.push({
      id: r.id,
      kind: "rising",
      name: r.name,
      line: `使用增加 ${r.value}`,
      href: r.href,
    });
  }
  for (const c of input.consumables) {
    if (items.length >= 4) break;
    if (items.some((i) => i.id === c.id)) continue;
    items.push(c);
  }
  return items.slice(0, 4);
}

function consumableAttention(assets: AssetRow[], eventsByAsset: Map<string, EventRow[]>, asOf: string): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const asset of assets) {
    if (asset.kind !== "consumable" || asset.status !== "active") continue;
    const events = eventsByAsset.get(asset.id) ?? [];
    const depleted = events.filter((e) => e.type === "depleted").map((e) => e.occurredAt).sort();
    if (depleted.length < 2) continue;
    const last = depleted[depleted.length - 1]!;
    const prev = depleted[depleted.length - 2]!;
    const before = depleted[depleted.length - 3] ?? events.find((e) => e.type === "acquired")?.occurredAt;
    const lastCycle = daysBetween(prev, last);
    const prevCycle = before ? daysBetween(before, prev) : null;
    if (prevCycle && lastCycle - prevCycle >= 5 && daysBetween(last, asOf) <= 90) {
      items.push({
        id: asset.id,
        kind: "consumable",
        name: asset.name,
        line: `本次消耗周期 ${lastCycle} 天`,
        detail: `比上次多 ${lastCycle - prevCycle} 天`,
        href: `/assets/${asset.id}`,
      });
    }
  }
  return items.slice(0, 2);
}

function buildTimeline(
  assets: AssetRow[],
  eventsByAsset: Map<string, EventRow[]>,
  windowStart: string,
  asOf: string,
  limit: number,
): ChangeTimelineItem[] {
  const items: ChangeTimelineItem[] = [];
  const useCount = new Map<string, { date: string; name: string; count: number; id: string }>();

  for (const asset of assets) {
    const events = eventsByAsset.get(asset.id) ?? [];
    const acquiredAt = events.find((e) => e.type === "acquired")?.occurredAt;
    for (const e of events) {
      if (e.occurredAt < windowStart || e.occurredAt > asOf) continue;
      if (e.type === "acquired") {
        items.push({
          id: e.id,
          date: e.occurredAt,
          kind: "acquired",
          title: `新增：${asset.name}`,
          detail: `¥${(asset.priceCents / 100).toFixed(0)}`,
          href: `/assets/${asset.id}`,
        });
      } else if (e.type === "disposed") {
        items.push({
          id: e.id,
          date: e.occurredAt,
          kind: "disposed",
          title: `处置：${asset.name}`,
          href: `/assets/${asset.id}`,
        });
      } else if (e.type === "depleted") {
        const start = acquiredAt && acquiredAt < e.occurredAt ? acquiredAt : addDays(e.occurredAt, -30);
        items.push({
          id: e.id,
          date: e.occurredAt,
          kind: "depleted",
          title: `用完：${asset.name}`,
          detail: `本次周期 ${daysBetween(start, e.occurredAt)} 天`,
          href: `/assets/${asset.id}`,
        });
      } else if (e.type === "usage_calibrated") {
        items.push({
          id: e.id,
          date: e.occurredAt,
          kind: "calibrated",
          title: `校准：${asset.name}`,
          href: `/assets/${asset.id}`,
        });
      } else if (e.type === "usage_logged") {
        const key = `${asset.id}|${e.occurredAt}`;
        const cur = useCount.get(key);
        if (cur) cur.count += 1;
        else useCount.set(key, { date: e.occurredAt, name: asset.name, count: 1, id: asset.id });
      }
    }
  }

  for (const row of useCount.values()) {
    items.push({
      id: `${row.id}-${row.date}`,
      date: row.date,
      kind: "used",
      title: `使用：${row.name}`,
      detail: row.count > 1 ? `+${row.count}` : "+1",
      href: `/assets/${row.id}`,
    });
  }

  const significant = items.filter((i) => i.kind !== "used");
  const used = items.filter((i) => i.kind === "used");
  const merged = [...significant, ...used.slice(0, Math.max(4, limit - significant.length))];
  return merged.sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1)).slice(0, limit);
}

function inReplaceWindow(asset: AssetRow, events: EventRow[], asOf: string): boolean {
  if (asset.kind !== "durable" || asset.status !== "active") return false;
  const metrics = computeAssetMetrics(asset, events, asOf);
  if (metrics.kind !== "durable") return false;
  const lifespan = getDurableDefault(asset.category).lifespanMonths * 30;
  const start = lifespan * 0.8;
  return metrics.durable.daysHeld >= start && metrics.durable.daysHeld <= lifespan * 1.05;
}

function nextSeasonHint(asOf: string): { label: string; seasonality: "winter" | "summer" | "spring_autumn"; days: number } | null {
  const month = Number(asOf.slice(5, 7));
  const day = Number(asOf.slice(8, 10));
  const year = Number(asOf.slice(0, 4));
  if (month === 9 || month === 10) {
    const start = `${year}-11-01`;
    return { label: "冬季", seasonality: "winter", days: daysBetween(asOf, start) };
  }
  if (month === 3 || month === 4) {
    const start = `${year}-05-01`;
    return { label: "夏季", seasonality: "summer", days: daysBetween(asOf, start) };
  }
  if (month === 2 && day >= 15) {
    return { label: "春季", seasonality: "spring_autumn", days: daysBetween(asOf, `${year}-03-01`) };
  }
  if (month === 8 && day >= 15) {
    return { label: "秋季", seasonality: "spring_autumn", days: daysBetween(asOf, `${year}-09-01`) };
  }
  return null;
}

function buildUpcoming(
  assets: AssetRow[],
  eventsByAsset: Map<string, EventRow[]>,
  asOf: string,
  seasonEntering: number,
  seasonLabel: string,
  transitioning: boolean,
): UpcomingItem[] {
  const items: UpcomingItem[] = [];
  const next = nextSeasonHint(asOf);
  if (transitioning) {
    items.push({
      id: "season-now",
      kind: "season",
      title: `${seasonLabel}资产正在进入使用窗口`,
      detail: seasonEntering > 0 ? `有 ${seasonEntering} 件值得重新看一眼` : "窗口到了，用到再记。",
      href: "/season",
    });
  } else if (next) {
    const count = assets.filter((a) => {
      if (a.status !== "active" || a.kind !== "durable") return false;
      return resolveSeasonality(a) === next.seasonality;
    }).length;
    if (count > 0) {
      items.push({
        id: "season-next",
        kind: "season",
        title: `${next.label}资产即将进入使用窗口`,
        detail: `大约 ${next.days} 天后，有 ${count} 件值得重新关注`,
        href: "/season",
      });
    }
  }

  const summaries = assets.map((a) => summarize(a, eventsByAsset.get(a.id) ?? [], asOf));
  const restock = collectRestockReminders(summaries, asOf).slice(0, 2);
  if (restock.length) {
    items.push({
      id: "restock",
      kind: "consumable",
      title: restock.length === 1 ? `${restock[0]!.name} 快要用完` : `${restock.length} 件消耗品预计不久会用完`,
      detail: restock.map((r) => r.name).join(" · "),
      href: restock.length === 1 ? `/assets/${restock[0]!.id}` : "/assets",
    });
  }

  const replacing = assets.filter((a) => inReplaceWindow(a, eventsByAsset.get(a.id) ?? [], asOf)).slice(0, 2);
  if (replacing.length) {
    items.push({
      id: "replace",
      kind: "replace",
      title: replacing.length === 1 ? `${replacing[0]!.name} 进入预计更换窗口` : `${replacing.length} 件资产进入预计更换窗口`,
      detail: "可以继续用，也可以开始准备。",
      href: replacing.length === 1 ? `/assets/${replacing[0]!.id}` : "/plan",
    });
  }

  return items.slice(0, 3);
}

function buildDecay(nowSnaps: Snap[]): CostDecayRow[] {
  return nowSnaps
    .filter((s) => s.active && s.kind === "durable" && s.uses >= 2 && s.perUse > 0 && s.price > 0)
    .sort((a, b) => b.price - a.price)
    .slice(0, 3)
    .map((s) => {
      const total = s.perUse * s.uses;
      const usesNow = Math.max(s.uses, 2);
      const nextUses = Math.round(usesNow * 1.35);
      const maxUses = Math.max(nextUses, 8);
      const steps = 8;
      const curve = Array.from({ length: steps }, (_, i) => {
        const uses = Math.max(1, (maxUses * (i + 1)) / steps);
        return { uses, perUseYuan: total / uses / 100 };
      });
      return {
        id: s.id,
        name: s.name,
        category: s.category,
        priceYuan: s.price / 100,
        usesNow,
        perUseNowYuan: s.perUse / 100,
        nextUses,
        perUseNextYuan: total / nextUses / 100,
        curve,
      };
    });
}

function buildUtilization(nowSnaps: Snap[]): UtilBucket[] {
  const durables = nowSnaps.filter((s) => s.kind === "durable" && s.active);
  const groups = {
    high: durables.filter((s) => s.rating === "high"),
    mid: durables.filter((s) => s.rating === "medium"),
    low: durables.filter((s) => s.rating === "low"),
    idle: durables.filter((s) => s.rating === "low" || s.usage <= 0.3),
  };
  const idle = groups.low;
  return [
    { key: "high", label: "高频", hint: "正在充分工作", count: groups.high.length, valueYuan: groups.high.reduce((a, s) => a + s.value, 0) / 100, assets: groups.high.slice(0, 4).map((s) => ({ id: s.id, name: s.name })) },
    { key: "mid", label: "中频", hint: "还算用得上", count: groups.mid.length, valueYuan: groups.mid.reduce((a, s) => a + s.value, 0) / 100, assets: groups.mid.slice(0, 4).map((s) => ({ id: s.id, name: s.name })) },
    { key: "low", label: "低频", hint: "偶尔才用", count: idle.length, valueYuan: idle.reduce((a, s) => a + s.value, 0) / 100, assets: idle.slice(0, 4).map((s) => ({ id: s.id, name: s.name })) },
    { key: "idle", label: "闲置倾向", hint: "值得重新看一眼", count: idle.length, valueYuan: idle.reduce((a, s) => a + s.value, 0) / 100, assets: idle.slice(0, 6).map((s) => ({ id: s.id, name: s.name })) },
  ];
}

function buildMatrix(nowSnaps: Snap[]): MatrixQuad[] {
  const durables = nowSnaps.filter((s) => s.kind === "durable" && s.active);
  const costs = durables.map((s) => s.dailyCost).sort((a, b) => a - b);
  const median = costs.length ? costs[Math.floor(costs.length / 2)]! : 0;
  const toAsset = (s: Snap) => ({ id: s.id, name: s.name, dailyCostYuan: s.dailyCost / 100, usageRate: s.usage });
  const core = durables.filter((s) => s.dailyCost >= median && s.rating === "high").map(toAsset);
  const review = durables.filter((s) => s.dailyCost >= median && s.rating !== "high").map(toAsset);
  const superA = durables.filter((s) => s.dailyCost < median && s.rating === "high").map(toAsset);
  const idle = durables.filter((s) => s.dailyCost < median && s.rating !== "high").map(toAsset);
  return [
    { key: "core", title: "核心资产", hint: "高成本 · 高使用", assets: core },
    { key: "super", title: "超级资产", hint: "低成本 · 高使用", assets: superA },
    { key: "review", title: "值得重新审视", hint: "高成本 · 低使用", assets: review },
    { key: "idle", title: "无所谓，可考虑处置", hint: "低成本 · 低使用", assets: idle },
  ];
}

function buildFunnel(assets: AssetRow[], eventsByAsset: Map<string, EventRow[]>, nowSnaps: Snap[], windowStart: string, asOf: string): FunnelStep[] {
  const acquired: Snap[] = [];
  for (const asset of assets) {
    const events = eventsByAsset.get(asset.id) ?? [];
    if (!events.some((e) => e.type === "acquired" && e.occurredAt >= windowStart && e.occurredAt <= asOf)) continue;
    const now = nowSnaps.find((s) => s.id === asset.id);
    if (now) acquired.push(now);
  }
  const spend = acquired.reduce((a, s) => a + s.price, 0);
  const formed = acquired.filter((s) => s.active);
  const high = formed.filter((s) => s.rating === "high");
  const low = formed.filter((s) => s.rating === "low" || s.usage <= 0.3);
  return [
    { key: "spend", label: "消费", yuan: spend / 100 },
    { key: "formed", label: "形成资产", yuan: formed.reduce((a, s) => a + s.price, 0) / 100 },
    { key: "high", label: "高频使用", yuan: high.reduce((a, s) => a + s.price, 0) / 100 },
    { key: "idle", label: "低频 / 闲置", yuan: low.reduce((a, s) => a + s.price, 0) / 100 },
  ];
}

export async function getChangeData(rangeKey: ChartRangeKey = "30"): Promise<ChangeData> {
  const range = CHART_RANGES.find((r) => r.key === rangeKey) ?? CHART_RANGES[1];
  const instance = await db();
  const asOf = todayIso();
  const windowStart = addDays(asOf, -range.days);
  const allAssets = await listAssets(instance);
  const eventsByAsset = await getEventsForAssets(
    instance,
    allAssets.map((a) => a.id),
  );

  const dates = sampleDates(asOf, range.days);
  const series: HealthPoint[] = dates.map((date) => {
    const snaps = allAssets.map((a) => snapAt(a, eventsByAsset.get(a.id) ?? [], date)).filter((s): s is Snap => s !== null);
    const p = portfolio(snaps);
    return { date, valueYuan: p.value / 100, dailyCostYuan: p.dailyCost / 100, usageRate: p.usageRate };
  });

  const thenSnaps = allAssets.map((a) => snapAt(a, eventsByAsset.get(a.id) ?? [], windowStart)).filter((s): s is Snap => s !== null);
  const nowSnaps = allAssets.map((a) => snapAt(a, eventsByAsset.get(a.id) ?? [], asOf)).filter((s): s is Snap => s !== null);
  const thenP = portfolio(thenSnaps);
  const nowP = portfolio(nowSnaps);

  let spendNow = 0;
  let spendPrev = 0;
  const flow = { acquired: 0, used: 0, depleted: 0, disposed: 0 };
  const prevStart = addDays(windowStart, -range.days);
  for (const asset of allAssets) {
    for (const e of eventsByAsset.get(asset.id) ?? []) {
      if (e.occurredAt >= windowStart && e.occurredAt <= asOf) {
        if (e.type === "acquired") flow.acquired += 1;
        if (e.type === "usage_logged" || e.type === "usage_calibrated") flow.used += 1;
        if (e.type === "depleted") flow.depleted += 1;
        if (e.type === "disposed") flow.disposed += 1;
      }
      if (e.type !== "acquired") continue;
      if (e.occurredAt >= windowStart && e.occurredAt <= asOf) spendNow += asset.priceCents;
      if (e.occurredAt >= prevStart && e.occurredAt < windowStart) spendPrev += asset.priceCents;
    }
  }

  const why = buildWhy(thenSnaps, nowSnaps, eventsByAsset, windowStart, asOf);
  const usageDelta = nowP.usageRate - thenP.usageRate;
  const costDeltaYuan = (nowP.dailyCost - thenP.dailyCost) / 100;
  const spendYuan = spendNow / 100;
  const spendDeltaPct = spendPrev > 0 ? (spendNow - spendPrev) / spendPrev : null;
  const season = buildSeasonToday(allAssets, eventsByAsset, asOf);
  const ranks = buildRanks(allAssets, eventsByAsset, windowStart, asOf);
  const replaceCount = allAssets.filter((a) => inReplaceWindow(a, eventsByAsset.get(a.id) ?? [], asOf)).length;
  const story = pickStory({
    emphasis: range.emphasis,
    usageThen: thenP.usageRate,
    usageNow: nowP.usageRate,
    usageDelta,
    costThenYuan: thenP.dailyCost / 100,
    costNowYuan: nowP.dailyCost / 100,
    costDeltaYuan,
    spendYuan,
    acquired: flow.acquired,
    disposed: flow.disposed,
    idleCount: season.watch.length + ranks.unused.length,
    seasonLabel: season.seasonLabel,
    seasonEntering: season.likely.length,
    seasonLagging: season.watch.length,
    transitioning: season.transitioning,
    replaceCount,
    risingNames: ranks.rising.map((r) => r.name),
  });
  const attention = buildAttention({
    seasonWatch: season.watch,
    unused: ranks.unused,
    rising: ranks.rising,
    consumables: consumableAttention(allAssets, eventsByAsset, asOf),
  });
  const timelineLimit = range.key === "7" ? 12 : range.key === "30" ? 8 : 6;
  const timeline = buildTimeline(allAssets, eventsByAsset, windowStart, asOf, timelineLimit);
  const upcoming = buildUpcoming(
    allAssets,
    eventsByAsset,
    asOf,
    season.likely.length,
    season.seasonLabel,
    season.transitioning,
  );

  return {
    rangeKey: range.key,
    windowStart,
    windowEnd: asOf,
    rangeLabel: range.label,
    rangeQuestion: range.question,
    emphasis: range.emphasis,
    series,
    cards: {
      valueYuan: nowP.value / 100,
      valueDeltaYuan: (nowP.value - thenP.value) / 100,
      dailyCostYuan: nowP.dailyCost / 100,
      dailyCostDeltaYuan: costDeltaYuan,
      usageRate: nowP.usageRate,
      usageDelta,
      spendYuan,
      spendDeltaPct,
    },
    insight: buildInsight(usageDelta, costDeltaYuan, spendYuan, why),
    story,
    attention,
    timeline,
    ranks,
    shares: buildShares(nowSnaps),
    upcoming,
    flow,
    decay: buildDecay(nowSnaps),
    utilization: buildUtilization(nowSnaps),
    matrix: buildMatrix(nowSnaps),
    funnel: buildFunnel(allAssets, eventsByAsset, nowSnaps, windowStart, asOf),
  };
}
