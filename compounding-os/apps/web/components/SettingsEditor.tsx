"use client";

import {
  CONSUMABLE_SUBCATEGORY_DEFAULTS,
  DURABLE_CATEGORY_DEFAULTS,
  FREQ_TIERS,
  type ConsumableSubcategoryDefault,
  type DurableCategoryDefault,
  type FreqTier,
} from "@compos/core";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CategoryDefaults } from "@/lib/category-settings";

function midFreq(tier: FreqTier): number {
  const range = FREQ_TIERS[tier];
  return (range.min + range.max) / 2;
}

function Field({
  value,
  onChange,
  type = "text",
  step,
  min,
}: {
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  step?: string;
  min?: string;
}) {
  return (
    <input
      type={type}
      step={step}
      min={min}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full min-w-[4.5rem] rounded-lg border border-line bg-paper px-2 py-1 text-xs outline-none"
    />
  );
}

function FreqSelect({ value, onChange }: { value: FreqTier; onChange: (value: FreqTier) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as FreqTier)}
      className="w-full rounded-lg border border-line bg-paper px-2 py-1 text-xs"
    >
      {Object.entries(FREQ_TIERS).map(([key, def]) => (
        <option key={key} value={key}>
          {def.label}
        </option>
      ))}
    </select>
  );
}

function MetricSelect({
  value,
  onChange,
}: {
  value: "daily" | "per_use";
  onChange: (value: "daily" | "per_use") => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as "daily" | "per_use")}
      className="w-full rounded-lg border border-line bg-paper px-2 py-1 text-xs"
    >
      <option value="daily">按天</option>
      <option value="per_use">按次</option>
    </select>
  );
}

export function SettingsEditor({ initial }: { initial: CategoryDefaults }) {
  const router = useRouter();
  const [durable, setDurable] = useState(initial.durable);
  const [consumable, setConsumable] = useState(initial.consumable);
  const [newDurable, setNewDurable] = useState("");
  const [newConsumable, setNewConsumable] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function patchDurable(key: string, next: DurableCategoryDefault) {
    setDurable((prev) => ({ ...prev, [key]: next }));
  }

  function patchConsumable(key: string, next: ConsumableSubcategoryDefault) {
    setConsumable((prev) => ({ ...prev, [key]: next }));
  }

  async function save() {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durable, consumable }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message ?? "保存失败");
      setMessage("已保存。之后新记的资产会按这套默认值算。");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "保存失败");
    } finally {
      setPending(false);
    }
  }

  function resetFactory() {
    setDurable({ ...DURABLE_CATEGORY_DEFAULTS });
    setConsumable({ ...CONSUMABLE_SUBCATEGORY_DEFAULTS });
    setMessage("已恢复出厂默认，点保存才会生效。");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={pending} onClick={save} className="btn-primary rounded-xl px-4 py-2 text-sm">
          保存设定
        </button>
        <button type="button" disabled={pending} onClick={resetFactory} className="btn-secondary rounded-xl px-4 py-2 text-sm">
          恢复出厂默认
        </button>
        {message && <p className="text-xs text-ink-soft">{message}</p>}
      </div>

      <section className="card overflow-x-auto p-5">
        <h2 className="mb-1 text-sm font-medium">耐用品类目</h2>
        <p className="mb-3 text-xs text-ink-soft">改寿命、残值、默认频率。已单独校准过的资产不会被改掉。</p>
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="text-ink-soft">
            <tr>
              <th className="py-1 pr-2">类目</th>
              <th className="py-1 pr-2">寿命（年）</th>
              <th className="py-1 pr-2">残值% 低</th>
              <th className="py-1 pr-2">残值% 高</th>
              <th className="py-1 pr-2">默认频率</th>
              <th className="py-1">计费</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {Object.entries(durable).map(([key, def]) => (
              <tr key={key}>
                <td className="py-2 pr-2 font-medium">{def.label || key}</td>
                <td className="py-2 pr-2">
                  <Field
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={(def.lifespanMonths / 12).toFixed(1)}
                    onChange={(v) =>
                      patchDurable(key, { ...def, lifespanMonths: Math.max(1, Math.round(Number(v) * 12)) })
                    }
                  />
                </td>
                <td className="py-2 pr-2">
                  <Field
                    type="number"
                    min="0"
                    value={Math.round(def.residualRateMin * 100)}
                    onChange={(v) => patchDurable(key, { ...def, residualRateMin: Math.max(0, Number(v) / 100) })}
                  />
                </td>
                <td className="py-2 pr-2">
                  <Field
                    type="number"
                    min="0"
                    value={Math.round(def.residualRateMax * 100)}
                    onChange={(v) => patchDurable(key, { ...def, residualRateMax: Math.max(0, Number(v) / 100) })}
                  />
                </td>
                <td className="py-2 pr-2">
                  <FreqSelect
                    value={def.defaultFreqTier}
                    onChange={(tier) =>
                      patchDurable(key, { ...def, defaultFreqTier: tier, referenceFreqPerMonth: midFreq(tier) })
                    }
                  />
                </td>
                <td className="py-2">
                  <MetricSelect value={def.costMetric} onChange={(costMetric) => patchDurable(key, { ...def, costMetric })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const name = newDurable.trim();
            if (!name || durable[name]) return;
            setDurable((prev) => ({
              ...prev,
              [name]: {
                label: name,
                lifespanMonths: 36,
                residualRateMin: 0.02,
                residualRateMax: 0.1,
                defaultFreqTier: "weekly_few",
                referenceFreqPerMonth: midFreq("weekly_few"),
                costMetric: "per_use",
              },
            }));
            setNewDurable("");
          }}
        >
          <input
            value={newDurable}
            onChange={(e) => setNewDurable(e.target.value)}
            placeholder="新类目，如 乐器"
            className="flex-1 rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none"
          />
          <button type="submit" className="btn-secondary rounded-xl px-3 text-sm">
            加上这类
          </button>
        </form>
      </section>

      <section className="card overflow-x-auto p-5">
        <h2 className="mb-1 text-sm font-medium">消耗品子类目</h2>
        <p className="mb-3 text-xs text-ink-soft">改预估用完天数和默认频率。用完过的资产按实测，不受这里影响。</p>
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead className="text-ink-soft">
            <tr>
              <th className="py-1 pr-2">子类目</th>
              <th className="py-1 pr-2">周期最短（天）</th>
              <th className="py-1 pr-2">周期最长（天）</th>
              <th className="py-1 pr-2">默认频率</th>
              <th className="py-1">计费</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {Object.entries(consumable).map(([key, def]) => (
              <tr key={key}>
                <td className="py-2 pr-2 font-medium">{def.label || key}</td>
                <td className="py-2 pr-2">
                  <Field
                    type="number"
                    min="1"
                    value={def.cycleDaysMin}
                    onChange={(v) => patchConsumable(key, { ...def, cycleDaysMin: Math.max(1, Number(v)) })}
                  />
                </td>
                <td className="py-2 pr-2">
                  <Field
                    type="number"
                    min="1"
                    value={def.cycleDaysMax}
                    onChange={(v) => patchConsumable(key, { ...def, cycleDaysMax: Math.max(1, Number(v)) })}
                  />
                </td>
                <td className="py-2 pr-2">
                  <FreqSelect
                    value={def.defaultFreqTier}
                    onChange={(tier) => patchConsumable(key, { ...def, defaultFreqTier: tier })}
                  />
                </td>
                <td className="py-2">
                  <MetricSelect value={def.costMetric} onChange={(costMetric) => patchConsumable(key, { ...def, costMetric })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const name = newConsumable.trim();
            if (!name || consumable[name]) return;
            setConsumable((prev) => ({
              ...prev,
              [name]: {
                label: name,
                cycleDaysMin: 60,
                cycleDaysMax: 120,
                defaultFreqTier: "weekly_few",
                costMetric: "per_use",
              },
            }));
            setNewConsumable("");
          }}
        >
          <input
            value={newConsumable}
            onChange={(e) => setNewConsumable(e.target.value)}
            placeholder="新子类目，如 保健品"
            className="flex-1 rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none"
          />
          <button type="submit" className="btn-secondary rounded-xl px-3 text-sm">
            加上这类
          </button>
        </form>
      </section>
    </div>
  );
}
