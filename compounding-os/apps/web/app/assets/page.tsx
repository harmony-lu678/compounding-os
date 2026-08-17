import { AssetListPanel } from "@/components/AssetListPanel";
import { getAssetList } from "@/lib/queries";
import { getSkillSummaries } from "@/lib/skills";

export default async function AssetsPage() {
  const [assets, skills] = await Promise.all([getAssetList(), getSkillSummaries()]);

  return <AssetListPanel assets={assets} skills={skills} />;
}
