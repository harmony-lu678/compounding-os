"use client";

import {
  CONSUMABLE_SUBCATEGORY_DEFAULTS,
  DURABLE_CATEGORY_DEFAULTS,
  getConsumableDefault,
  getDurableDefault,
  todayIso,
  type ConsumableSubcategoryDefault,
  type DurableCategoryDefault,
} from "@compos/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CategoryIcon } from "@/components/category";
import { IconBackspace, IconClose } from "@/components/icons";

function durableCats(map: Record<string, DurableCategoryDefault>) {
  return Object.keys(map).map((key) => ({ id: key, label: map[key]?.label ?? key }));
}

function consumableCats(map: Record<string, ConsumableSubcategoryDefault>) {
  return [{ id: "", label: "通用消耗品" }, ...Object.keys(map).map((key) => ({ id: key, label: map[key]?.label ?? key }))];
}

function Keypad({
  value,
  onChange,
  onSubmit,
  occurredAt,
  setOccurredAt,
}: {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  occurredAt: string;
  setOccurredAt: (val: string) => void;
}) {
  const handleKey = (key: string) => {
    if (key === "del") {
      onChange(value.slice(0, -1));
    } else if (key === ".") {
      if (!value.includes(".")) onChange(value ? value + "." : "0.");
    } else if (value === "0") {
      onChange(key);
    } else if (value.split(".")[1]?.length === 2) {
      return;
    } else {
      onChange(value + key);
    }
  };

  return (
    <div className="mt-auto grid grid-cols-4 select-none border-t border-line bg-card text-xl font-medium">
      <div className="col-span-3 grid grid-cols-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => (
          <button key={k} type="button" onClick={() => handleKey(k)} className="h-14 border-b border-r border-line active:bg-brand-muted">
            {k}
          </button>
        ))}
        <div className="relative flex h-14 items-center justify-center overflow-hidden border-r border-line">
          <input
            type="date"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="absolute inset-0 z-10 h-full w-full opacity-0"
          />
          <span className="text-sm">{occurredAt === todayIso() ? "今天" : occurredAt.slice(5)}</span>
        </div>
        <button type="button" onClick={() => handleKey("0")} className="h-14 border-r border-line active:bg-brand-muted">
          0
        </button>
        <button type="button" onClick={() => handleKey(".")} className="h-14 border-r border-line active:bg-brand-muted">
          .
        </button>
      </div>
      <div className="flex flex-col">
        <button type="button" onClick={() => handleKey("del")} className="flex h-14 items-center justify-center border-b border-line active:bg-brand-muted">
          <IconBackspace size={22} />
        </button>
        <button type="button" onClick={onSubmit} className="btn-primary flex flex-1 items-center justify-center text-base">
          完成
        </button>
      </div>
    </div>
  );
}

export default function NewAssetPage() {
  const router = useRouter();
  const [kind, setKind] = useState<"durable" | "consumable">("durable");
  const [selectedCat, setSelectedCat] = useState("电子产品");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [occurredAt, setOccurredAt] = useState(todayIso());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replenishFrom, setReplenishFrom] = useState<string | null>(null);
  const [durableMap, setDurableMap] = useState(DURABLE_CATEGORY_DEFAULTS);
  const [consumableMap, setConsumableMap] = useState(CONSUMABLE_SUBCATEGORY_DEFAULTS);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const durableCategories = durableCats(durableMap);
  const consumableCategories = consumableCats(consumableMap);
  const categories = kind === "durable" ? durableCategories : consumableCategories;

  useEffect(() => {
    const from = new URLSearchParams(window.location.search).get("from");
    if (from) {
      setReplenishFrom(from);
      setKind("consumable");
    }
  }, []);

  useEffect(() => {
    fetch("/api/v1/settings")
      .then((res) => res.json())
      .then((json) => {
        if (json?.durable) setDurableMap(json.durable);
        if (json?.consumable) setConsumableMap(json.consumable);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (kind === "durable" && !durableCategories.find((c) => c.id === selectedCat)) {
      setSelectedCat(durableCategories[0]!.id);
    } else if (kind === "consumable" && !consumableCategories.find((c) => c.id === selectedCat)) {
      setSelectedCat(consumableCategories[0]!.id);
    }
  }, [kind, selectedCat, durableCategories, consumableCategories]);

  async function handleSubmit() {
    setPending(true);
    setError(null);
    try {
      const priceCents = Math.round(Number(price) * 100);
      if (!Number.isFinite(priceCents) || priceCents <= 0) throw new Error("请填写有效的价格");

      const finalName = name.trim() || selectedCat || "未命名资产";
      const payload =
        kind === "durable"
          ? (() => {
              const def = getDurableDefault(selectedCat, durableMap);
              return {
                kind: "durable" as const,
                category: selectedCat,
                priceCents,
                lifespanMonths: def.lifespanMonths,
                residualRateMin: def.residualRateMin,
                residualRateMax: def.residualRateMax,
                usageFrequency: { type: "tier" as const, tier: def.defaultFreqTier },
                sources: {
                  lifespanMonths: "category_default" as const,
                  residualRate: "category_default" as const,
                  usageFrequency: "category_default" as const,
                },
              };
            })()
          : {
              kind: "consumable" as const,
              category: "消耗品",
              subcategory: selectedCat || undefined,
              priceCents,
              startDate: occurredAt,
              usageFrequency: {
                type: "tier" as const,
                tier: getConsumableDefault(selectedCat || undefined, consumableMap).defaultFreqTier,
              },
            };

      const res = await fetch("/api/v1/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: finalName, occurredAt, payload }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "创建失败");
      }

      const { asset } = await res.json();
      router.push(`/assets/${asset.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
      setPending(false);
    }
  }

  const selected = categories.find((c) => c.id === selectedCat);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-paper">
      <div className="brand-panel flex items-center justify-between px-4 py-3">
        <Link href="/" className="rounded-full p-2 hover:bg-white/40" aria-label="关闭">
          <IconClose size={18} />
        </Link>
        <div className="flex rounded-2xl bg-white/45 p-1 text-sm font-medium">
          <button
            type="button"
            className={`rounded-xl px-5 py-1.5 transition-colors ${kind === "durable" ? "bg-card shadow-sm" : "text-ink-soft"}`}
            onClick={() => setKind("durable")}
          >
            耐用品
          </button>
          <button
            type="button"
            className={`rounded-xl px-5 py-1.5 transition-colors ${kind === "consumable" ? "bg-card shadow-sm" : "text-ink-soft"}`}
            onClick={() => setKind("consumable")}
          >
            消耗品
          </button>
        </div>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        {replenishFrom && (
          <p className="mb-4 rounded-2xl bg-brand-muted px-3 py-2 text-xs">
            这是一次补货。上一件的周期已经记下，新的一瓶会开始下一轮预测。
          </p>
        )}
        <div className="grid grid-cols-4 gap-x-3 gap-y-5 sm:grid-cols-5">
          {categories.map((c) => {
            const active = selectedCat === c.id;
            return (
              <button key={c.id || "generic"} type="button" className="flex flex-col items-center gap-2" onClick={() => setSelectedCat(c.id)}>
                <span className={`icon-chip ${active ? "icon-chip-active" : ""}`}>
                  <CategoryIcon category={c.id || c.label} />
                </span>
                <span className={`text-[11px] ${active ? "font-medium text-ink" : "text-ink-soft"}`}>{c.label || "通用"}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-line bg-card shadow-[0_-8px_32px_rgb(28,25,20,0.06)]">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <span className="icon-chip">
            <CategoryIcon category={selected?.id || selected?.label || "消耗品"} />
          </span>
          <div className="flex min-w-0 flex-1 items-baseline">
            <span className="shrink-0 text-sm font-medium">{selected?.label || "通用"}</span>
            <input
              ref={nameInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="点此输入具体名称"
              className="ml-2 w-full bg-transparent text-sm outline-none placeholder:text-ink-soft/50"
            />
          </div>
          <div className="flex items-baseline gap-0.5 text-2xl font-semibold tabular-nums">
            <span className="text-base font-medium">¥</span>
            {price || "0.00"}
          </div>
        </div>

        {error && <div className="border-b border-line px-4 py-2 text-xs text-brand-deep">{error}</div>}

        {pending ? (
          <div className="flex h-[224px] items-center justify-center text-sm text-ink-soft">保存中...</div>
        ) : (
          <Keypad value={price} onChange={setPrice} onSubmit={handleSubmit} occurredAt={occurredAt} setOccurredAt={setOccurredAt} />
        )}
      </div>
    </div>
  );
}
