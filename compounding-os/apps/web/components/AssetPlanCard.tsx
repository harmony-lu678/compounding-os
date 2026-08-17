"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PLAN_INTENTS } from "@/lib/plan-types";
import type { AssetAccount } from "@/lib/plan-types";

function yuan(n: number, digits = 0) {
  return n.toFixed(digits);
}

export function AssetPlanCard({ assetId, account }: { assetId: string; account: AssetAccount }) {
  const router = useRouter();
  const [intent, setIntent] = useState(account.intent);
  const [replaceCost, setReplaceCost] = useState(String(Math.round(account.replaceCostYuan)));
  const [windowStart, setWindowStart] = useState(account.windowStart ?? "");
  const [windowEnd, setWindowEnd] = useState(account.windowEnd ?? "");
  const [triggerYears, setTriggerYears] = useState(account.triggerYears);
  const [triggerMaintPct, setTriggerMaintPct] = useState(account.triggerMaintPct);
  const [triggerUses, setTriggerUses] = useState(account.triggerUses);
  const [triggerNote, setTriggerNote] = useState(account.triggerNote);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/assets/${assetId}/plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          replaceCostYuan: Number(replaceCost) || 0,
          windowStart: windowStart || undefined,
          windowEnd: windowEnd || undefined,
          triggerYears,
          triggerMaintPct,
          triggerUses,
          triggerNote,
        }),
      });
      if (!res.ok) throw new Error("保存失败");
      setMessage("未来计划已记下。系统只给窗口，不替你决定换不换。");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "保存失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="card p-5">
        <h2 className="text-sm font-semibold">资产账户</h2>
        <p className="mt-1 text-xs text-ink-soft">不只记花了多少，也看它还剩多少未来。</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <div className="text-xs text-ink-soft">当前价值</div>
            <div className="mt-1 font-semibold tabular-nums">¥{yuan(account.currentValueYuan)}</div>
          </div>
          <div>
            <div className="text-xs text-ink-soft">累计投入</div>
            <div className="mt-1 font-semibold tabular-nums">¥{yuan(account.investedYuan)}</div>
          </div>
          <div>
            <div className="text-xs text-ink-soft">累计使用</div>
            <div className="mt-1 font-semibold tabular-nums">{Math.round(account.uses)} 次</div>
          </div>
          <div>
            <div className="text-xs text-ink-soft">已释放成本</div>
            <div className="mt-1 font-semibold tabular-nums">¥{yuan(account.releasedYuan)}</div>
          </div>
          <div>
            <div className="text-xs text-ink-soft">已持有</div>
            <div className="mt-1 font-semibold tabular-nums">{account.daysHeld} 天</div>
          </div>
          <div>
            <div className="text-xs text-ink-soft">预计剩余寿命</div>
            <div className="mt-1 font-semibold tabular-nums">
              {account.remainingYears == null ? "—" : `${account.remainingYears.toFixed(1)} 年`}
            </div>
          </div>
        </div>
      </div>

      <form className="card space-y-4 p-5" onSubmit={save}>
        <div>
          <h2 className="text-sm font-semibold">未来计划</h2>
          <p className="mt-1 text-xs text-ink-soft">建立一个更换窗口，而不是一条「该换了」。</p>
        </div>
        {account.replaceHint && <p className="rounded-2xl bg-brand-muted px-3 py-2 text-sm">{account.replaceHint}</p>}
        <div className="grid grid-cols-2 gap-2">
          {PLAN_INTENTS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setIntent(item.key)}
              className={`rounded-2xl px-3 py-2 text-sm ${intent === item.key ? "bg-brand" : "bg-paper"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="block text-xs text-ink-soft">
          预计更换窗口
          <div className="mt-1 grid grid-cols-2 gap-2">
            <input type="date" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} className="rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink" />
            <input type="date" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} className="rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink" />
          </div>
        </label>
        <label className="block text-xs text-ink-soft">
          若更换，大概要准备多少钱
          <input
            value={replaceCost}
            onChange={(e) => setReplaceCost(e.target.value)}
            inputMode="decimal"
            className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink"
          />
        </label>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs text-ink-soft">
            用满几年再看
            <input value={triggerYears} onChange={(e) => setTriggerYears(e.target.value)} placeholder="4" className="mt-1 w-full rounded-xl border border-line bg-paper px-2 py-2 text-sm text-ink" />
          </label>
          <label className="text-xs text-ink-soft">
            维修超过购价%
            <input value={triggerMaintPct} onChange={(e) => setTriggerMaintPct(e.target.value)} placeholder="0.3" className="mt-1 w-full rounded-xl border border-line bg-paper px-2 py-2 text-sm text-ink" />
          </label>
          <label className="text-xs text-ink-soft">
            用过多少次再看
            <input value={triggerUses} onChange={(e) => setTriggerUses(e.target.value)} placeholder="5000" className="mt-1 w-full rounded-xl border border-line bg-paper px-2 py-2 text-sm text-ink" />
          </label>
        </div>
        <label className="block text-xs text-ink-soft">
          主观触发（工作需求变了也可以写）
          <input
            value={triggerNote}
            onChange={(e) => setTriggerNote(e.target.value)}
            placeholder="例如：开始做视频，现有机器吃力"
            className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink"
          />
        </label>
        {account.maintYuan > 0 && <p className="text-xs text-ink-soft">已记维护 ¥{yuan(account.maintYuan)}</p>}
        <button type="submit" disabled={pending} className="btn-primary rounded-2xl px-4 py-2 text-sm">
          保存计划
        </button>
        {message && <p className="text-xs text-ink-soft">{message}</p>}
      </form>
    </section>
  );
}
