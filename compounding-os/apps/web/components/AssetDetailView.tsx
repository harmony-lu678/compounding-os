"use client";

import {
  CAPTURE_MODE_HINT,
  CAPTURE_MODE_LABEL,
  SEASONALITIES,
  SEASONALITY_LABEL,
  todayIso,
  type CaptureMode,
  type Seasonality,
} from "@compos/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CategoryIcon } from "@/components/category";
import type { AssetInsight } from "@/lib/asset-insight";

const BUCKETS = [
  { label: "0–3", count: 2 },
  { label: "4–7", count: 5 },
  { label: "8–15", count: 11 },
  { label: "16–25", count: 20 },
  { label: "25+", count: 30 },
] as const;

const INTENTS = [
  { key: "continue", label: "继续使用" },
  { key: "replace", label: "到期更换" },
  { key: "sell", label: "准备出售" },
] as const;

async function postEvent(assetId: string, type: string, payload: unknown) {
  const res = await fetch(`/api/v1/assets/${assetId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, occurredAt: todayIso(), payload }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.error?.message ?? "保存失败");
  }
}

export function AssetDetailView({ data }: { data: AssetInsight }) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [capture, setCapture] = useState<CaptureMode>(data.captureMode);
  const [season, setSeason] = useState<Seasonality>(data.seasonality);
  const [intent, setIntent] = useState(data.plan?.intent ?? "continue");
  const [windowStart, setWindowStart] = useState(data.plan?.windowStart ?? "");
  const [windowEnd, setWindowEnd] = useState(data.plan?.windowEnd ?? "");
  const [replaceCost, setReplaceCost] = useState(String(Math.round(data.plan?.replaceCostYuan ?? 0)));
  const [triggerYears, setTriggerYears] = useState(data.plan?.triggerYears ?? "");
  const [triggerMaintPct, setTriggerMaintPct] = useState(data.plan?.triggerMaintPct ?? "");
  const [triggerUses, setTriggerUses] = useState(data.plan?.triggerUses ?? "");

  async function run(action: "use" | "replenish" | "observe" | "depleted" | "dismiss") {
    setError(null);
    if (action === "dismiss") {
      setDismissed(true);
      return;
    }
    if (action === "observe") {
      setSheet(true);
      return;
    }
    setPending(true);
    try {
      if (action === "use") {
        const res = await fetch("/api/v1/life-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "use", assetId: data.id }),
        });
        if (!res.ok) throw new Error("记录失败");
        setFeedback("已记下今天的使用。下一次预测会把这次算进去。");
        setDismissed(true);
      }
      if (action === "depleted") {
        await postEvent(data.id, "depleted", {});
        setFeedback("已把这一瓶记成用完。周期从估算变成了实测。");
      }
      if (action === "replenish") {
        await postEvent(data.id, "replenished", {
          previousCycleDays: data.restock?.cycleDays,
          daysLeft: data.restock?.daysLeftMin,
        });
        setFeedback("已记下这次补货时机。去记下一件时，系统会记得你通常提前几天补。");
        router.push(`/assets/new?from=${data.id}`);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setPending(false);
    }
  }

  async function patchMeta(next: { captureMode?: CaptureMode; seasonality?: Seasonality }) {
    await fetch(`/api/v1/assets/${data.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    router.refresh();
  }

  async function savePlan(nextIntent: string) {
    setIntent(nextIntent);
    await fetch(`/api/v1/assets/${data.id}/plan`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: nextIntent,
        replaceCostYuan: Number(replaceCost) || 0,
        windowStart: windowStart || undefined,
        windowEnd: windowEnd || undefined,
        triggerYears,
        triggerMaintPct,
        triggerUses,
      }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start gap-3">
        <span className="icon-chip mt-1">
          <CategoryIcon category={data.category} />
        </span>
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">{data.name}</h1>
          <p className="mt-1 text-sm text-ink-soft">{data.statusLine}</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {data.priceLabel} · {data.acquiredAt}
          </p>
        </div>
      </header>

      {!dismissed && (
        <section className="brand-panel rounded-3xl px-5 py-6">
          <div className="text-xs brand-panel-muted">当前状态</div>
          <h2 className="mt-2 text-[22px] font-semibold leading-snug tracking-tight">{data.action.title}</h2>
          <p className="mt-3 text-sm leading-relaxed brand-panel-muted">{data.action.body}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              className="btn-primary rounded-2xl px-4 py-2 text-sm"
              onClick={() => run(data.action.primary.type)}
            >
              {data.action.primary.label}
            </button>
            {data.action.secondary && (
              <button
                type="button"
                disabled={pending}
                className="rounded-2xl bg-white/70 px-4 py-2 text-sm"
                onClick={() => run(data.action.secondary!.type === "observe" ? "observe" : "dismiss")}
              >
                {data.action.secondary.label}
              </button>
            )}
          </div>
        </section>
      )}

      {feedback && <p className="rounded-2xl bg-brand-muted px-4 py-3 text-sm">{feedback}</p>}
      {error && <p className="text-sm text-ink-soft">{error}</p>}

      <section className="card p-5">
        <h2 className="text-sm font-semibold">核心指标</h2>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {data.valueLabel && (
            <div>
              <div className="text-xs text-ink-soft">当前价值</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{data.valueLabel}</div>
            </div>
          )}
          <div>
            <div className="text-xs text-ink-soft">{data.costHint || "真实使用成本"}</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{data.costLabel}</div>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-soft">{data.heldLine}</p>
        {data.account && (
          <button type="button" className="mt-3 text-xs text-ink-soft hover:text-ink" onClick={() => setAccountOpen((v) => !v)}>
            {accountOpen ? "收起完整账户" : "查看完整账户"}
          </button>
        )}
        {accountOpen && data.account && (
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-ink-soft">累计投入</div>
              <div className="mt-1 font-medium">¥{data.account.investedYuan.toFixed(0)}</div>
            </div>
            <div>
              <div className="text-xs text-ink-soft">已释放成本</div>
              <div className="mt-1 font-medium">¥{data.account.releasedYuan.toFixed(0)}</div>
            </div>
            <div>
              <div className="text-xs text-ink-soft">累计使用</div>
              <div className="mt-1 font-medium">{Math.round(data.account.uses)} 次</div>
            </div>
            <div>
              <div className="text-xs text-ink-soft">已持有</div>
              <div className="mt-1 font-medium">{data.account.daysHeld} 天</div>
            </div>
          </div>
        )}
      </section>

      <section className="card space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold">使用计划</h2>
          <p className="mt-1 text-xs text-ink-soft">怎么记、什么时候用、什么时候退出。</p>
        </div>

        <div>
          <div className="text-xs text-ink-soft">记录方式</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["auto", "quick", "batch"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setCapture(item);
                  void patchMeta({ captureMode: item });
                }}
                className={`rounded-2xl px-3 py-2 text-sm ${capture === item ? "bg-brand" : "bg-paper"}`}
              >
                {CAPTURE_MODE_LABEL[item]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-soft">{CAPTURE_MODE_HINT[capture]}</p>
        </div>

        <div>
          <div className="text-xs text-ink-soft">季节</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {SEASONALITIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setSeason(item);
                  void patchMeta({ seasonality: item });
                }}
                className={`rounded-2xl px-3 py-2 text-sm ${season === item ? "bg-brand" : "bg-paper"}`}
              >
                {SEASONALITY_LABEL[item]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs text-ink-soft">当前意图</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {INTENTS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => void savePlan(item.key)}
                className={`rounded-2xl px-3 py-2 text-sm ${intent === item.key ? "bg-brand" : "bg-paper"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {intent === "replace" && (
          <div className="space-y-3 rounded-2xl bg-paper p-3">
            {data.plan?.replaceHint && <p className="text-sm">{data.plan.replaceHint}</p>}
            <label className="block text-xs text-ink-soft">
              更换窗口
              <div className="mt-1 grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={windowStart}
                  onChange={(e) => setWindowStart(e.target.value)}
                  className="rounded-xl border border-line bg-card px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={windowEnd}
                  onChange={(e) => setWindowEnd(e.target.value)}
                  className="rounded-xl border border-line bg-card px-3 py-2 text-sm"
                />
              </div>
            </label>
            <label className="block text-xs text-ink-soft">
              预算
              <input
                value={replaceCost}
                onChange={(e) => setReplaceCost(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2 text-sm"
              />
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="text-xs text-ink-soft">
                满几年
                <input value={triggerYears} onChange={(e) => setTriggerYears(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-card px-2 py-2 text-sm" />
              </label>
              <label className="text-xs text-ink-soft">
                维修/购价
                <input value={triggerMaintPct} onChange={(e) => setTriggerMaintPct(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-card px-2 py-2 text-sm" />
              </label>
              <label className="text-xs text-ink-soft">
                用过几次
                <input value={triggerUses} onChange={(e) => setTriggerUses(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-card px-2 py-2 text-sm" />
              </label>
            </div>
            <button type="button" className="btn-primary rounded-2xl px-4 py-2 text-sm" onClick={() => void savePlan("replace")}>
              保存窗口
            </button>
          </div>
        )}
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold">系统学到了什么</h2>
        <p className="mt-1 text-xs text-ink-soft">
          使用频率来源
          {data.freqSource === "measured" ? "实测" : data.freqSource === "user" ? "你填写" : "类目默认"}
          · 可信度{data.freqConfidence}
          {data.calibCount ? ` · 已观察 ${data.calibCount} 次` : ""}
        </p>
        <ul className="mt-4 space-y-3">
          {data.learning.map((item) => (
            <li key={item.title}>
              <div className="text-sm font-medium">
                {item.tone === "ok" ? "✓" : "⚠"} {item.title}
              </div>
              <p className="mt-0.5 text-xs text-ink-soft">{item.body}</p>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-primary rounded-2xl px-4 py-2 text-sm" onClick={() => setSheet(true)}>
            更新资产信息
          </button>
          <button type="button" className="rounded-2xl bg-paper px-4 py-2 text-sm" onClick={() => setEventsOpen((v) => !v)}>
            {eventsOpen ? "收起事件" : "查看全部事件"}
          </button>
        </div>
        {eventsOpen && (
          <ol className="mt-4 divide-y divide-line rounded-2xl border border-line">
            {data.events.map((item) => (
              <li key={item.id} className="flex items-baseline justify-between gap-3 px-3 py-2.5 text-sm">
                <div>
                  <span className="font-medium">{item.label}</span>
                  {item.detail && <span className="ml-2 text-xs text-ink-soft">{item.detail}</span>}
                </div>
                <span className="shrink-0 text-xs text-ink-soft">{item.date}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <Link href="/assets" className="block text-center text-xs text-ink-soft hover:text-ink">
        回资产
      </Link>

      {sheet && (
        <ObserveSheet
          data={data}
          pending={pending}
          onClose={() => setSheet(false)}
          onSaved={(message) => {
            setFeedback(message);
            setSheet(false);
            router.refresh();
          }}
          setPending={setPending}
          setError={setError}
        />
      )}
    </div>
  );
}

function ObserveSheet({
  data,
  pending,
  onClose,
  onSaved,
  setPending,
  setError,
}: {
  data: AssetInsight;
  pending: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
  setPending: (v: boolean) => void;
  setError: (v: string | null) => void;
}) {
  const [count, setCount] = useState<number | null>(null);
  const [value, setValue] = useState("");
  const [maint, setMaint] = useState("");

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const parts: string[] = [];
      if (count != null) {
        await postEvent(data.id, "usage_calibrated", {
          periodDays: 30,
          count,
          oldLabel: `${data.freqSource} · 可信度${data.freqConfidence}`,
        });
        parts.push(`把最近 30 天的使用记成 ${count} 次，频率改为实测`);
      }
      if (data.kind === "durable" && value) {
        const n = Number(value);
        if (Number.isFinite(n) && n >= 0) {
          const cents = Math.round(n * 100);
          await postEvent(data.id, "valued", { valueMinCents: Math.round(cents * 0.95), valueMaxCents: Math.round(cents * 1.05) });
          parts.push(`覆盖当前估值为约 ¥${n}`);
        }
      }
      if (data.kind === "durable" && maint) {
        const n = Number(maint);
        if (Number.isFinite(n) && n > 0) {
          await postEvent(data.id, "maintenance_added", { amountCents: Math.round(n * 100) });
          parts.push(`记下维护支出 ¥${n}`);
        }
      }
      onSaved(parts.length ? `已更新：${parts.join("；")}。` : "没有新的观察。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/30 p-3 sm:items-center">
      <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-3xl bg-card p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">更新资产信息</h3>
          <button type="button" className="text-sm text-ink-soft" onClick={onClose}>
            取消
          </button>
        </div>
        <p className="text-xs text-ink-soft">你提供一个事实，系统更新假设和预测。不是打卡。</p>

        <div className="mt-4">
          <div className="text-sm font-medium">最近 30 天大概用了多少次？</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {BUCKETS.map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={() => setCount(b.count)}
                className={`rounded-2xl px-3 py-2 text-sm ${count === b.count ? "bg-brand" : "bg-paper"}`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {data.kind === "durable" && (
          <>
            <label className="mt-4 block text-sm font-medium">
              当前估值大约是多少？
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="¥"
                inputMode="decimal"
                className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm"
              />
            </label>
            <label className="mt-4 block text-sm font-medium">
              最近有维修 / 耗材支出吗？
              <input
                value={maint}
                onChange={(e) => setMaint(e.target.value)}
                placeholder="¥"
                inputMode="decimal"
                className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm"
              />
            </label>
          </>
        )}

        <button type="button" disabled={pending} className="btn-primary mt-5 w-full rounded-2xl py-2.5 text-sm" onClick={() => void submit()}>
          更新假设
        </button>
      </div>
    </div>
  );
}
