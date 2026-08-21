import Link from "next/link";
import { SEASONALITY_LABEL } from "@compos/core";
import { getTodayView } from "@/lib/today";

export const dynamic = "force-dynamic";

const LIFE_LABEL = {
  active: "正常使用",
  dormant: "季节休眠",
  low: "低频",
  idle: "高度闲置",
} as const;

export default async function SeasonPage() {
  const data = await getTodayView();
  const { season } = data;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight">季节资产</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {season.seasonLabel}。只看「此刻该用却没用」的，休眠不是闲置。
        </p>
      </div>

      <section className="card p-5">
        <h2 className="text-sm font-semibold">闲置雷达</h2>
        <p className="mt-1 text-xs text-ink-soft">按预期窗口对照历史节奏，不是按「多久没用」排序。</p>
        {season.watch.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">现在没有需要关注的季节缺口。</p>
        ) : (
          <div className="mt-4 space-y-3">
            {season.watch.map((item) => (
              <Link key={item.id} href={`/assets/${item.id}`} className="block rounded-2xl bg-paper px-3 py-3 hover:bg-brand-muted/50">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-xs text-ink-soft">
                    {item.gapLevel === "idle" ? "高优先级" : "值得关注"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-ink-soft">
                  {SEASONALITY_LABEL[item.seasonality]} · {LIFE_LABEL[item.life]} · 今年 {item.usesThisWindow} 次
                  {item.usesLastYearSameMonth > 0 ? ` · 去年同期 ${item.usesLastYearSameMonth} 次` : ""}
                </div>
                <p className="mt-1 text-xs text-ink-soft">{item.insight}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {season.likely.length > 0 && (
        <section className="card p-5">
          <h2 className="text-sm font-semibold">最近可能会用</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {season.likely.map((item) => (
              <li key={item.id}>
                <Link href={`/assets/${item.id}`} className="hover:underline">
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
