"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CHART_RANGES,
  type AttentionItem,
  type ChangeData,
  type HealthPoint,
  type UtilShare,
} from "@/lib/change-types";

function yuan(n: number, digits = 1): string {
  const abs = Math.abs(n);
  if (abs >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return n.toFixed(digits);
}

function signedPct(n: number): string {
  if (Math.abs(n) < 0.005) return "持平";
  return `${n > 0 ? "↑" : "↓"} ${Math.round(Math.abs(n) * 100)}%`;
}

function md(iso: string): string {
  return `${iso.slice(5, 7)}.${iso.slice(8, 10)}`;
}

function Spark({ values, invert = false }: { values: number[]; invert?: boolean }) {
  const width = 320;
  const height = 56;
  const pad = { top: 6, right: 6, bottom: 6, left: 6 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(...values, 0.0001);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const x = (i: number) => pad.left + (values.length <= 1 ? innerW / 2 : (i / (values.length - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - ((v - min) / span) * innerH;
  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(values.length - 1).toFixed(1)},${pad.top + innerH} L${x(0).toFixed(1)},${pad.top + innerH} Z`;
  const up = values[values.length - 1]! >= values[0]!;
  const good = invert ? !up : up;
  const color = good ? "#3d7a4a" : "#8a6a12";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-14 w-full" role="img">
      <path d={area} fill={color} opacity="0.12" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function ShareBar({ shares }: { shares: UtilShare[] }) {
  const colors = {
    high: "bg-success",
    mid: "bg-brand-strong",
    low: "bg-brand-deep/40",
    idle: "bg-line",
  };
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-line">
        {shares
          .filter((s) => s.pct > 0)
          .map((s) => (
            <div key={s.key} className={colors[s.key]} style={{ width: `${Math.max(s.pct * 100, 2)}%` }} />
          ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        {shares.map((s) => (
          <div key={s.key} className="flex justify-between gap-2">
            <span className="text-ink-soft">{s.label}</span>
            <span className="tabular-nums">{Math.round(s.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttentionList({
  items,
  onUse,
  pendingId,
}: {
  items: AttentionItem[];
  onUse: (id: string) => void;
  pendingId: string | null;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-ink-soft">这段时间没有特别需要盯着的异常。平稳本身也是一种变化。</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="rounded-2xl bg-paper px-3 py-3">
          <Link href={item.href} className="text-sm font-medium hover:underline">
            {item.name}
          </Link>
          <p className="mt-0.5 text-xs text-ink-soft">{item.line}</p>
          {item.detail && item.detail !== item.line && (
            <p className="mt-0.5 text-xs text-ink-soft">{item.detail}</p>
          )}
          {item.action === "use" && (
            <button
              type="button"
              disabled={pendingId === item.id}
              className="btn-primary mt-2 rounded-xl px-3 py-1.5 text-xs"
              onClick={() => onUse(item.id)}
            >
              今天用了
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function MetricProof({
  title,
  from,
  to,
  delta,
  series,
  metric,
  invert,
  note,
}: {
  title: string;
  from: string;
  to: string;
  delta: string;
  series: HealthPoint[];
  metric: keyof Pick<HealthPoint, "valueYuan" | "dailyCostYuan" | "usageRate">;
  invert?: boolean;
  note?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-xs text-ink-soft">{title}</div>
        <div className="text-xs font-medium text-ink-soft">{delta}</div>
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums">
        {from} → {to}
      </div>
      <Spark values={series.map((p) => p[metric])} invert={invert} />
      {note && <p className="text-xs text-ink-soft">{note}</p>}
    </div>
  );
}

export function ReviewView({ data }: { data: ChangeData }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [gone, setGone] = useState<string[]>([]);
  const { story, ranks } = data;
  const attention = data.attention.filter((item) => !gone.includes(item.id));
  const usageThen = Math.round(story.usageThen * 100);
  const usageNow = Math.round(story.usageNow * 100);
  const eventsFirst = data.emphasis === "events";

  async function logUse(assetId: string) {
    setPendingId(assetId);
    try {
      const res = await fetch("/api/v1/life-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "use", assetId }),
      });
      if (res.ok) {
        setGone((prev) => [...prev, assetId]);
        router.refresh();
      }
    } finally {
      setPendingId(null);
    }
  }

  const storyPanel = (
    <section className="brand-panel rounded-3xl px-5 py-6">
      <div className="text-xs brand-panel-muted">过去{data.rangeLabel} · {data.rangeQuestion}</div>
      <h2 className="mt-2 text-[22px] font-semibold leading-snug tracking-tight">{story.headline}</h2>
      <p className="mt-3 text-sm leading-relaxed brand-panel-muted">{story.body}</p>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs brand-panel-muted">资产使用率</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">
            {usageThen}% → {usageNow}%
          </div>
          <div className="mt-0.5 text-xs brand-panel-muted">{signedPct(story.usageDelta)}</div>
        </div>
        <div>
          <div className="text-xs brand-panel-muted">日均持有成本</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">
            ¥{yuan(story.costThenYuan)} → ¥{yuan(story.costNowYuan)}
          </div>
          <div className="mt-0.5 text-xs brand-panel-muted">
            {story.costDeltaPct === null || Math.abs(story.costDeltaYuan) < 0.05
              ? "持平"
              : `${story.costDeltaYuan < 0 ? "↓" : "↑"} ${Math.round(Math.abs(story.costDeltaPct) * 100)}%`}
          </div>
        </div>
      </div>
    </section>
  );

  const proof = (
    <section className="card p-4">
      <h3 className="text-sm font-semibold">{data.emphasis === "trend" ? "长期结构" : "关键变化"}</h3>
      <div className="mt-4 space-y-4">
        <MetricProof
          title="使用效率"
          from={`${usageThen}%`}
          to={`${usageNow}%`}
          delta={signedPct(story.usageDelta)}
          series={data.series}
          metric="usageRate"
          note={ranks.rising.length ? `主要由 ${ranks.rising.map((r) => r.name).slice(0, 2).join("、")} 带动` : undefined}
        />
        <MetricProof
          title="持有成本"
          from={`¥${yuan(story.costThenYuan)}`}
          to={`¥${yuan(story.costNowYuan)}`}
          delta={story.costDeltaYuan === 0 ? "持平" : `${story.costDeltaYuan < 0 ? "↓" : "↑"} ¥${yuan(Math.abs(story.costDeltaYuan))}`}
          series={data.series}
          metric="dailyCostYuan"
          invert
        />
        <div>
          <div className="text-xs text-ink-soft">资产利用结构</div>
          <div className="mt-2">
            <ShareBar shares={data.shares} />
          </div>
        </div>
      </div>
    </section>
  );

  const notice = (
    <section className="card p-4">
      <h3 className="text-sm font-semibold">值得注意</h3>
      <p className="mt-1 text-xs text-ink-soft">最多看几件真正值得你分心的事。</p>
      <div className="mt-3">
        <AttentionList items={attention} onUse={logUse} pendingId={pendingId} />
      </div>
    </section>
  );

  const timeline = (
    <section className="card p-4">
      <h3 className="text-sm font-semibold">最近发生</h3>
      <p className="mt-1 text-xs text-ink-soft">这段时间你的资产生活。</p>
      {data.timeline.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">没有新的进出。日常使用按既有假设计算。</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {data.timeline.map((item) => (
            <li key={item.id} className="flex gap-3 text-sm">
              <span className="w-10 shrink-0 tabular-nums text-ink-soft">{md(item.date)}</span>
              <div>
                {item.href ? (
                  <Link href={item.href} className="font-medium hover:underline">
                    {item.title}
                  </Link>
                ) : (
                  <span className="font-medium">{item.title}</span>
                )}
                {item.detail && <span className="ml-2 text-xs text-ink-soft">{item.detail}</span>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );

  const using = data.emphasis !== "events" && (
    <section className="card p-4">
      <h3 className="text-sm font-semibold">你正在用什么？</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {(
          [
            { title: "使用最多", rows: ranks.most, empty: "还没有记下特别使用" },
            { title: "使用增加最快", rows: ranks.rising, empty: "还看不出加速的资产" },
            { title: "几乎没被使用", rows: ranks.unused, empty: "没有明显被遗忘的东西" },
          ] as const
        ).map((col) => (
          <div key={col.title}>
            <div className="text-xs text-ink-soft">{col.title}</div>
            {col.rows.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">{col.empty}</p>
            ) : (
              <ol className="mt-2 space-y-1.5">
                {col.rows.map((row, i) => (
                  <li key={row.id} className="flex items-baseline justify-between gap-2 text-sm">
                    <Link href={row.href} className="min-w-0 truncate hover:underline">
                      <span className="mr-1.5 text-xs text-ink-soft">{String(i + 1).padStart(2, "0")}</span>
                      {row.name}
                    </Link>
                    <span className="shrink-0 tabular-nums text-xs text-ink-soft">{row.value}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </div>
    </section>
  );

  const upcoming = data.upcoming.length > 0 && (
    <section className="card p-4">
      <h3 className="text-sm font-semibold">接下来值得关注</h3>
      <p className="mt-1 text-xs text-ink-soft">根据你的历史，接下来可能发生什么。</p>
      <ul className="mt-3 space-y-3">
        {data.upcoming.map((item) => (
          <li key={item.id}>
            {item.href ? (
              <Link href={item.href} className="text-sm font-medium hover:underline">
                {item.title}
              </Link>
            ) : (
              <div className="text-sm font-medium">{item.title}</div>
            )}
            <p className="mt-0.5 text-xs text-ink-soft">{item.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-medium text-brand-deep">变化</div>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">这段时间，你有什么变化？</h1>
      </div>

      <div>
        <div className="inline-flex rounded-2xl bg-line/60 p-1" role="tablist" aria-label="观察层级">
          {CHART_RANGES.map((r) => {
            const active = data.rangeKey === r.key;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => router.push(`/review?range=${r.key}`)}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium ${
                  active ? "segment-active" : "text-ink-soft hover:text-ink"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-ink-soft">{data.rangeQuestion}</p>
      </div>

      {storyPanel}

      {eventsFirst ? (
        <>
          {timeline}
          <div className="grid gap-4 md:grid-cols-2">
            {notice}
            {proof}
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {proof}
            {notice}
          </div>
          {timeline}
        </>
      )}

      {using}
      {upcoming}

      <Link href="/" className="block text-center text-xs text-ink-soft hover:text-ink">
        回今日
      </Link>
    </div>
  );
}
