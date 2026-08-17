import { DataImport } from "@/components/DataImport";
import { SettingsEditor } from "@/components/SettingsEditor";
import { getCategoryDefaults } from "@/lib/category-settings";

export default async function SettingsPage() {
  const defaults = await getCategoryDefaults();

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight">设定</h1>
        <p className="mt-1 text-sm text-ink-soft">改类目默认怎么算，或把旧数据批量导进来。不提供批量导出。</p>
      </div>

      <DataImport />
      <SettingsEditor initial={defaults} />
    </div>
  );
}
