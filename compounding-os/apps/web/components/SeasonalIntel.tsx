"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SeasonToday } from "@/lib/season";

export function SeasonalIntel({
  season,
  onUsed,
}: {
  season: SeasonToday;
  onUsed?: (assetId: string) => Promise<void> | void;
}) {
  const router = useRouter();
  const [hidden, setHidden] = useState<string[]>([]);
  const [pending, setPending] = useState<string | null>(null);

  const watch = season.watch.filter((item) => !hidden.includes(item.id));

  async function used(assetId: string) {
    setPending(assetId);
    try {
      if (onUsed) await onUsed(assetId);
      else {
        await fetch("/api/v1/life-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "use", assetId }),
        });
        router.refresh();
      }
      setHidden((prev) => [...prev, assetId]);
    } finally {
      setPending(null);
    }
  }

  if (season.likely.length === 0 && watch.length === 0) return null;

  return (
    <div className="mt-4 border-t border-line/70 pt-4">
      <div className="text-xs font-medium text-brand-deep">
        {season.transitioning ? "季节切换" : season.seasonLabel}
      </div>
      {season.likely.length > 0 && (
        <p className="mt-1 text-sm text-ink-soft">
          这个季节你可能会用到：{season.likely.map((a) => a.name).join(" · ")}
        </p>
      )}

      {watch.length > 0 && (
        <div className="mt-3 space-y-3">
          <div className="text-xs text-ink-soft">值得关注 · 预计此时该用，但还没对上历史节奏</div>
          {watch.map((item) => (
            <div key={item.id} className="rounded-2xl bg-paper px-3 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <Link href={`/assets/${item.id}`} className="text-sm font-medium hover:underline">
                  {item.name}
                </Link>
                <span className="text-xs text-ink-soft tabular-nums">今年 {item.usesThisWindow} 次</span>
              </div>
              <p className="mt-1 text-xs text-ink-soft">{item.insight}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending === item.id}
                  className="btn-primary rounded-xl px-3 py-1.5 text-xs"
                  onClick={() => used(item.id)}
                >
                  今天用了
                </button>
                <button
                  type="button"
                  className="btn-secondary rounded-xl px-3 py-1.5 text-xs"
                  onClick={() => setHidden((prev) => [...prev, item.id])}
                >
                  暂时不用
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Link href="/season" className="mt-3 inline-block text-xs text-ink-soft hover:text-ink">
        查看季节资产
      </Link>
    </div>
  );
}
