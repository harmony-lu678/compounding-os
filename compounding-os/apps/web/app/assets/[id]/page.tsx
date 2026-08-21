import { notFound } from "next/navigation";
import { AssetDetailView } from "@/components/AssetDetailView";
import { buildAssetInsight } from "@/lib/asset-insight";
import { getAssetAccount } from "@/lib/plan";
import { getAssetDetail } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getAssetDetail(id);
  if (!detail) notFound();

  const account = await getAssetAccount(id);
  const insight = buildAssetInsight(detail.asset, detail.events, account);
  return <AssetDetailView data={insight} />;
}
