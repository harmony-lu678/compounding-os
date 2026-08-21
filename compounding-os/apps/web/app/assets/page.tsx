import { AssetListPanel } from "@/components/AssetListPanel";
import { getAssetList } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const assets = await getAssetList();
  return <AssetListPanel assets={assets} />;
}
