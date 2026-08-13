import Link from "next/link";
import { formatMoneyRange } from "@/lib/format";
import { getDashboardData, type QuadrantKey } from "@/lib/queries";

export default async function TodayPage() {
  const data = await getDashboardData();
  const hasAssets = data.physicalAssetCount + data.consumableAssetCount > 0;
  
  // A simple greeting based on hour
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "早上好。" : hour < 18 ? "下午好。" : "晚上好。";

  return (
    <div className="space-y-12">
      <div className="flex flex-col gap-6">
        <h1 className="text-[32px] font-semibold tracking-tight text-ink">{greeting}</h1>
        
        <div>
          <h2 className="text-sm font-medium text-ink-soft mb-4">你的资产折算快照</h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card p-5 border-line shadow-sm">
              <div className="text-3xl font-semibold tracking-tight tabular-nums">
                {formatMoneyRange(data.totalValueCents, 0)}
              </div>
              <div className="mt-1 text-sm text-ink-soft">物理资产现值</div>
              <div className="mt-4 text-xs text-ink-soft">{data.physicalAssetCount + data.consumableAssetCount} 件进行中的资产</div>
            </div>
            
            <div className="card p-5 border-line shadow-sm">
              <div className="text-3xl font-semibold tracking-tight tabular-nums">
                {formatMoneyRange(data.todayCostCents)}
                <span className="text-lg font-normal text-ink-soft"> / 天</span>
              </div>
              <div className="mt-1 text-sm text-ink-soft">预估日均成本</div>
              <div className="mt-4 text-xs text-ink-soft">≈ {formatMoneyRange({ min: data.todayCostCents.min * 30, max: data.todayCostCents.max * 30 })} / 月</div>
            </div>

            <div className="card p-5 border-line shadow-sm">
              <div className="text-3xl font-semibold tracking-tight tabular-nums">0</div>
              <div className="mt-1 text-sm text-ink-soft">今日使用</div>
              <div className="mt-4 text-xs text-ink-soft">共计 0 件资产</div>
            </div>

            <div className="card p-5 border-line shadow-sm">
              <div className="text-3xl font-semibold tracking-tight tabular-nums">0</div>
              <div className="mt-1 text-sm text-ink-soft">待校准</div>
              <div className="mt-4 text-xs text-ink-soft">复阅你的底层假设</div>
            </div>
          </div>
        </div>
      </div>

      {!hasAssets ? (
        <div className="card p-8 text-center text-sm text-ink-soft">
          还没有任何资产。
          <Link href="/assets/new" className="ml-1 font-medium text-ink underline hover:text-ink-soft transition-colors">
            录入你的第一件资产
          </Link>
        </div>
      ) : (
        <div className="space-y-12">
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold tracking-tight text-ink">你的资产</h2>
              <p className="mt-1 text-sm text-ink-soft">资金正在何处为你工作。</p>
            </div>
            
            <div className="card p-6 border-line relative h-[400px] flex items-center justify-center bg-paper">
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                <div className="border-r border-b border-line/50 p-4 flex flex-col items-center justify-center text-ink-soft/30 hover:text-ink-soft/60 transition-colors">
                  <span className="text-xl font-bold tracking-widest">低频高值</span>
                </div>
                <div className="border-b border-line/50 p-4 flex flex-col items-center justify-center text-ink-soft/30 hover:text-ink-soft/60 transition-colors">
                  <span className="text-xl font-bold tracking-widest text-center">高频高值</span>
                </div>
                <div className="border-r border-line/50 p-4 flex flex-col items-center justify-center text-ink-soft/30 hover:text-ink-soft/60 transition-colors">
                  <span className="text-xl font-bold tracking-widest text-center">低频低值</span>
                </div>
                <div className="p-4 flex flex-col items-center justify-center text-ink-soft/30 hover:text-ink-soft/60 transition-colors">
                  <span className="text-xl font-bold tracking-widest text-center">高频低值</span>
                </div>
              </div>
              
              <div className="absolute top-4 bottom-4 left-4 right-4 border-l border-b border-ink/20 pointer-events-none">
                <div className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-ink-soft tracking-wider uppercase">当前现值</div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-ink-soft tracking-wider uppercase">日均成本</div>
              </div>

              {/* Simplified mock scatter points for MVP */}
              <div className="absolute inset-0 p-8 pointer-events-none">
                {data.topDailyCost.slice(0, 8).map((item, i) => (
                  <Link 
                    key={item.id} 
                    href={`/assets/${item.id}`}
                    className="absolute w-2.5 h-2.5 bg-ink rounded-full pointer-events-auto hover:scale-150 hover:bg-ink transition-transform group"
                    style={{
                      left: `${10 + (Math.random() * 80)}%`,
                      bottom: `${10 + (Math.random() * 80)}%`,
                    }}
                  >
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-card px-2 py-1 rounded text-xs border border-line shadow-sm z-10">
                      {item.name}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight text-ink mb-6">近期动态</h2>
            <div className="card divide-y divide-line overflow-hidden">
              <Link href="/assets" className="block p-4 hover:bg-paper transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-5 text-center text-ink-soft font-medium">✓</div>
                  <div>
                    <div className="font-medium text-ink group-hover:underline">跑鞋</div>
                    <div className="text-sm text-ink-soft">今日已使用</div>
                  </div>
                </div>
              </Link>
              <Link href="/assets" className="block p-4 hover:bg-paper transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-5 text-center text-ink-soft font-medium">✓</div>
                  <div>
                    <div className="font-medium text-ink group-hover:underline">洗发水</div>
                    <div className="text-sm text-ink-soft">当前周期已开始 12 天</div>
                  </div>
                </div>
              </Link>
              <Link href="/assets" className="block p-4 hover:bg-paper transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-5 text-center text-warn font-medium">~</div>
                  <div>
                    <div className="font-medium text-ink group-hover:underline">微单相机</div>
                    <div className="text-sm text-warn">待校准假设</div>
                  </div>
                </div>
              </Link>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
