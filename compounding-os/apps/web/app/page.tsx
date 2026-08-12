import Link from "next/link";
import { formatMoneyRange } from "@/lib/format";
import { getDashboardData, type QuadrantKey } from "@/lib/queries";

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-5">
      <div className="text-xs text-ink-soft">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-soft">{hint}</div>}
    </div>
  );
}

function QuadrantCell({
  title,
  count,
  valueCents,
  tone,
  quadrantKey,
}: {
  title: string;
  count: number;
  valueCents: { min: number; max: number };
  tone: "good" | "warn" | "neutral";
  quadrantKey: QuadrantKey;
}) {
  const toneClass =
    tone === "good" ? "border-accent/30 bg-accent/5" : tone === "warn" ? "border-warn/30 bg-warn/5" : "border-line";
  return (
    <Link href={`/assets/quadrant/${quadrantKey}`} className={`block rounded-lg border p-4 transition hover:opacity-80 ${toneClass}`}>
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-1 text-lg font-semibold">{count} 件</div>
      <div className="mt-1 text-xs text-ink-soft">现值 {formatMoneyRange(valueCents, 0)}</div>
    </Link>
  );
}

export default function TodayPage() {
  const data = getDashboardData();
  const hasAssets = data.physicalAssetCount + data.consumableAssetCount > 0;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold">Today</h1>
          <p className="mt-1 text-sm text-ink-soft">{data.asOf} · 你的资产账本</p>
        </div>
        <Link
          href="/weekly"
          className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-accent hover:text-accent"
        >
          本周摘要 →
        </Link>
      </div>

      {!hasAssets ? (
        <div className="card p-8 text-center text-sm text-ink-soft">
          还没有任何资产。
          <Link href="/assets/new" className="ml-1 font-medium text-accent underline">
            录入第一件资产
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="物理资产现值"
              value={formatMoneyRange(data.totalValueCents, 0)}
              hint={`${data.physicalAssetCount} 件耐用品`}
            />
            <StatCard
              label="今日资产成本"
              value={formatMoneyRange(data.todayCostCents)}
              hint={`耐用品 ${formatMoneyRange(data.durableDailyCostCents)} · 消耗品 ${formatMoneyRange(data.consumableDailyCostCents)}`}
            />
            <StatCard
              label="低频高值资产（可释放现金）"
              value={formatMoneyRange(data.releasableCashCents, 0)}
              hint={`${data.quadrants.highValueLowFreq.count} 件，价格高但使用不频繁`}
            />
          </div>

          <section>
            <h2 className="mb-3 text-sm font-medium text-ink-soft">资产四象限（按价格中位数 × 使用频率评级）</h2>
            <div className="grid grid-cols-2 gap-3">
              <QuadrantCell
                title="高价值 · 高频使用"
                count={data.quadrants.highValueHighFreq.count}
                valueCents={data.quadrants.highValueHighFreq.valueCents}
                tone="good"
                quadrantKey="highValueHighFreq"
              />
              <QuadrantCell
                title="高价值 · 低频使用"
                count={data.quadrants.highValueLowFreq.count}
                valueCents={data.quadrants.highValueLowFreq.valueCents}
                tone="warn"
                quadrantKey="highValueLowFreq"
              />
              <QuadrantCell
                title="低价值 · 高频使用"
                count={data.quadrants.lowValueHighFreq.count}
                valueCents={data.quadrants.lowValueHighFreq.valueCents}
                tone="good"
                quadrantKey="lowValueHighFreq"
              />
              <QuadrantCell
                title="低价值 · 低频使用"
                count={data.quadrants.lowValueLowFreq.count}
                valueCents={data.quadrants.lowValueLowFreq.valueCents}
                tone="neutral"
                quadrantKey="lowValueLowFreq"
              />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <section>
              <h2 className="mb-3 text-sm font-medium text-ink-soft">日成本最高 Top 5（电子产品/家具/会员订阅）</h2>
              <div className="card divide-y divide-line">
                {data.topDailyCost.length === 0 && <div className="p-4 text-sm text-ink-soft">暂无数据</div>}
                {data.topDailyCost.map((item) => (
                  <Link
                    key={item.id}
                    href={`/assets/${item.id}`}
                    className="flex items-center justify-between p-4 text-sm hover:bg-paper"
                  >
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-ink-soft">{item.category}</div>
                    </div>
                    <div className="font-medium">{formatMoneyRange(item.dailyCostCents)} / 天</div>
                  </Link>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-medium text-ink-soft">单次成本最高 Top 5（衣物/箱包/洗护/彩妆等）</h2>
              <div className="card divide-y divide-line">
                {data.topPerUseCost.length === 0 && <div className="p-4 text-sm text-ink-soft">暂无数据</div>}
                {data.topPerUseCost.map((item) => (
                  <Link
                    key={item.id}
                    href={`/assets/${item.id}`}
                    className="flex items-center justify-between p-4 text-sm hover:bg-paper"
                  >
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-ink-soft">{item.category}</div>
                    </div>
                    <div className="font-medium">{formatMoneyRange(item.perUseCostCents)} / 次</div>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <section>
            <h2 className="mb-3 text-sm font-medium text-ink-soft">消耗品动态（进行中）</h2>
            <div className="card divide-y divide-line">
              {data.consumableInProgress.length === 0 && (
                <div className="p-4 text-sm text-ink-soft">暂无进行中的消耗品</div>
              )}
              {data.consumableInProgress.map((item) => (
                <Link
                  key={item.id}
                  href={`/assets/${item.id}`}
                  className="flex items-center justify-between p-4 text-sm hover:bg-paper"
                >
                  <div>
                    <div className="font-medium">{item.name}</div>
                    {item.predictedDepletionDate && (
                      <div className="text-xs text-ink-soft">
                        预计用完：{item.predictedDepletionDate.min} ~ {item.predictedDepletionDate.max}
                      </div>
                    )}
                  </div>
                  <div className="font-medium">
                    {item.primaryCostMetric === "daily"
                      ? `${formatMoneyRange(item.dailyCostCents)} / 天`
                      : `${formatMoneyRange(item.perUseCostCents)} / 次`}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
