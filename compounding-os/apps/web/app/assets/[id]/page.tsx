import { notFound } from "next/navigation";
import { AssetActions } from "@/components/AssetActions";
import { MetricBlock } from "@/components/AssumptionList";
import {
  categoryColor,
  formatMoney,
  formatMoneyRange,
  primaryConsumableCost,
  primaryDurableCost,
  USAGE_RATING_LABEL,
} from "@/lib/format";
import { getAssetDetail } from "@/lib/queries";

const EVENT_LABEL: Record<string, string> = {
  acquired: "购入",
  assumption_changed: "校准假设",
  usage_calibrated: "校准使用次数",
  usage_logged: "使用一次",
  maintenance_added: "维护/耗材支出",
  valued: "记录估值",
  depleted: "用完",
  disposed: "处置",
};

function eventDetail(event: { type: string; payload: unknown }): string | null {
  if (event.type === "usage_calibrated") {
    const p = event.payload as { periodDays: number; count: number };
    return `最近 ${p.periodDays} 天用了 ${p.count} 次`;
  }
  return null;
}

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getAssetDetail(id);
  if (!detail) notFound();

  const { asset, events } = detail;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className={`tag ${categoryColor(asset.category)}`}>{asset.category}</span>
            <span className="tag bg-neutral-100 text-neutral-600">
              {asset.status === "active" ? "使用中" : asset.status === "disposed" ? "已结束" : "已归档"}
            </span>
          </div>
          <h1 className="text-lg font-semibold">{asset.name}</h1>
          <p className="mt-1 text-sm text-ink-soft">购入价 {formatMoney(asset.priceCents)} · {asset.createdAt.slice(0, 10)}</p>
        </div>
      </div>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-medium text-ink-soft">操作</h2>
        <AssetActions
          kind={asset.kind}
          status={asset.status}
          assetId={asset.id}
          category={asset.category}
          heldDays={
            asset.metrics.kind === "durable" ? asset.metrics.durable.daysHeld : asset.metrics.consumable.daysSinceStart
          }
        />
      </section>

      {asset.metrics.kind === "durable" ? (
        (() => {
          const durable = asset.metrics.durable;
          const isDaily = durable.primaryCostMetric === "daily";
          const primary = primaryDurableCost(durable);
          return (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-ink-soft">
                成本指标 ·{" "}
                <span className="tag bg-accent/10 text-accent">
                  该类目按{isDaily ? "天" : "次"}计成本
                </span>{" "}
                · <span className="font-medium text-ink">{USAGE_RATING_LABEL[durable.usageRating]}</span>
                {" "}· 已持有 {durable.daysHeld} 天
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MetricBlock
                  label={`${primary.label}（主指标）`}
                  valueLabel={`${formatMoneyRange(primary.range)} ${primary.unit}`}
                  assumptions={isDaily ? durable.realizedDailyCostCents.assumptions : durable.perUseCostCents.assumptions}
                />
                <MetricBlock
                  label={isDaily ? "单次使用成本" : "已实现日均成本"}
                  valueLabel={
                    isDaily
                      ? `${formatMoneyRange(durable.perUseCostCents.value)} / 次`
                      : `${formatMoneyRange(durable.realizedDailyCostCents.value)} / 天`
                  }
                  assumptions={isDaily ? durable.perUseCostCents.assumptions : durable.realizedDailyCostCents.assumptions}
                />
                <MetricBlock
                  label="当前估值（剩余价值）"
                  valueLabel={formatMoneyRange(durable.currentValueCents.value, 0)}
                  assumptions={durable.currentValueCents.assumptions}
                />
                <MetricBlock
                  label="全周期日均成本（预估）"
                  valueLabel={`${formatMoneyRange(durable.fullLifecycleDailyCostCents.value)} / 天`}
                  assumptions={durable.fullLifecycleDailyCostCents.assumptions}
                />
                <MetricBlock
                  label="估算累计使用次数"
                  valueLabel={`${Math.round(durable.estimatedUsageCount.value.min)}~${Math.round(durable.estimatedUsageCount.value.max)} 次`}
                  assumptions={durable.estimatedUsageCount.assumptions}
                />
              </div>
            </section>
          );
        })()
      ) : (
        (() => {
          const consumable = asset.metrics.consumable;
          const isDaily = consumable.primaryCostMetric === "daily";
          const primary = primaryConsumableCost(consumable);
          return (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-ink-soft">
            消耗指标 ·{" "}
            <span className="tag bg-accent/10 text-accent">该类目按{isDaily ? "天" : "次"}计成本</span>{" "}
            · {consumable.status === "completed" ? "已用完" : "进行中"} · 已使用{" "}
            {consumable.daysSinceStart} 天
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetricBlock
              label={`${primary.label}（主指标）`}
              valueLabel={`${formatMoneyRange(primary.range)} ${primary.unit}`}
              assumptions={isDaily ? consumable.dailyCostCents.assumptions : consumable.perUseCostCents.assumptions}
            />
            <MetricBlock
              label={isDaily ? "单次成本" : "每日成本"}
              valueLabel={
                isDaily
                  ? `${formatMoneyRange(consumable.perUseCostCents.value)} / 次`
                  : `${formatMoneyRange(consumable.dailyCostCents.value)} / 天`
              }
              assumptions={isDaily ? consumable.perUseCostCents.assumptions : consumable.dailyCostCents.assumptions}
            />
            <MetricBlock
              label="消耗周期"
              valueLabel={`${Math.round(consumable.cycleDays.value.min)}~${Math.round(consumable.cycleDays.value.max)} 天`}
              assumptions={consumable.cycleDays.assumptions}
            />
            <MetricBlock
              label="估算累计使用次数"
              valueLabel={`${Math.round(consumable.estimatedUsageCount.value.min)}~${Math.round(consumable.estimatedUsageCount.value.max)} 次`}
              assumptions={consumable.estimatedUsageCount.assumptions}
            />
          </div>
          {consumable.predictedDepletionDate && (
            <p className="text-xs text-ink-soft">
              预计用完日期：{consumable.predictedDepletionDate.min} ~ {consumable.predictedDepletionDate.max}
            </p>
          )}
        </section>
          );
        })()
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-soft">事件时间线</h2>
        <div className="card divide-y divide-line">
          {events.map((event) => (
            <div key={event.id} className="flex items-center justify-between p-3 text-sm">
              <div>
                <span className="font-medium">{EVENT_LABEL[event.type] ?? event.type}</span>
                {eventDetail(event) && <span className="ml-2 text-xs text-ink-soft">{eventDetail(event)}</span>}
              </div>
              <span className="text-xs text-ink-soft">{event.occurredAt}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
