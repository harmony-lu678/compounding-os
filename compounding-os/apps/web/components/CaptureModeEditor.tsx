"use client";

import { CAPTURE_MODE_HINT, CAPTURE_MODE_LABEL, type CaptureMode } from "@compos/core";
import { useRouter } from "next/navigation";
import { useState } from "react";

const MODES: CaptureMode[] = ["auto", "quick", "batch"];

export function CaptureModeEditor({ assetId, value }: { assetId: string; value: CaptureMode }) {
  const router = useRouter();
  const [mode, setMode] = useState(value);
  const [pending, setPending] = useState(false);

  async function save(next: CaptureMode) {
    setMode(next);
    setPending(true);
    try {
      const res = await fetch(`/api/v1/assets/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captureMode: next }),
      });
      if (!res.ok) throw new Error("保存失败");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card p-4">
      <h2 className="text-sm font-medium">记录模式</h2>
      <p className="mt-1 text-xs text-ink-soft">日常的不必记，特别的顺手记，规律的偶尔校准。</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {MODES.map((item) => (
          <button
            key={item}
            type="button"
            disabled={pending}
            onClick={() => save(item)}
            className={`rounded-2xl px-3 py-2 text-sm ${
              mode === item ? "bg-brand text-ink" : "bg-line/60 text-ink-soft hover:text-ink"
            }`}
          >
            {CAPTURE_MODE_LABEL[item]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-soft">{CAPTURE_MODE_HINT[mode]}</p>
    </section>
  );
}
