"use client";

import { todayIso } from "@compos/core";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SeasonalIntel } from "@/components/SeasonalIntel";
import type { SeasonToday } from "@/lib/season";
import type { CalibrationAsk, CaptureToday, WatchHint } from "@/lib/today-types";

function pickFresh<T extends { id: string }>(pool: T[], avoid: string[] = []): T | null {
  const fresh = pool.filter((item) => !avoid.includes(item.id));
  const source = fresh.length > 0 ? fresh : pool;
  if (source.length === 0) return null;
  return source[Math.floor(Math.random() * source.length)] ?? null;
}

function lastAsked(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function rememberAsked(key: string, id: string) {
  const prev = lastAsked(key).filter((x) => x !== id);
  sessionStorage.setItem(key, JSON.stringify([id, ...prev].slice(0, 8)));
}

const CALIB_BUCKETS = [
  { label: "0–3", count: 2 },
  { label: "4–7", count: 5 },
  { label: "8–15", count: 11 },
  { label: "16–25", count: 20 },
  { label: "25+", count: 30 },
] as const;

export function SpecialUse({ capture, season }: { capture: CaptureToday; season: SeasonToday }) {
  const router = useRouter();
  const seasonExtras = [...season.likely, ...season.watch]
    .filter((a) => ![...capture.specials, ...capture.others, ...capture.dailyAuto].some((x) => x.id === a.id))
    .map((a) => ({ id: a.id, name: a.name, category: "季节", todayCount: 0 }));
  const [counts, setCounts] = useState<Record<string, number>>(
    Object.fromEntries(
      [...capture.specials, ...capture.others, ...seasonExtras].map((a) => [a.id, a.todayCount]),
    ),
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [watchGone, setWatchGone] = useState(false);
  const [calibGone, setCalibGone] = useState(false);
  const [watchHint, setWatchHint] = useState<WatchHint | null>(null);
  const [calibration, setCalibration] = useState<CalibrationAsk | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const watch = pickFresh(capture.watchPool ?? [], lastAsked("ask-watch"));
    const calib = pickFresh(
      capture.calibPool ?? [],
      [watch?.id ?? "", ...lastAsked("ask-calib")].filter(Boolean),
    );
    setWatchHint(watch);
    setCalibration(calib);
    if (watch) rememberAsked("ask-watch", watch.id);
    if (calib) rememberAsked("ask-calib", calib.id);
  }, [capture.watchPool, capture.calibPool]);

  const specialCount = Object.values(counts).filter((n) => n > 0).length;

  async function logUse(assetId: string, times = 1) {
    setPendingId(assetId);
    setError(null);
    try {
      for (let i = 0; i < times; i += 1) {
        const res = await fetch("/api/v1/life-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "use", assetId }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error?.message ?? "记录失败");
        }
      }
      setCounts((prev) => ({ ...prev, [assetId]: (prev[assetId] ?? 0) + times }));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "记录失败");
    } finally {
      setPendingId(null);
    }
  }

  async function calibrate(assetId: string, count: number) {
    setPendingId(assetId);
    setError(null);
    try {
      const res = await fetch(`/api/v1/assets/${assetId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "usage_calibrated",
          occurredAt: todayIso(),
          payload: { periodDays: 30, count },
        }),
      });
      if (!res.ok) throw new Error("校准失败");
      setCalibGone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "校准失败");
    } finally {
      setPendingId(null);
    }
  }

  const chips = [
    ...capture.specials,
    ...season.likely
      .filter((a) => !capture.specials.some((s) => s.id === a.id) && !capture.dailyAuto.some((s) => s.id === a.id))
      .map((a) => ({ id: a.id, name: a.name, category: "季节", todayCount: counts[a.id] ?? 0 })),
  ];
  const allSpecials = [...chips, ...capture.others, ...seasonExtras].filter(
    (a, i, arr) => arr.findIndex((x) => x.id === a.id) === i,
  );

  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold">今天有没有特别使用？</h2>
      <p className="mt-1 text-xs text-ink-soft">
        日常的不必记。只记平时不常用、这个季节才用得到的东西。
      </p>

      {capture.dailyAuto.length > 0 && (
        <p className="mt-3 text-xs text-ink-soft">
          日常资产已自动估算：{capture.dailyAuto.map((a) => a.name).join(" · ")}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {chips.map((asset) => {
          const n = counts[asset.id] ?? 0;
          return (
            <button
              key={asset.id}
              type="button"
              disabled={pendingId === asset.id}
              onClick={() => logUse(asset.id)}
              className={`rounded-2xl px-3 py-2 text-sm ${
                n > 0 ? "bg-brand text-ink" : "bg-brand-muted/70 hover:bg-brand-muted"
              }`}
            >
              + {asset.name}
              {n > 0 ? ` · ${n} 次` : ""}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setPicker(true)}
          className="rounded-2xl bg-line/60 px-3 py-2 text-sm text-ink-soft hover:text-ink"
        >
          其他
        </button>
      </div>

      <p className="mt-3 text-xs text-ink-soft">
        {specialCount === 0
          ? "今天没有新的使用事件，日常资产已按既有假设计算。"
          : `今天记录了 ${specialCount} 个特别使用${specialCount >= capture.budget ? "，够了" : ""}。`}
      </p>

      {watchHint && !watchGone && (
        <div className="mt-4 rounded-2xl bg-paper px-3 py-3">
          <p className="text-sm">最近有没有用过{watchHint.name}？</p>
          <div className="mt-2 flex gap-2">
            <button type="button" className="btn-primary rounded-xl px-3 py-1.5 text-xs" onClick={() => logUse(watchHint.id)}>
              有，记一次
            </button>
            <button type="button" className="btn-secondary rounded-xl px-3 py-1.5 text-xs" onClick={() => setWatchGone(true)}>
              没有
            </button>
          </div>
        </div>
      )}

      {calibration && !calibGone && (
        <div className="mt-4 rounded-2xl bg-paper px-3 py-3">
          <p className="text-sm">过去 30 天，{calibration.name} 大概用了几次？</p>
          {calibration.loggedCount30 > 0 && (
            <p className="mt-1 text-xs text-ink-soft">这段时间已经随手记了 {calibration.loggedCount30} 次。</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {CALIB_BUCKETS.map((b) => (
              <button
                key={b.label}
                type="button"
                disabled={pendingId === calibration.id}
                className="btn-secondary rounded-xl px-3 py-1.5 text-xs"
                onClick={() => calibrate(calibration.id, b.count)}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-ink-soft">{error}</p>}

      <SeasonalIntel season={season} onUsed={(id) => logUse(id)} />

      {picker && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/30 p-3 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-card p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">今天用了哪些特别资产？</h3>
              <button type="button" className="text-sm text-ink-soft" onClick={() => setPicker(false)}>
                取消
              </button>
            </div>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {allSpecials.length === 0 && <p className="py-6 text-center text-sm text-ink-soft">没有需要记录的资产</p>}
              {allSpecials.map((asset) => {
                const on = picked.includes(asset.id) || (counts[asset.id] ?? 0) > 0;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() =>
                      setPicked((prev) => (prev.includes(asset.id) ? prev.filter((id) => id !== asset.id) : [...prev, asset.id]))
                    }
                    className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left ${
                      on ? "bg-brand-muted" : "hover:bg-paper"
                    }`}
                  >
                    <span className="text-sm font-medium">{asset.name}</span>
                    <span className="text-xs text-ink-soft">{asset.category}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={picked.length === 0 || pendingId !== null}
              className="btn-primary mt-4 w-full rounded-2xl py-2.5 text-sm"
              onClick={async () => {
                for (const id of picked) {
                  if ((counts[id] ?? 0) === 0) await logUse(id);
                }
                setPicked([]);
                setPicker(false);
              }}
            >
              完成今天
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
