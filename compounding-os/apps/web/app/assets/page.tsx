import Link from "next/link";
import { DurableAssetRow, ConsumableAssetRow } from "@/components/AssetRows";
import { getAssetList } from "@/lib/queries";

export default async function AssetsPage() {
  const assets = await getAssetList();
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6">
        <h1 className="text-[32px] font-semibold tracking-tight text-ink">所有资产</h1>
        
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="text-sm text-ink-soft">
            {assets.length} 件进行中的资产
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-line/30 p-1 rounded-lg">
              <button className="px-3 py-1 text-sm font-medium bg-card shadow-sm rounded-md text-ink">全部</button>
              <button className="px-3 py-1 text-sm font-medium text-ink-soft hover:text-ink">耐用品</button>
              <button className="px-3 py-1 text-sm font-medium text-ink-soft hover:text-ink">消耗品</button>
            </div>
            
            <Link
              href="/assets/new"
              className="hidden sm:inline-flex rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-card hover:opacity-90 transition-opacity"
            >
              + 录入资产
            </Link>
          </div>
        </div>
      </div>

      <div className="card divide-y divide-line">
        {assets.length === 0 && (
          <div className="p-8 text-center text-sm text-ink-soft">
            还没有录入任何资产。
          </div>
        )}
        {assets.map((asset) => {
          if (asset.kind === "durable") {
            return <DurableAssetRow key={asset.id} asset={asset} />
          } else {
            return <ConsumableAssetRow key={asset.id} asset={asset} />
          }
        })}
      </div>
    </div>
  );
}
