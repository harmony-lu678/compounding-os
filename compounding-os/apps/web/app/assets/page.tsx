import Link from "next/link";
import { DurableAssetRow, ConsumableAssetRow } from "@/components/AssetRows";
import { getAssetList } from "@/lib/queries";

/**
 * 分组只按 kind + primaryCostMetric 过滤，不按成本排序——
 * 成本会随「校准使用次数」实时变化，按成本排序会导致每次校准后列表跳位置，
 * 体验很差。组内顺序固定为 getAssetList() 返回的顺序（按创建时间）。
 * 想看「最贵 Top5」排名，去首页 Today 看对应榜单。
 */
export default function AssetsPage() {
  const assets = getAssetList();
  const durable = assets.filter((a) => a.kind === "durable");
  const dailyMetricDurable = durable.filter(
    (a) => a.metrics.kind === "durable" && a.metrics.durable.primaryCostMetric === "daily",
  );
  const perUseMetricDurable = durable.filter(
    (a) => a.metrics.kind === "durable" && a.metrics.durable.primaryCostMetric === "per_use",
  );

  const consumable = assets.filter((a) => a.kind === "consumable");
  const dailyMetricConsumable = consumable.filter(
    (a) => a.metrics.kind === "consumable" && a.metrics.consumable.primaryCostMetric === "daily",
  );
  const perUseMetricConsumable = consumable.filter(
    (a) => a.metrics.kind === "consumable" && a.metrics.consumable.primaryCostMetric === "per_use",
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Assets</h1>
        <Link
          href="/assets/new"
          className="rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-white"
        >
          + 录入资产
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-soft">
          持续使用类 · 按天计成本（{dailyMetricDurable.length}）
        </h2>
        <div className="card divide-y divide-line">
          {dailyMetricDurable.length === 0 && <div className="p-4 text-sm text-ink-soft">还没有电子产品/家具</div>}
          {dailyMetricDurable.map((asset) => (
            <DurableAssetRow key={asset.id} asset={asset} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-soft">
          按次使用类 · 按次计成本（{perUseMetricDurable.length}）
        </h2>
        <div className="card divide-y divide-line">
          {perUseMetricDurable.length === 0 && <div className="p-4 text-sm text-ink-soft">还没有这类资产</div>}
          {perUseMetricDurable.map((asset) => (
            <DurableAssetRow key={asset.id} asset={asset} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-soft">
          消耗品 · 按次计成本（{perUseMetricConsumable.length}）
        </h2>
        <div className="card divide-y divide-line">
          {perUseMetricConsumable.length === 0 && <div className="p-4 text-sm text-ink-soft">还没有消耗品</div>}
          {perUseMetricConsumable.map((asset) => (
            <ConsumableAssetRow key={asset.id} asset={asset} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-soft">
          消耗品 · 按天计成本 · 会员/订阅类（{dailyMetricConsumable.length}）
        </h2>
        <div className="card divide-y divide-line">
          {dailyMetricConsumable.length === 0 && <div className="p-4 text-sm text-ink-soft">还没有这类消耗品</div>}
          {dailyMetricConsumable.map((asset) => (
            <ConsumableAssetRow key={asset.id} asset={asset} />
          ))}
        </div>
      </section>
    </div>
  );
}
