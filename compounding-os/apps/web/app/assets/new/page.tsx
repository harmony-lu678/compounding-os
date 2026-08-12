"use client";

import {
  CONSUMABLE_SUBCATEGORY_DEFAULTS,
  DURABLE_CATEGORY_DEFAULTS,
  FREQ_TIERS,
  getConsumableDefault,
  getDurableDefault,
  todayIso,
  type FreqTier,
} from "@compos/core";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const DURABLE_CATEGORIES = Object.keys(DURABLE_CATEGORY_DEFAULTS);
const CONSUMABLE_SUBCATEGORIES = Object.entries(CONSUMABLE_SUBCATEGORY_DEFAULTS);

/** 衣物/床品有明显季节性，其他类目基本全年都用得到，所以季节性选择器只在这两类下出现。 */
const SEASONAL_CATEGORIES = new Set(["衣物", "床品"]);

type SeasonPreset = "all_year" | "spring_autumn" | "summer" | "winter" | "custom";

/**
 * 月数只是默认参考值——因地制宜，具体几个月由用户自己判断
 * （比如南方的冬天可能比北方短，选「自定义」直接填月数即可）。
 */
const SEASON_PRESETS: { key: SeasonPreset; label: string; months: number | null }[] = [
  { key: "all_year", label: "全年皆可穿/用", months: 12 },
  { key: "spring_autumn", label: "春秋两季（约4个月）", months: 4 },
  { key: "summer", label: "夏季专属（约3个月）", months: 3 },
  { key: "winter", label: "冬季专属（约3个月）", months: 3 },
  { key: "custom", label: "自定义月数", months: null },
];

export default function NewAssetPage() {
  const router = useRouter();
  const [kind, setKind] = useState<"durable" | "consumable">("durable");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [occurredAt, setOccurredAt] = useState(todayIso());
  const [category, setCategory] = useState(DURABLE_CATEGORIES[0]!);
  const [freqTier, setFreqTier] = useState<FreqTier>(getDurableDefault(DURABLE_CATEGORIES[0]!).defaultFreqTier);
  const [subcategory, setSubcategory] = useState<string>("");
  const [consumableFreqTier, setConsumableFreqTier] = useState<FreqTier>(
    getConsumableDefault(undefined).defaultFreqTier,
  );
  const [seasonPreset, setSeasonPreset] = useState<SeasonPreset>("all_year");
  const [customSeasonMonths, setCustomSeasonMonths] = useState("6");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSeasonalCategory = SEASONAL_CATEGORIES.has(category);
  const activeMonthsPerYear =
    seasonPreset === "custom"
      ? Number(customSeasonMonths)
      : SEASON_PRESETS.find((p) => p.key === seasonPreset)!.months!;

  function onCategoryChange(next: string) {
    setCategory(next);
    setFreqTier(getDurableDefault(next).defaultFreqTier);
    if (!SEASONAL_CATEGORIES.has(next)) setSeasonPreset("all_year");
  }

  function onSubcategoryChange(next: string) {
    setSubcategory(next);
    setConsumableFreqTier(getConsumableDefault(next || undefined).defaultFreqTier);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const priceCents = Math.round(Number(price) * 100);
      if (!Number.isFinite(priceCents) || priceCents <= 0) throw new Error("请填写有效的价格");
      if (!name.trim()) throw new Error("请填写名称");
      if (kind === "durable" && isSeasonalCategory && (!Number.isFinite(activeMonthsPerYear) || activeMonthsPerYear < 1)) {
        throw new Error("请填写有效的季节性月数（1~12）");
      }

      const payload =
        kind === "durable"
          ? (() => {
              const def = getDurableDefault(category);
              return {
                kind: "durable" as const,
                category,
                priceCents,
                lifespanMonths: def.lifespanMonths,
                residualRateMin: def.residualRateMin,
                residualRateMax: def.residualRateMax,
                usageFrequency: { type: "tier" as const, tier: freqTier },
                ...(isSeasonalCategory ? { activeMonthsPerYear } : {}),
                sources: {
                  lifespanMonths: "category_default",
                  residualRate: "category_default",
                  usageFrequency: "category_default",
                  ...(isSeasonalCategory ? { activeMonthsPerYear: "user" as const } : {}),
                },
              };
            })()
          : {
              kind: "consumable" as const,
              category: "消耗品",
              subcategory: subcategory || undefined,
              priceCents,
              startDate: occurredAt,
              usageFrequency: { type: "tier" as const, tier: consumableFreqTier },
            };

      const res = await fetch("/api/v1/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), occurredAt, payload }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "创建失败");
      }
      const { asset } = await res.json();
      router.push(`/assets/${asset.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-lg font-semibold">录入资产</h1>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setKind("durable")}
          className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
            kind === "durable" ? "border-accent bg-accent/10 text-accent" : "border-line text-ink-soft"
          }`}
        >
          耐用品
        </button>
        <button
          type="button"
          onClick={() => setKind("consumable")}
          className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
            kind === "consumable" ? "border-accent bg-accent/10 text-accent" : "border-line text-ink-soft"
          }`}
        >
          消耗品
        </button>
      </div>

      <form onSubmit={onSubmit} className="card space-y-4 p-5">
        <div>
          <label className="mb-1 block text-xs text-ink-soft">名称</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：MacBook Air m3 13寸"
            className="w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-ink-soft">价格 ¥</label>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-ink-soft">购入日期</label>
            <input
              type="date"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm"
            />
          </div>
        </div>

        {kind === "durable" ? (
          <>
            <div>
              <label className="mb-1 block text-xs text-ink-soft">类目</label>
              <select
                value={category}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm"
              >
                {DURABLE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-soft">使用频率（不确定就先选一个大概的，之后可校准）</label>
              <select
                value={freqTier}
                onChange={(e) => setFreqTier(e.target.value as FreqTier)}
                className="w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm"
              >
                {Object.entries(FREQ_TIERS).map(([key, def]) => (
                  <option key={key} value={key}>
                    {def.label}（{def.min}~{def.max} 次/月）
                  </option>
                ))}
              </select>
            </div>
            {isSeasonalCategory && (
              <div>
                <label className="mb-1 block text-xs text-ink-soft">
                  季节性（一年大概几个月会用到，因地制宜自己判断）
                </label>
                <select
                  value={seasonPreset}
                  onChange={(e) => setSeasonPreset(e.target.value as SeasonPreset)}
                  className="w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm"
                >
                  {SEASON_PRESETS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
                {seasonPreset === "custom" && (
                  <input
                    value={customSeasonMonths}
                    onChange={(e) => setCustomSeasonMonths(e.target.value)}
                    placeholder="月数（1~12）"
                    className="mt-2 w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm"
                  />
                )}
                <p className="mt-1 text-xs text-ink-soft">
                  只影响单次成本的估算窗口，不影响持有成本/折旧——衣柜里放着不穿也会自然老化。
                </p>
              </div>
            )}
            <p className="text-xs text-ink-soft">
              预计寿命 / 残值率将按「{category}」类目默认值预填，创建后可在详情页点开假设修改。
            </p>
          </>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-xs text-ink-soft">子类目（用于预估消耗周期，可不选）</label>
              <select
                value={subcategory}
                onChange={(e) => onSubcategoryChange(e.target.value)}
                className="w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm"
              >
                <option value="">不确定（用通用默认）</option>
                {CONSUMABLE_SUBCATEGORIES.map(([key, def]) => (
                  <option key={key} value={key}>
                    {def.label}（{def.cycleDaysMin}~{def.cycleDaysMax} 天 · 按{def.costMetric === "daily" ? "天" : "次"}计成本）
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-soft">
                预估使用频率（用于折算单次成本，不确定就先选一个大概的，之后可校准）
              </label>
              <select
                value={consumableFreqTier}
                onChange={(e) => setConsumableFreqTier(e.target.value as FreqTier)}
                className="w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm"
              >
                {Object.entries(FREQ_TIERS).map(([key, def]) => (
                  <option key={key} value={key}>
                    {def.label}（{def.min}~{def.max} 次/月）
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {error && <p className="text-xs text-warn">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-accent py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "保存中…" : "保存"}
        </button>
      </form>
    </div>
  );
}
