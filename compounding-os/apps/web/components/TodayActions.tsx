"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { RitualOptionAsset } from "@/lib/today-types";

type Sheet = "depleted" | "disposed" | "calibrate" | null;

export function TodayActions({ assets }: { assets: RitualOptionAsset[] }) {
  const router = useRouter();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pool =
    sheet === "depleted" ? assets.filter((a) => a.kind === "consumable") : assets;
  const filtered = pool.filter(
    (a) => !query || a.name.includes(query) || a.category.includes(query),
  );

  function close() {
    setSheet(null);
    setQuery("");
    setError(null);
  }

  async function postClean(assetId: string, action: "depleted" | "disposed") {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/life-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "clean", assetId, action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message ?? "记录失败");
      close();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "记录失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold">今天发生了什么？</h2>
      <p className="mt-1 text-xs text-ink-soft">估算优先。只在真正发生变化时点一下。</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => router.push("/assets/new")}
          className="rounded-2xl bg-brand px-3 py-3 text-left text-sm font-semibold"
        >
          + 买了
        </button>
        <button
          type="button"
          onClick={() => setSheet("depleted")}
          className="rounded-2xl bg-brand-muted/70 px-3 py-3 text-left text-sm font-semibold hover:bg-brand-muted"
        >
          + 用完了
        </button>
        <button
          type="button"
          onClick={() => setSheet("disposed")}
          className="rounded-2xl bg-brand-muted/70 px-3 py-3 text-left text-sm font-semibold hover:bg-brand-muted"
        >
          + 处置了
        </button>
        <button
          type="button"
          onClick={() => setSheet("calibrate")}
          className="rounded-2xl bg-brand-muted/70 px-3 py-3 text-left text-sm font-semibold hover:bg-brand-muted"
        >
          + 校准
        </button>
      </div>

      {sheet && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/30 p-3 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-card p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">
                {sheet === "depleted" ? "哪件用完了" : sheet === "disposed" ? "处置了哪件" : "校准哪件"}
              </h3>
              <button type="button" className="text-sm text-ink-soft" onClick={close}>
                取消
              </button>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索资产"
              className="mb-3 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none"
            />
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {filtered.length === 0 && <p className="py-6 text-center text-sm text-ink-soft">没有可选项</p>}
              {filtered.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (sheet === "calibrate") {
                      close();
                      router.push(`/assets/${a.id}`);
                      return;
                    }
                    postClean(a.id, sheet);
                  }}
                  className="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left hover:bg-brand-muted"
                >
                  <span className="text-sm font-medium">{a.name}</span>
                  <span className="text-xs text-ink-soft">{a.category}</span>
                </button>
              ))}
            </div>
            {error && <p className="mt-3 text-xs text-ink-soft">{error}</p>}
          </div>
        </div>
      )}
    </section>
  );
}
