import Link from "next/link";
import { TodayRitual } from "@/components/TodayRitual";
import { getTodayView } from "@/lib/today";

function pct(n: number) {
  return `${n >= 0 ? "+" : ""}${Math.round(n * 100)}%`;
}

function yuan(n: number, digits = 1) {
  return n.toFixed(digits);
}

export default async function TodayPage() {
  const data = await getTodayView();
  const costDelta = data.dailyCostYuan - data.yesterdayDailyCostYuan;
  const usageDelta = data.comparison30.usageRateNow - data.comparison30.usageRateThen;
  const cost30 = data.comparison30.dailyCostNow - data.comparison30.dailyCostThen;

  return (
    <div className="space-y-5">
      <section className="brand-panel -mx-4 px-6 py-8 sm:-mx-8 md:mx-0 md:rounded-3xl">
        <div className="text-sm font-medium">{data.weekday}</div>
        <div className="mt-1 text-xs brand-panel-muted">{data.monthDay} · Today</div>
        <h1 className="mt-5 text-[28px] font-semibold tracking-tight leading-tight">你正在积累什么？</h1>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <div className="text-xs brand-panel-muted">东西今天值</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">+¥{yuan(data.releasedYuan)}</div>
          </div>
          <div>
            <div className="text-xs brand-panel-muted">今天用了</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{data.assetUseCount} 次</div>
          </div>
          <div>
            <div className="text-xs brand-panel-muted">这周学了</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{data.learnCount} 次</div>
          </div>
          <div>
            <div className="text-xs brand-panel-muted">连续没买</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{data.noBuyStreakDays} 天</div>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <div className="text-xs text-ink-soft">今日复利 · 使用价值释放</div>
        <div className="mt-2 text-[40px] font-semibold tracking-tight tabular-nums leading-none">
          + ¥{yuan(data.releasedYuan, 0)}
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          {costDelta === 0
            ? "日均成本与昨天持平。资产仍在替你工作。"
            : costDelta < 0
              ? `相比昨天，你少消耗了 ¥${yuan(Math.abs(costDelta))}。`
              : `相比昨天，日均成本高了 ¥${yuan(costDelta)}。`}
        </p>
        {data.noBuyStreakDays >= 2 && (
          <p className="mt-2 text-sm font-medium">连续第 {data.noBuyStreakDays} 天没有新增购买。</p>
        )}
      </section>

      {data.restock.length > 0 && (
        <section className="card p-5">
          <div className="text-xs font-medium text-brand-deep">补货提醒</div>
          <h2 className="mt-2 text-base font-semibold">有日用品快用完了</h2>
          <p className="mt-1 text-xs text-ink-soft">不是必须买。窗口到了，可以准备，也可以先点「用完了」把周期变成实测。</p>
          <ul className="mt-4 space-y-3">
            {data.restock.map((item) => (
              <li key={item.id}>
                <Link href={`/assets/${item.id}`} className="block rounded-2xl bg-brand-muted/60 px-3 py-2.5 hover:bg-brand-muted">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="shrink-0 text-xs text-ink-soft">
                      {item.urgency === "overdue" ? "该补了" : `${item.daysLeft} 天后`}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-ink-soft">{item.label}</div>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/assets/new" className="mt-3 inline-block text-xs text-ink-soft hover:text-ink">
            补货的话，去记一笔
          </Link>
        </section>
      )}

      <section className="card p-5">
        <div className="text-xs font-medium text-brand-deep">今日发现</div>
        <h2 className="mt-2 text-base font-semibold">{data.insight.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{data.insight.body}</p>
      </section>

      <section className="card p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">30 Day</h2>
          <div className="flex gap-3">
            <Link href="/weekly?range=30" className="text-xs text-ink-soft hover:text-ink">
              看这段时间的变化
            </Link>
            <Link href="/plan" className="text-xs text-ink-soft hover:text-ink">
              看未来要准备什么
            </Link>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-xs text-ink-soft">资产利用率</div>
            <div className="mt-1 font-semibold tabular-nums">
              {Math.round(data.comparison30.usageRateNow * 100)}%{" "}
              <span className="text-xs font-medium text-ink-soft">{pct(usageDelta)}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-ink-soft">日均成本</div>
            <div className="mt-1 font-semibold tabular-nums">
              ¥{yuan(data.comparison30.dailyCostNow)}{" "}
              <span className="text-xs font-medium text-ink-soft">
                {cost30 === 0 ? "持平" : `${cost30 < 0 ? "↓" : "↑"} ${yuan(Math.abs(cost30))}`}
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-ink-soft">新购入</div>
            <div className="mt-1 font-semibold tabular-nums">{data.comparison30.acquiredCount} 件</div>
          </div>
        </div>
        <p className="mt-4 text-xs text-ink-soft">
          30 天前现值 ¥{yuan(data.comparison30.valueThen, 0)} → 今天 ¥{yuan(data.comparison30.valueNow, 0)}。
          {usageDelta > 0.03
            ? " 你没有变得更会买，而是更会使用。"
            : data.comparison30.acquiredCount === 0
              ? " 这段时间把本金留在了已有资产上。"
              : ""}
        </p>
      </section>

      <TodayRitual counts={data.todayRituals} assets={data.ritualAssets} skills={data.ritualSkills} />

      <section className="card p-5">
        <h2 className="text-sm font-semibold">人生时间轴</h2>
        {data.timeline.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">还没有事件。先记一笔，或点一下上面的今日动作。</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {data.timeline.map((item) => (
              <li key={item.id} className="flex gap-3 text-sm">
                <span className="w-16 shrink-0 text-xs text-ink-soft tabular-nums">{item.date.slice(5)}</span>
                <div className="min-w-0">
                  {item.href ? (
                    <Link href={item.href} className="font-medium hover:underline">
                      {item.title}
                    </Link>
                  ) : (
                    <div className="font-medium">{item.title}</div>
                  )}
                  <div className="text-xs text-ink-soft">{item.detail}</div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
