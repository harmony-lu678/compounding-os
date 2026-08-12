"use client";

import { todayIso } from "@compos/core";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * 列表页里的「直接改使用次数」输入框——不用跳详情页。
 * 语义是「自购入/开始使用至今，一共用了几次」，所以 periodDays 传的是完整持有天数，
 * 而不是详情页「校准使用次数」动作里默认的最近 30 天窗口。
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

  async function commit() {
    const count = Math.round(Number(value));
    if (!Number.isFinite(count) || count < 0) {
      setError("次数无效");
      setValue(String(initialCount));
      return;
    }
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

  return (
    <div className="mt-1 flex items-center justify-end gap-1">
      <span className="text-xs text-ink-soft">已用</span>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={value}
        disabled={pending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="w-12 rounded border border-line bg-transparent px-1 py-0.5 text-right text-xs disabled:opacity-50"
      />
      <span className="text-xs text-ink-soft">次{pending ? "…" : ""}</span>
      {error && <span className="text-xs text-warn">{error}</span>}
    </div>
  );
}
