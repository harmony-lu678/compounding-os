import { addDays, todayIso } from "@compos/core";
import { getEventsForAssets, listAssets, type AssetRow, type EventRow } from "@compos/db";
import {
  CHART_RANGES,
  type ChangeData,
  type ChangeInsight,
  type ChartRangeKey,
  type CostDecayRow,
  type FunnelStep,
  type HealthPoint,
  type MatrixQuad,
  type UtilBucket,
  type WhyItem,
} from "@/lib/change-types";
import { db } from "@/lib/db";
import { computeAssetMetrics } from "@/lib/metrics";

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
  const prevStart = addDays(windowStart, -range.days);
  for (const asset of allAssets) {
    for (const e of eventsByAsset.get(asset.id) ?? []) {
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

  return {
    rangeKey: range.key,
    windowStart,
    windowEnd: asOf,
    rangeLabel: range.label,
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
    decay: buildDecay(nowSnaps),
    utilization: buildUtilization(nowSnaps),
    matrix: buildMatrix(nowSnaps),
    funnel: buildFunnel(allAssets, eventsByAsset, nowSnaps, windowStart, asOf),
  };
}
