"use client";

import { SEASONALITIES, SEASONALITY_LABEL, type Seasonality } from "@compos/core";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SeasonalityEditor({ assetId, value }: { assetId: string; value: Seasonality }) {
  const router = useRouter();
  const [current, setCurrent] = useState(value);
  const [pending, setPending] = useState(false);

  async function save(next: Seasonality) {
    setCurrent(next);
    setPending(true);
    try {
      await fetch(`/api/v1/assets/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonality: next }),
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card p-4">
      <h2 className="text-sm font-medium">季节性</h2>
      <p className="mt-1 text-xs text-ink-soft">什么时候更可能用。休眠不是闲置。</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {SEASONALITIES.map((item) => (
          <button
            key={item}
            type="button"
            disabled={pending}
            onClick={() => save(item)}
            className={`rounded-2xl px-3 py-2 text-sm ${
              current === item ? "bg-brand text-ink" : "bg-line/60 text-ink-soft hover:text-ink"
            }`}
          >
            {SEASONALITY_LABEL[item]}
          </button>
        ))}
      </div>
    </section>
  );
}
