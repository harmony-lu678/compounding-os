import Link from "next/link";
import { SpecialUse } from "@/components/SpecialUse";
import { TodayActions } from "@/components/TodayActions";
import { getTodayView } from "@/lib/today";

export const dynamic = "force-dynamic";

function yuan(n: number, digits = 1) {
  return n.toFixed(digits);
}

function pct(n: number) {
  return `${n >= 0 ? "+" : ""}${Math.round(n * 100)}%`;
}

export default async function TodayPage() {
  const data = await getTodayView();
  const usageNow = Math.round(data.usageRateNow * 100);

  return (
    <div className="space-y-5">
      <section className="brand-panel -mx-4 px-6 py-8 sm:-mx-8 md:mx-0 md:rounded-3xl">
        <div className="text-sm font-medium">{data.weekday}</div>
        <div className="mt-1 text-xs brand-panel-muted">{data.monthDay} · Today</div>
        <h1 className="mt-5 text-[28px] font-semibold tracking-tight leading-tight">你的资产正在产生价值</h1>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div>
            <div className="text-[40px] font-semibold leading-none tracking-tight tabular-nums">
              ¥{yuan(data.dailyCostYuan)}
            </div>
            <div className="mt-2 text-xs brand-panel-muted">今日持有成本</div>
          </div>
          <div>
            <div className="text-[40px] font-semibold leading-none tracking-tight tabular-nums">{usageNow}%</div>
            <div className="mt-2 text-xs brand-panel-muted">资产使用率</div>
          </div>
          <div>
            <div className="text-[40px] font-semibold leading-none tracking-tight tabular-nums">
              {pct(data.usageDelta30)}
            </div>
            <div className="mt-2 text-xs brand-panel-muted">较过去 30 天</div>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">最近 7 天</h2>
          <Link href="/review?range=7" className="text-xs text-ink-soft hover:text-ink">
            查看这段变化
          </Link>
        </div>
        <ul className="mt-4 space-y-2.5">
          {data.recentChanges.map((item) => (
            <li key={item.text} className="flex gap-2 text-sm">
              <span className="w-4 shrink-0 font-medium text-ink-soft">{item.sign || "·"}</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-5">
        <div className="text-xs font-medium text-brand-deep">今日发现</div>
        <h2 className="mt-2 text-base font-semibold">
          {data.season.insight?.title ?? data.insight.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {data.season.insight?.body ?? data.insight.body}
        </p>
      </section>

      <SpecialUse capture={data.capture} season={data.season} />

      <TodayActions assets={data.ritualAssets} />
    </div>
  );
}
