"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CHANGE_QUESTIONS,
  CHART_RANGES,
  type ChangeData,
  type ChangeQuestionKey,
  type ChartRangeKey,
  type HealthPoint,
} from "@/lib/change-types";

function yuan(n: number, digits = 0): string {
  const abs = Math.abs(n);
  if (abs >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return n.toFixed(digits);
}

function signedYuan(n: number, digits = 1): string {
  if (Math.abs(n) < 0.05) return "持平";
  return `${n > 0 ? "↑" : "↓"} ¥${yuan(Math.abs(n), digits)}`;
}

function signedPct(n: number): string {
  if (Math.abs(n) < 0.005) return "持平";
  return `${n > 0 ? "↑" : "↓"} ${Math.round(Math.abs(n) * 100)}%`;
}

function Spark({
  values,
  invert = false,
}: {
  values: number[];
  invert?: boolean;
}) {
  const width = 640;
  const height = 72;
  const pad = { top: 8, right: 8, bottom: 8, left: 8 };
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
  const color = good ? "#3d7a4a" : up || invert ? "#8a6a12" : "#8a6a12";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[72px] w-full" role="img">
      <path d={area} fill={color} opacity="0.12" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function DecaySpark({ curve }: { curve: { uses: number; perUseYuan: number }[] }) {
  return <Spark values={curve.map((p) => p.perUseYuan)} invert />;
}

function href(range: ChartRangeKey, q: ChangeQuestionKey) {
  return `/weekly?range=${range}&q=${q}`;
}

function HealthBlock({
  title,
  value,
  delta,
  series,
  metric,
  invert,
}: {
  title: string;
  value: string;
  delta: string;
  series: HealthPoint[];
  metric: keyof Pick<HealthPoint, "valueYuan" | "dailyCostYuan" | "usageRate">;
  invert?: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-xs text-ink-soft">{title}</div>
          <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
        </div>
        <div className="text-xs font-medium text-ink-soft">{delta}</div>
      </div>
      <div className="mt-2">
        <Spark values={series.map((p) => p[metric])} invert={invert} />
      </div>
    </div>
  );
}

export function ChangeView({ data, question }: { data: ChangeData; question: ChangeQuestionKey }) {
  const router = useRouter();
  const { cards, insight } = data;
  const usageNow = Math.round(cards.usageRate * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight">变化</h1>
        <p className="mt-1 text-sm text-ink-soft">先看见自己，再看数字。图只是证据。</p>
      </div>

      <div>
        <div className="mb-2 text-xs text-ink-soft">我想知道</div>
        <div className="flex flex-wrap gap-2">
          {CHANGE_QUESTIONS.map((item) => {
            const active = question === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => router.push(href(data.rangeKey, item.key))}
                className={`rounded-2xl px-3 py-2 text-sm transition-colors ${
                  active ? "bg-brand text-ink" : "bg-line/60 text-ink-soft hover:text-ink"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="inline-flex rounded-2xl bg-line/60 p-1" role="tablist" aria-label="时间范围">
        {CHART_RANGES.map((r) => {
          const active = data.rangeKey === r.key;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => router.push(href(r.key, question))}
              className={`rounded-xl px-3 py-1.5 text-sm font-medium ${
                active ? "segment-active" : "text-ink-soft hover:text-ink"
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      <section className="brand-panel rounded-3xl px-5 py-6">
        <div className="text-xs brand-panel-muted">过去{data.rangeLabel}</div>
        <h2 className="mt-2 text-[22px] font-semibold leading-snug tracking-tight">{insight.headline}</h2>
        <p className="mt-3 text-sm leading-relaxed brand-panel-muted">{insight.body}</p>
        {insight.why.length > 0 && (
          <div className="mt-5 space-y-2">
            <div className="text-xs brand-panel-muted">为什么？</div>
            {insight.why.map((item) => (
              <div key={`${item.label}-${item.deltaYuan}`} className="flex items-baseline justify-between gap-3 text-sm">
                <div>
                  {item.id ? (
                    <Link href={`/assets/${item.id}`} className="hover:underline">
                      {item.label}
                    </Link>
                  ) : (
                    item.label
                  )}
                  <div className="text-xs brand-panel-muted">{item.detail}</div>
                </div>
                <div className="shrink-0 tabular-nums">{signedYuan(item.deltaYuan)} / 天</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <div className="card px-4 py-3">
          <div className="text-xs text-ink-soft">资产价值</div>
          <div className="mt-1 text-xl font-semibold tabular-nums">¥{yuan(cards.valueYuan)}</div>
          <div className="mt-1 text-xs text-ink-soft">{signedYuan(cards.valueDeltaYuan, 0)}</div>
        </div>
        <div className="card px-4 py-3">
          <div className="text-xs text-ink-soft">持有成本</div>
          <div className="mt-1 text-xl font-semibold tabular-nums">¥{yuan(cards.dailyCostYuan, 1)} / 天</div>
          <div className="mt-1 text-xs text-ink-soft">{signedYuan(cards.dailyCostDeltaYuan)} / 天</div>
        </div>
        <div className="card px-4 py-3">
          <div className="text-xs text-ink-soft">使用效率</div>
          <div className="mt-1 text-xl font-semibold tabular-nums">{usageNow}%</div>
          <div className="mt-1 text-xs text-ink-soft">{signedPct(cards.usageDelta)}</div>
        </div>
        <div className="card px-4 py-3">
          <div className="text-xs text-ink-soft">消费</div>
          <div className="mt-1 text-xl font-semibold tabular-nums">¥{yuan(cards.spendYuan)}</div>
          <div className="mt-1 text-xs text-ink-soft">
            {cards.spendDeltaPct == null ? "上一期没有购入" : signedPct(cards.spendDeltaPct)}
          </div>
        </div>
      </div>

      {(question === "better" || question === "what") && (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">我的资产状态</h3>
            <p className="mt-1 text-xs text-ink-soft">看方向：价值 ↑ · 使用 ↑ · 成本 ↓</p>
          </div>
          <HealthBlock
            title="资产价值"
            value={`¥${yuan(cards.valueYuan)}`}
            delta={signedYuan(cards.valueDeltaYuan, 0)}
            series={data.series}
            metric="valueYuan"
          />
          <HealthBlock
            title="使用效率"
            value={`${usageNow}%`}
            delta={signedPct(cards.usageDelta)}
            series={data.series}
            metric="usageRate"
          />
          <HealthBlock
            title="日均成本"
            value={`¥${yuan(cards.dailyCostYuan, 1)} / 天`}
            delta={signedYuan(cards.dailyCostDeltaYuan)}
            series={data.series}
            metric="dailyCostYuan"
            invert
          />
        </section>
      )}

      {question === "worth" && (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">越用越便宜</h3>
            <p className="mt-1 text-xs text-ink-soft">买的时候是一口价。用下去，单次成本会自己掉下来。</p>
          </div>
          {data.decay.length === 0 ? (
            <div className="card p-5 text-sm text-ink-soft">还没有足够的使用记录来画成本下降。先去今日记一次「使用」。</div>
          ) : (
            data.decay.map((row) => (
              <Link key={row.id} href={`/assets/${row.id}`} className="card block p-4 hover:bg-brand-muted/40">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{row.name}</div>
                    <div className="mt-1 text-xs text-ink-soft">
                      买的时候 ¥{yuan(row.priceYuan)} · 已用约 {Math.round(row.usesNow)} 次
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold tabular-nums">¥{yuan(row.perUseNowYuan, 1)}</div>
                    <div className="text-xs text-ink-soft">/ 次</div>
                  </div>
                </div>
                <div className="mt-2">
                  <DecaySpark curve={row.curve} />
                </div>
                <p className="mt-2 text-xs text-ink-soft">
                  再使用 {Math.round(row.nextUses - row.usesNow)} 次，单次成本预计到 ¥{yuan(row.perUseNextYuan, 1)}。
                </p>
              </Link>
            ))
          )}
        </section>
      )}

      {question === "used" && (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">东西有没有被用起来</h3>
            <p className="mt-1 text-xs text-ink-soft">
              过去{data.rangeLabel}，使用效率 {signedPct(cards.usageDelta)}。
            </p>
          </div>
          <div className="card p-4">
            <Spark values={data.series.map((p) => p.usageRate)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {data.utilization
              .filter((b) => b.key !== "idle")
              .map((bucket) => (
                <div key={bucket.key} className="card p-4">
                  <div className="text-xs text-ink-soft">{bucket.label}</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">{bucket.count} 件</div>
                  <div className="text-xs text-ink-soft">{bucket.hint}</div>
                  <div className="mt-2 space-y-1">
                    {bucket.assets.map((a) => (
                      <Link key={a.id} href={`/assets/${a.id}`} className="block text-sm hover:underline">
                        {a.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {question === "waste" && (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">资产贡献</h3>
            <p className="mt-1 text-xs text-ink-soft">点进去看它为什么在这个位置。下一步在资产页。</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.matrix.map((quad) => (
              <div key={quad.key} className="card p-4">
                <div className="text-sm font-semibold">{quad.title}</div>
                <div className="mt-0.5 text-xs text-ink-soft">{quad.hint}</div>
                <div className="mt-3 space-y-1">
                  {quad.assets.length === 0 ? (
                    <p className="text-sm text-ink-soft">这一格是空的。</p>
                  ) : (
                    quad.assets.slice(0, 6).map((a) => (
                      <Link key={a.id} href={`/assets/${a.id}`} className="flex items-baseline justify-between gap-2 text-sm hover:underline">
                        <span className="truncate">{a.name}</span>
                        <span className="shrink-0 text-xs text-ink-soft tabular-nums">¥{yuan(a.dailyCostYuan, 1)}/天</span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {question === "what" && (
        <section className="card p-5">
          <h3 className="text-sm font-semibold">消费最后变成了什么</h3>
          <p className="mt-1 text-xs text-ink-soft">只看这段时间新花出去的钱，有多少还在被使用。</p>
          <div className="mt-4 space-y-3">
            {data.funnel.map((step, idx) => {
              const max = Math.max(data.funnel[0]?.yuan ?? 1, 1);
              return (
                <div key={step.key}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span>{step.label}</span>
                    <span className="tabular-nums">¥{yuan(step.yuan)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-line/70">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(4, (step.yuan / max) * 100)}%` }} />
                  </div>
                  {idx === data.funnel.length - 1 && step.yuan > 0 && (
                    <p className="mt-3 text-sm text-ink-soft">
                      过去{data.rangeLabel}花掉的 ¥{yuan(data.funnel[0]?.yuan ?? 0)} 里，有 ¥{yuan(step.yuan)} 还停在低频或闲置上。
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
