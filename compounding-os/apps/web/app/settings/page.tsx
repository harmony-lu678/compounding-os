import { CONSUMABLE_SUBCATEGORY_DEFAULTS, DURABLE_CATEGORY_DEFAULTS } from "@compos/core";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-ink-soft">数据导出、类目默认值参考。</p>
      </div>

      <section className="card p-5">
        <h2 className="mb-3 text-sm font-medium">导出数据</h2>
        <p className="mb-3 text-xs text-ink-soft">
          事件级数据完整导出，随时可以拿走，不锁定在本产品里。
        </p>
        <div className="flex gap-2">
          <a href="/api/v1/export?format=json" className="rounded-md border border-line px-3 py-1.5 text-sm">
            导出 JSON
          </a>
          <a href="/api/v1/export?format=csv" className="rounded-md border border-line px-3 py-1.5 text-sm">
            导出 CSV
          </a>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-sm font-medium">耐用品类目默认值</h2>
        <table className="w-full text-left text-xs">
          <thead className="text-ink-soft">
            <tr>
              <th className="py-1">类目</th>
              <th className="py-1">预计寿命</th>
              <th className="py-1">残值率</th>
              <th className="py-1">默认频率</th>
              <th className="py-1">计费方式</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {Object.entries(DURABLE_CATEGORY_DEFAULTS).map(([key, def]) => (
              <tr key={key}>
                <td className="py-1.5">{key}</td>
                <td className="py-1.5">{(def.lifespanMonths / 12).toFixed(1)} 年</td>
                <td className="py-1.5">
                  {(def.residualRateMin * 100).toFixed(0)}%~{(def.residualRateMax * 100).toFixed(0)}%
                </td>
                <td className="py-1.5">{def.defaultFreqTier}</td>
                <td className="py-1.5">{def.costMetric === "daily" ? "按天" : "按次"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-sm font-medium">消耗品子类目默认值</h2>
        <table className="w-full text-left text-xs">
          <thead className="text-ink-soft">
            <tr>
              <th className="py-1">子类目</th>
              <th className="py-1">默认周期（天）</th>
              <th className="py-1">默认使用频率</th>
              <th className="py-1">计费方式</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {Object.entries(CONSUMABLE_SUBCATEGORY_DEFAULTS).map(([key, def]) => (
              <tr key={key}>
                <td className="py-1.5">{def.label}</td>
                <td className="py-1.5">
                  {def.cycleDaysMin}~{def.cycleDaysMax}
                </td>
                <td className="py-1.5">{def.defaultFreqTier}</td>
                <td className="py-1.5">{def.costMetric === "daily" ? "按天" : "按次"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-ink-soft">
          MVP 暂不支持在界面上覆盖默认值，如需调整请编辑 packages/core/src/defaults.ts。创建资产时可覆盖使用频率，创建后也可在详情页「校准使用频率」。
        </p>
      </section>
    </div>
  );
}
