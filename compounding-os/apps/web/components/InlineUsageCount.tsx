"use client";

import { todayIso } from "@compos/core";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * 列表页里的「直接改使用次数」——不用跳详情页。
 * 语义是「自购入/开始使用至今，一共用了几次」，所以 periodDays 传的是完整持有天数。
 * 提交后写一条 usage_calibrated 事件，来源标记为 measured。
 */
export function InlineUsageCount({
  assetId,
  periodDays,
  initialCount,
}: {
  assetId: string;
  periodDays: number;
  initialCount: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(String(initialCount));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function commit(next: number) {
    const count = Math.round(next);
    if (!Number.isFinite(count) || count < 0) {
      setError("次数无效");
      setValue(String(initialCount));
      return;
    }
    setValue(String(count));
    if (count === initialCount) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/assets/${assetId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "usage_calibrated",
          occurredAt: todayIso(),
          payload: { periodDays: Math.max(periodDays, 1), count },
        }),
      });
      if (!res.ok) throw new Error("保存失败");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
      setValue(String(initialCount));
    } finally {
      setPending(false);
    }
  }

  const current = Number(value);
  const numeric = Number.isFinite(current) ? current : initialCount;

  return (
    <div className="mt-2 flex items-center justify-end gap-1.5" onClick={(e) => e.preventDefault()}>
      <span className="text-[11px] text-ink-soft">已用</span>
      <div className="inline-flex items-center overflow-hidden rounded-full border border-line bg-paper">
        <button
          type="button"
          aria-label="减少一次"
          disabled={pending || numeric <= 0}
          onClick={() => commit(Math.max(0, numeric - 1))}
          className="px-2 py-0.5 text-sm leading-none text-ink-soft hover:bg-brand-muted disabled:opacity-40"
        >
          −
        </button>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={value}
          disabled={pending}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => commit(Number(value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="w-9 border-x border-line bg-transparent px-0.5 py-0.5 text-center text-xs tabular-nums outline-none disabled:opacity-50"
        />
        <button
          type="button"
          aria-label="增加一次"
          disabled={pending}
          onClick={() => commit(numeric + 1)}
          className="px-2 py-0.5 text-sm leading-none text-ink-soft hover:bg-brand-muted disabled:opacity-40"
        >
          +
        </button>
      </div>
      <span className="text-[11px] text-ink-soft">次{pending ? "…" : ""}</span>
      {error && <span className="text-[11px] text-ink-soft">{error}</span>}
    </div>
  );
}
