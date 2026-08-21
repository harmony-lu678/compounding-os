"use client";

import { useMemo, useState } from "react";
import { ConsumableAssetRow, DurableAssetRow } from "@/components/AssetRows";
import type { AssetSummary } from "@/lib/metrics";

type KindFilter = "all" | "durable" | "consumable";

const FILTERS: { key: KindFilter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "durable", label: "耐用品" },
  { key: "consumable", label: "消耗品" },
];

function mid(range: { min: number; max: number }) {
  return (range.min + range.max) / 2;
}

function yuan(n: number, digits = 0) {
  return n.toFixed(digits);
}

export function AssetListPanel({ assets }: { assets: AssetSummary[] }) {
  const [filter, setFilter] = useState<KindFilter>("all");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    const byKind = filter === "all" ? assets : assets.filter((asset) => asset.kind === filter);
    if (!q) return byKind;
    return byKind.filter(
      (asset) => asset.name.toLowerCase().includes(q) || asset.category.toLowerCase().includes(q),
    );
  }, [assets, filter, q]);

  const totalValue = assets.reduce((sum, asset) => {
    if (asset.metrics.kind !== "durable") return sum;
    return sum + mid(asset.metrics.durable.currentValueCents.value);
  }, 0);
  const dailyCost = assets.reduce((sum, asset) => {
    if (asset.metrics.kind === "durable") return sum + mid(asset.metrics.durable.realizedDailyCostCents.value);
    return sum + mid(asset.metrics.consumable.dailyCostCents.value);
  }, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight">资产</h1>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="card px-4 py-3">
            <div className="text-xs text-ink-soft">总资产</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">¥{yuan(totalValue / 100)}</div>
          </div>
          <div className="card px-4 py-3">
            <div className="text-xs text-ink-soft">今日成本</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">¥{yuan(dailyCost / 100, 1)}</div>
          </div>
        </div>
      </div>

      <label className="block">
        <span className="sr-only">搜索资产</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索资产"
          className="w-full rounded-2xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-brand-strong"
        />
      </label>

      <div className="inline-flex rounded-2xl bg-line/60 p-1" role="tablist" aria-label="资产类型筛选">
        {FILTERS.map(({ key, label }) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(key)}
              className={`rounded-xl px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active ? "segment-active" : "text-ink-soft hover:text-ink"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="card overflow-hidden divide-y divide-line">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-soft">
            {q ? "没有匹配的资产。" : assets.length === 0 ? "还没有录入任何资产。" : "当前筛选下没有资产。"}
          </div>
        ) : (
          filtered.map((asset) =>
            asset.kind === "durable" ? (
              <DurableAssetRow key={asset.id} asset={asset} />
            ) : (
              <ConsumableAssetRow key={asset.id} asset={asset} />
            ),
          )
        )}
      </div>
    </div>
  );
}
