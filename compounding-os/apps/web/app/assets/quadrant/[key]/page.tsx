import Link from "next/link";
import { notFound } from "next/navigation";
import { DurableAssetRow } from "@/components/AssetRows";
import { formatMoneyRange } from "@/lib/format";
import { getQuadrantAssets, QUADRANT_LABELS, type QuadrantKey } from "@/lib/queries";

function isQuadrantKey(value: string): value is QuadrantKey {
  return value in QUADRANT_LABELS;
}

function sumValueCents(assets: Awaited<ReturnType<typeof getQuadrantAssets>>) {
  return assets.reduce(
    (acc, a) => {
      if (a.metrics.kind !== "durable") return acc;
      return {
        min: acc.min + a.metrics.durable.currentValueCents.value.min,
        max: acc.max + a.metrics.durable.currentValueCents.value.max,
      };
    },
    { min: 0, max: 0 },
  );
}

export default async function QuadrantAssetsPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!isQuadrantKey(key)) notFound();

  const assets = await getQuadrantAssets(key);
  const valueCents = sumValueCents(assets);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-xs text-ink-soft hover:text-accent">
          ← 返回 Today
        </Link>
        <h1 className="mt-2 text-lg font-semibold">{QUADRANT_LABELS[key]}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {assets.length} 件 · 现值 {formatMoneyRange(valueCents, 0)}
        </p>
      </div>

      <div className="card divide-y divide-line">
        {assets.length === 0 && <div className="p-4 text-sm text-ink-soft">该象限暂无资产</div>}
        {assets.map((asset) => (
          <DurableAssetRow key={asset.id} asset={asset} />
        ))}
      </div>
    </div>
  );
}
