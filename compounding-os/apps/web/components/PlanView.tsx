"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PLAN_HORIZONS, type PlanHorizonKey, type PlanOverview } from "@/lib/plan-types";

function yuan(n: number, digits = 0) {
  return n.toFixed(digits);
}

export function PlanView({ data, horizon }: { data: PlanOverview; horizon: PlanHorizonKey }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");
  const [current, setCurrent] = useState("");
  const [pending, setPending] = useState(false);

  async function addReserve(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !target || !date) return;
    setPending(true);
    try {
      await fetch("/api/v1/reserves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          targetYuan: Number(target),
          targetDate: date,
          currentYuan: Number(current) || 0,
        }),
      });
      setName("");
      setTarget("");
      setDate("");
      setCurrent("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function addToReserve(id: string, amount: number) {
    const row = data.reserves.find((r) => r.id === id);
    if (!row) return;
    await fetch("/api/v1/reserves", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, currentYuan: row.currentYuan + amount }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">规划</h1>
          <p className="mt-1 text-sm text-ink-soft">在已有核算上面，看未来要准备什么。不新增一套账本。</p>
        </div>
        <Link href="/assets" className="text-xs text-ink-soft hover:text-ink">
          回资产
        </Link>
      </div>

      <div className="inline-flex rounded-2xl bg-line/60 p-1">
        {PLAN_HORIZONS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => router.push(`/plan?horizon=${item.key}`)}
            className={`rounded-xl px-3 py-1.5 text-sm ${horizon === item.key ? "segment-active" : "text-ink-soft"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="brand-panel rounded-3xl px-5 py-6">
        <div className="text-xs brand-panel-muted">未来 {data.horizonMonths} 个月</div>
        <div className="mt-2 text-[28px] font-semibold tabular-nums">¥{yuan(data.budgetYuan)}</div>
        <p className="mt-1 text-sm brand-panel-muted">资产更新预算 · 每月大约准备 ¥{yuan(data.monthlyYuan)}</p>
        <p className="mt-4 text-sm leading-relaxed">{data.insight}</p>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold">更换日历</h2>
        <p className="mt-1 text-xs text-ink-soft">窗口到了也不等于该买。点进去改计划或建储备金。</p>
        {data.replacements.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">这段时间没有进入窗口的耐用品。</p>
        ) : (
          <div className="mt-4 divide-y divide-line">
            {data.replacements.map((item) => (
              <Link key={item.id} href={`/assets/${item.id}`} className="flex items-start justify-between gap-3 py-3 hover:bg-brand-muted/40">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className="mt-0.5 text-xs text-ink-soft">
                    {item.windowStart.slice(0, 7)} ~ {item.windowEnd.slice(0, 7)} · {item.intentLabel} · 已持有 {item.daysHeld} 天
                  </div>
                </div>
                <div className="shrink-0 text-right text-sm tabular-nums">¥{yuan(item.replaceCostYuan)}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold">更新储备金</h2>
        <p className="mt-1 text-xs text-ink-soft">为未来某件东西单独存一笔。普通理财问你存多少，这里问你未来要换什么。</p>
        <div className="mt-4 space-y-3">
          {data.reserves.map((row) => (
            <div key={row.id} className="rounded-2xl bg-paper px-3 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-sm font-medium">{row.name}</div>
                <div className="text-xs text-ink-soft">{row.targetDate}</div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-line/70">
                <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, row.progress * 100)}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-ink-soft">
                <span>
                  ¥{yuan(row.currentYuan)} / ¥{yuan(row.targetYuan)} · 每月建议 ¥{yuan(row.monthlyYuan)}
                </span>
                <button type="button" className="text-ink" onClick={() => addToReserve(row.id, 100)}>
                  +100
                </button>
              </div>
            </div>
          ))}
        </div>
        <form className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" onSubmit={addReserve}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：电脑更新" className="rounded-xl border border-line bg-paper px-3 py-2 text-sm" />
          <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="目标金额" inputMode="decimal" className="rounded-xl border border-line bg-paper px-3 py-2 text-sm" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl border border-line bg-paper px-3 py-2 text-sm" />
          <input value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="已有多少" inputMode="decimal" className="rounded-xl border border-line bg-paper px-3 py-2 text-sm" />
          <button type="submit" disabled={pending} className="btn-primary col-span-2 rounded-xl py-2 text-sm sm:col-span-4">
            新建储备金
          </button>
        </form>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold">物理资产怎么配的</h2>
        <p className="mt-1 text-xs text-ink-soft">看的是现值结构，以及哪一类闲着最多。</p>
        <div className="mt-4 space-y-3">
          {data.allocation.map((slice) => (
            <div key={slice.category}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{slice.category}</span>
                <span className="tabular-nums text-ink-soft">
                  {Math.round(slice.share * 100)}% · 闲置 {Math.round(slice.idleShare * 100)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-line/70">
                <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(4, slice.share * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold">时间怎么配给能力</h2>
        <p className="mt-1 text-xs text-ink-soft">
          每周已分配 {data.weeklyHours} 小时。能力规划挂在各能力账户上，不另开技能树。
        </p>
        {data.capabilities.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">还没有能力资产。到资产 → 能力建一项。</p>
        ) : (
          <div className="mt-4 space-y-2">
            {data.capabilities.map((cap) => (
              <Link key={cap.id} href={`/skills/${cap.id}`} className="flex items-center justify-between rounded-2xl px-2 py-2 hover:bg-brand-muted/50">
                <div>
                  <div className="text-sm font-medium">{cap.name}</div>
                  <div className="text-xs text-ink-soft">
                    {cap.statusLabel} · 投入 {cap.hours}h · 应用 {cap.applications} 次
                  </div>
                </div>
                <div className="text-sm tabular-nums">{cap.weeklyHours}h / 周</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
