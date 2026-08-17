"use client";

import { FREQ_TIERS, todayIso, type FreqTier } from "@compos/core";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Kind = "durable" | "consumable";

async function postEvent(assetId: string, type: string, occurredAt: string, payload: unknown) {
  const res = await fetch(`/api/v1/assets/${assetId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, occurredAt, payload }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? "操作失败");
  }
}

function ActionShell({
  title,
  children,
}: {
  title: string;
  children: (opts: { close: () => void }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-brand hover:text-brand"
      >
        {title}
      </button>
    );
  }
  return (
    <div className="card w-full p-4 sm:w-80">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium">{title}</div>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-ink-soft">
          取消
        </button>
      </div>
      {children({ close: () => setOpen(false) })}
    </div>
  );
}

function SubmitRow({ error, pending }: { error: string | null; pending: boolean }) {
  return (
    <div className="mt-3 flex items-center justify-between">
      {error ? <span className="text-xs text-ink-soft">{error}</span> : <span />}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
      >
        {pending ? "保存中…" : "保存"}
      </button>
    </div>
  );
}

export function CalibrateUsageCountAction({
  assetId,
  defaultPeriodDays = 30,
}: {
  assetId: string;
  defaultPeriodDays?: number;
}) {
  const router = useRouter();
  const [periodDays, setPeriodDays] = useState(String(defaultPeriodDays));
  const [count, setCount] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const periodDaysNum = Number(periodDays);
  const countNum = Number(count);
  const perMonthPreview =
    count !== "" && Number.isFinite(periodDaysNum) && periodDaysNum > 0 && Number.isFinite(countNum)
      ? Math.round((countNum / periodDaysNum) * 30 * 10) / 10
      : null;

  async function onSubmit(e: FormEvent, close: () => void) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (!Number.isFinite(periodDaysNum) || periodDaysNum <= 0) throw new Error("请填写有效的天数");
      if (!Number.isFinite(countNum) || countNum < 0) throw new Error("请填写有效的次数");
      await postEvent(assetId, "usage_calibrated", todayIso(), { periodDays: periodDaysNum, count: countNum });
      close();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <ActionShell title="校准使用次数">
      {({ close }) => (
        <form onSubmit={(e) => onSubmit(e, close)} className="space-y-2">
          <p className="text-xs text-ink-soft">回想一下实际用得多少，比选档位更准，会标记为「实测」并覆盖之前的频率假设。</p>
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-xs text-ink-soft">最近</span>
            <input
              value={periodDays}
              onChange={(e) => setPeriodDays(e.target.value)}
              className="w-16 rounded-md border border-line bg-transparent px-2 py-1.5 text-sm"
            />
            <span className="whitespace-nowrap text-xs text-ink-soft">天，用了</span>
            <input
              value={count}
              onChange={(e) => setCount(e.target.value)}
              placeholder="次数"
              className="w-16 rounded-md border border-line bg-transparent px-2 py-1.5 text-sm"
            />
            <span className="whitespace-nowrap text-xs text-ink-soft">次</span>
          </div>
          {perMonthPreview !== null && (
            <p className="text-xs text-ink-soft">≈ 每月 {perMonthPreview} 次</p>
          )}
          <SubmitRow error={error} pending={pending} />
        </form>
      )}
    </ActionShell>
  );
}

export function CalibrateFrequencyAction({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [tier, setTier] = useState<FreqTier>("weekly_few");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent, close: () => void) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await postEvent(assetId, "assumption_changed", todayIso(), {
        field: "usageFrequency",
        newValue: { type: "tier", tier },
      });
      close();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <ActionShell title="校准使用频率">
      {({ close }) => (
        <form onSubmit={(e) => onSubmit(e, close)}>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as FreqTier)}
            className="w-full rounded-md border border-line bg-transparent px-2 py-1.5 text-sm"
          >
            {Object.entries(FREQ_TIERS).map(([key, def]) => (
              <option key={key} value={key}>
                {def.label}（{def.min}~{def.max} 次/月）
              </option>
            ))}
          </select>
          <SubmitRow error={error} pending={pending} />
        </form>
      )}
    </ActionShell>
  );
}

type SeasonPreset = "all_year" | "spring_autumn" | "summer" | "winter" | "custom";

const SEASON_PRESETS: { key: SeasonPreset; label: string; months: number | null }[] = [
  { key: "all_year", label: "全年皆可穿/用", months: 12 },
  { key: "spring_autumn", label: "春秋两季（约4个月）", months: 4 },
  { key: "summer", label: "夏季专属（约3个月）", months: 3 },
  { key: "winter", label: "冬季专属（约3个月）", months: 3 },
  { key: "custom", label: "自定义月数", months: null },
];

export function CalibrateSeasonAction({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [preset, setPreset] = useState<SeasonPreset>("winter");
  const [customMonths, setCustomMonths] = useState("3");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const months = preset === "custom" ? Number(customMonths) : SEASON_PRESETS.find((p) => p.key === preset)!.months!;

  async function onSubmit(e: FormEvent, close: () => void) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (!Number.isFinite(months) || months < 1 || months > 12) throw new Error("请填写 1~12 之间的月数");
      await postEvent(assetId, "assumption_changed", todayIso(), {
        field: "activeMonthsPerYear",
        newValue: months,
      });
      close();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <ActionShell title="校准季节性">
      {({ close }) => (
        <form onSubmit={(e) => onSubmit(e, close)} className="space-y-2">
          <p className="text-xs text-ink-soft">
            衣物/床品因地制宜——只影响估算使用次数/单次成本，不影响按日历天数算的持有成本。
          </p>
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as SeasonPreset)}
            className="w-full rounded-md border border-line bg-transparent px-2 py-1.5 text-sm"
          >
            {SEASON_PRESETS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
          {preset === "custom" && (
            <input
              value={customMonths}
              onChange={(e) => setCustomMonths(e.target.value)}
              placeholder="月数（1~12）"
              className="w-full rounded-md border border-line bg-transparent px-2 py-1.5 text-sm"
            />
          )}
          <SubmitRow error={error} pending={pending} />
        </form>
      )}
    </ActionShell>
  );
}

export function AddValuationAction({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent, close: () => void) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const minCents = Math.round(Number(min) * 100);
      const maxCents = Math.round(Number(max) * 100);
      if (!Number.isFinite(minCents) || !Number.isFinite(maxCents) || maxCents < minCents) {
        throw new Error("请填写有效的估值区间");
      }
      await postEvent(assetId, "valued", todayIso(), {
        valueMinCents: minCents,
        valueMaxCents: maxCents,
        sourceNote: note || undefined,
      });
      close();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <ActionShell title="记录估值">
      {({ close }) => (
        <form onSubmit={(e) => onSubmit(e, close)} className="space-y-2">
          <div className="flex gap-2">
            <input
              value={min}
              onChange={(e) => setMin(e.target.value)}
              placeholder="最低估值 ¥"
              className="w-1/2 rounded-md border border-line bg-transparent px-2 py-1.5 text-sm"
            />
            <input
              value={max}
              onChange={(e) => setMax(e.target.value)}
              placeholder="最高估值 ¥"
              className="w-1/2 rounded-md border border-line bg-transparent px-2 py-1.5 text-sm"
            />
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="来源说明（如：闲鱼同型号在售价）"
            className="w-full rounded-md border border-line bg-transparent px-2 py-1.5 text-sm"
          />
          <SubmitRow error={error} pending={pending} />
        </form>
      )}
    </ActionShell>
  );
}

export function AddMaintenanceAction({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent, close: () => void) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const amountCents = Math.round(Number(amount) * 100);
      if (!Number.isFinite(amountCents) || amountCents < 0) throw new Error("请填写有效金额");
      await postEvent(assetId, "maintenance_added", todayIso(), { amountCents, note: note || undefined });
      close();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <ActionShell title="记录维护/耗材支出">
      {({ close }) => (
        <form onSubmit={(e) => onSubmit(e, close)} className="space-y-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="金额 ¥"
            className="w-full rounded-md border border-line bg-transparent px-2 py-1.5 text-sm"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="说明（如：换电池）"
            className="w-full rounded-md border border-line bg-transparent px-2 py-1.5 text-sm"
          />
          <SubmitRow error={error} pending={pending} />
        </form>
      )}
    </ActionShell>
  );
}

export function DisposeAction({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [method, setMethod] = useState<"sold" | "discarded" | "given_away">("sold");
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent, close: () => void) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const disposalValueCents = value ? Math.round(Number(value) * 100) : 0;
      await postEvent(assetId, "disposed", todayIso(), { method, disposalValueCents });
      close();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <ActionShell title="处置（卖出/报废）">
      {({ close }) => (
        <form onSubmit={(e) => onSubmit(e, close)} className="space-y-2">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as typeof method)}
            className="w-full rounded-md border border-line bg-transparent px-2 py-1.5 text-sm"
          >
            <option value="sold">卖出</option>
            <option value="discarded">报废</option>
            <option value="given_away">送出</option>
          </select>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="实际处置价 ¥（报废/送出填 0）"
            className="w-full rounded-md border border-line bg-transparent px-2 py-1.5 text-sm"
          />
          <SubmitRow error={error} pending={pending} />
        </form>
      )}
    </ActionShell>
  );
}

export function MarkDepletedAction({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onClick() {
    setPending(true);
    setError(null);
    try {
      await postEvent(assetId, "depleted", todayIso(), {});
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <a href="/assets/new" className="rounded-full border border-accent px-3 py-1.5 text-xs font-medium text-accent">
        已标记用完 · 去录入下一瓶 →
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-full btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
      >
        {pending ? "保存中…" : "用完了"}
      </button>
      {error && <span className="text-xs text-ink-soft">{error}</span>}
    </div>
  );
}

/** 衣物/床品有明显季节性，其他类目基本全年都用得到，所以季节性校准只在这两类下出现。 */
const SEASONAL_CATEGORIES = new Set(["衣物", "床品"]);

export function AssetActions({
  kind,
  status,
  assetId,
  heldDays,
  category,
}: {
  kind: Kind;
  status: string;
  assetId: string;
  /** 已持有/已开始使用的天数，用于给「校准使用次数」预填一个合理的默认周期 */
  heldDays?: number;
  /** 用于判断是否展示「校准季节性」——只在衣物/床品下出现 */
  category?: string;
}) {
  if (status !== "active") {
    return <p className="text-xs text-ink-soft">该资产已结束生命周期，不再可操作。</p>;
  }
  const defaultPeriodDays = heldDays ? Math.max(Math.min(heldDays, 30), 1) : 30;
  return (
    <div className="flex flex-wrap items-start gap-2">
      {kind === "durable" && (
        <>
          <CalibrateUsageCountAction assetId={assetId} defaultPeriodDays={defaultPeriodDays} />
          <CalibrateFrequencyAction assetId={assetId} />
          {category && SEASONAL_CATEGORIES.has(category) && <CalibrateSeasonAction assetId={assetId} />}
          <AddValuationAction assetId={assetId} />
          <AddMaintenanceAction assetId={assetId} />
          <DisposeAction assetId={assetId} />
        </>
      )}
      {kind === "consumable" && (
        <>
          <CalibrateUsageCountAction assetId={assetId} defaultPeriodDays={defaultPeriodDays} />
          <CalibrateFrequencyAction assetId={assetId} />
          <MarkDepletedAction assetId={assetId} />
        </>
      )}
    </div>
  );
}
