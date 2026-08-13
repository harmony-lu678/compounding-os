import Link from "next/link";
import type { Range } from "@compos/core";
import { formatMoney, formatMoneyRange } from "@/lib/format";
import { getWeeklyDigest } from "@/lib/queries";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-5">
      <div className="text-xs text-ink-soft">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-soft">{hint}</div>}
    </div>
  );
}

function RankList({
  title,
  items,
  unit,
}: {
  title: string;
  items: { id: string; name: string; category: string; costCents: Range }[];
  unit: string;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium text-ink-soft">{title}</h3>
      <div className="card divide-y divide-line">
        {items.length === 0 && <div className="p-3 text-xs text-ink-soft">暂无数据</div>}
        {items.map((item) => (
          <Link key={item.id} href={`/assets/${item.id}`} className="flex items-center justify-between p-3 text-sm hover:bg-paper">
            <div>
              <div className="font-medium">{item.name}</div>
              <div className="text-xs text-ink-soft">{item.category}</div>
            </div>
            <div className="font-medium">
              {formatMoneyRange(item.costCents)} {unit}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default async function WeeklyDigestPage() {
  const digest = await getWeeklyDigest();
  const toDaily = (items: typeof digest.cheapestDaily) =>
    items.map((i) => ({ id: i.id, name: i.name, category: i.category, costCents: i.dailyCostCents }));
  const toPerUse = (items: typeof digest.cheapestPerUse) =>
    items.map((i) => ({ id: i.id, name: i.name, category: i.category, costCents: i.perUseCostCents }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold">本周摘要</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {digest.windowStart} ~ {digest.windowEnd} · 打开即生成的滚动 7 天摘要
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="本周新增资产" value={`${digest.newAssets.length} 件`} />
        <Stat label="本周校准动作" value={`${digest.calibrationTouchCount} 次`} hint="修改假设 / 校准使用次数" />
        <Stat label="今日资产成本合计" value={formatMoneyRange(digest.todayCostCents)} />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-soft">待校准提醒（超过 20 天没碰过）</h2>
        {digest.calibrationReminders.length === 0 ? (
          <div className="card p-4 text-sm text-ink-soft">最近校准得都很及时，暂无提醒。</div>
        ) : (
          <div className="card divide-y divide-line">
            {digest.calibrationReminders.map((item) => (
              <Link
                key={item.id}
                href={`/assets/${item.id}`}
                className="flex items-center justify-between p-4 text-sm hover:bg-paper"
              >
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-ink-soft">{item.category}</div>
                </div>
                <div className="text-xs text-warn">{item.daysSinceCalibration} 天没校准 · 去看看 →</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-soft">本周新增资产</h2>
        {digest.newAssets.length === 0 ? (
          <div className="card p-4 text-sm text-ink-soft">本周还没有新增资产。</div>
        ) : (
          <div className="card divide-y divide-line">
            {digest.newAssets.map((item) => (
              <Link
                key={`${item.id}-${item.occurredAt}`}
                href={`/assets/${item.id}`}
                className="flex items-center justify-between p-4 text-sm hover:bg-paper"
              >
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-ink-soft">
                    {item.category} · {item.occurredAt}
                  </div>
                </div>
                <div className="font-medium">{formatMoney(item.priceCents)}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-soft">本周消耗品动态（用完了）</h2>
        {digest.depletedConsumables.length === 0 ? (
          <div className="card p-4 text-sm text-ink-soft">本周还没有消耗品用完。</div>
        ) : (
          <div className="card divide-y divide-line">
            {digest.depletedConsumables.map((item) => (
              <Link
                key={`${item.id}-${item.occurredAt}`}
                href={`/assets/${item.id}`}
                className="flex items-center justify-between p-4 text-sm hover:bg-paper"
              >
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-ink-soft">
                    {item.category} · 实测周期 {item.cycleDays} 天
                  </div>
                </div>
                <div className="font-medium">{formatMoney(item.dailyCostCents)} / 天</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-soft">本周排行 · 最值（成本最低）</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <RankList title="按天计成本" items={toDaily(digest.cheapestDaily)} unit="/ 天" />
          <RankList title="按次计成本" items={toPerUse(digest.cheapestPerUse)} unit="/ 次" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-soft">本周排行 · 最不值（成本最高）</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <RankList title="按天计成本" items={toDaily(digest.costliestDaily)} unit="/ 天" />
          <RankList title="按次计成本" items={toPerUse(digest.costliestPerUse)} unit="/ 次" />
        </div>
      </section>
    </div>
  );
}
