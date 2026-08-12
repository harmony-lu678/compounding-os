/**
 * 示例种子脚本（占位版本）。
 *
 * 原始版本用于导入作者本人的历史资产台账，因为包含个人真实购买记录（品名/价格/日期），
 * 未随本仓库公开——这里保留同样的导入模式，换成占位示例数据，方便你参照改成自己的数据。
 *
 * 运行：pnpm --filter @compos/web seed
 */
import { createDb, ensureSchema, createAsset, listAssets } from "@compos/db";
import { getDurableDefault } from "@compos/core";

interface RawDurableRow {
  occurredAt: string;
  name: string;
  priceYuan: number;
  category: string;
}

interface RawConsumableRow {
  occurredAt: string;
  name: string;
  priceYuan: number;
}

// 把下面两个数组换成你自己的历史台账即可（名称/价格/购入日期/类目）。
const DURABLE_ROWS: RawDurableRow[] = [
  { occurredAt: "2026-03-04", name: "示例：笔记本电脑", priceYuan: 8000.0, category: "电子产品" },
  { occurredAt: "2025-11-19", name: "示例：外套", priceYuan: 300.0, category: "衣物" },
];

const CONSUMABLE_ROWS: RawConsumableRow[] = [
  { occurredAt: "2025-11-19", name: "示例：洗发水", priceYuan: 40.0 },
  { occurredAt: "2025-10-25", name: "示例：会员订阅", priceYuan: 88.0 },
];

function guessSubcategory(name: string): string | undefined {
  if (/洗发|沐浴|洗护/.test(name)) return "洗护";
  if (/vip|会员/i.test(name)) return "会员服务";
  if (/口红|遮瑕|眉膏|散粉|粉底|腮红|眼线|彩妆/.test(name)) return "彩妆";
  if (/面霜|精华|乳液|爽肤|防晒|隔离|护肤/.test(name)) return "护肤";
  return undefined;
}

function toCents(yuan: number): number {
  return Math.round(yuan * 100);
}

async function main() {
  const db = createDb();
  ensureSchema(db);

  const existingNames = new Set(listAssets(db).map((a) => a.name));
  let created = 0;
  let skipped = 0;

  for (const row of DURABLE_ROWS) {
    if (existingNames.has(row.name)) {
      skipped += 1;
      continue;
    }
    const def = getDurableDefault(row.category);
    createAsset(db, {
      kind: "durable",
      name: row.name,
      category: row.category,
      priceCents: toCents(row.priceYuan),
      occurredAt: row.occurredAt,
      payload: {
        kind: "durable",
        category: row.category,
        priceCents: toCents(row.priceYuan),
        lifespanMonths: def.lifespanMonths,
        residualRateMin: def.residualRateMin,
        residualRateMax: def.residualRateMax,
        usageFrequency: { type: "tier", tier: def.defaultFreqTier },
        sources: {
          lifespanMonths: "category_default",
          residualRate: "category_default",
          usageFrequency: "category_default",
        },
      },
    });
    created += 1;
  }

  for (const row of CONSUMABLE_ROWS) {
    if (existingNames.has(row.name)) {
      skipped += 1;
      continue;
    }
    createAsset(db, {
      kind: "consumable",
      name: row.name,
      category: "消耗品",
      priceCents: toCents(row.priceYuan),
      occurredAt: row.occurredAt,
      payload: {
        kind: "consumable",
        category: "消耗品",
        subcategory: guessSubcategory(row.name),
        priceCents: toCents(row.priceYuan),
        startDate: row.occurredAt,
      },
    });
    created += 1;
  }

  console.log(`导入完成：新建 ${created} 件，跳过（已存在同名资产） ${skipped} 件`);
}

main();
