/**
 * 导入第一批资产数据（用户在录入 web 端前的历史台账）。
 *
 * 说明：原始数据里的「日均」列是 价格 ÷ 已持有天数（不含残值/寿命/使用频率假设），
 * 这份脚本导入后，系统会用类目默认的寿命/残值率/使用频率重新计算「已实现日均成本」
 * 「单次使用成本」等指标——数字会和原始表格不完全一致，这是预期行为（原始表格是
 * 朴素摊销，系统给出的是带残值假设的估算，且带区间和假设面板，可随时校准）。
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

const DURABLE_ROWS: RawDurableRow[] = [
  { occurredAt: "2026-07-09", name: "升降床边桌", priceYuan: 37.95, category: "家具" },
  { occurredAt: "2026-06-14", name: "AirPods pro3代", priceYuan: 1050.0, category: "电子产品" },
  { occurredAt: "2026-04-25", name: "幸棉无肩带内衣", priceYuan: 75.0, category: "衣物" },
  { occurredAt: "2026-03-04", name: "MacBookAir m3+13寸", priceYuan: 4000.0, category: "电子产品" },
  { occurredAt: "2026-01-07", name: "iPhone16pro casetify手机壳", priceYuan: 55.0, category: "电子产品" },
  { occurredAt: "2025-07-23", name: "索尼wh-ch720n 头戴耳机", priceYuan: 300.0, category: "电子产品" },
  { occurredAt: "2025-06-18", name: "Adidas抽绳云朵包", priceYuan: 39.9, category: "箱包" },
  { occurredAt: "2025-04-19", name: "iPhone16pro港版", priceYuan: 7000.0, category: "电子产品" },
  { occurredAt: "2023-09-04", name: "小米吹风机", priceYuan: 30.0, category: "电器" },
  { occurredAt: "2023-03-03", name: "smoothskin脱毛仪", priceYuan: 350.0, category: "电器" },
  { occurredAt: "2021-04-19", name: "晴雨伞", priceYuan: 19.9, category: "日用品" },
  { occurredAt: "2021-01-17", name: "花漾化妆刷14支", priceYuan: 35.0, category: "日用品" },
  { occurredAt: "2020-06-22", name: "自动折叠晴雨伞", priceYuan: 40.0, category: "日用品" },
  { occurredAt: "2026-08-01", name: "辅食碗*2", priceYuan: 16.66, category: "日用品" },
  { occurredAt: "2026-07-13", name: "codicelab防晒中袖罩衫", priceYuan: 138.0, category: "衣物" },
  { occurredAt: "2026-07-13", name: "森马洞洞鞋", priceYuan: 55.0, category: "衣物" },
  { occurredAt: "2026-07-13", name: "午休折叠床", priceYuan: 42.9, category: "日用品" },
  { occurredAt: "2026-06-22", name: "电动剃毛器", priceYuan: 51.0, category: "电器" },
  { occurredAt: "2026-06-22", name: "包头半拖", priceYuan: 57.4, category: "衣物" },
  { occurredAt: "2026-06-22", name: "金丝眼镜框", priceYuan: 66.3, category: "衣物" },
  { occurredAt: "2026-06-11", name: "灰色针织短袖", priceYuan: 74.8, category: "衣物" },
  { occurredAt: "2026-05-17", name: "mitodedar雾蓝屁帘裤", priceYuan: 244.0, category: "衣物" },
  { occurredAt: "2026-05-11", name: "uodo美颜防晒隔离", priceYuan: 53.42, category: "日用品" },
  { occurredAt: "2026-05-11", name: "纪米缇灰色鱼尾包臀半身长裙", priceYuan: 69.5, category: "衣物" },
  { occurredAt: "2026-05-07", name: "yourstudio珍珠项链", priceYuan: 152.0, category: "饰品" },
  { occurredAt: "2026-04-30", name: "missmarm棉麻长袖衬衫白色", priceYuan: 67.3, category: "衣物" },
  { occurredAt: "2026-02-04", name: "豹纹发箍*2", priceYuan: 3.9, category: "饰品" },
  { occurredAt: "2026-02-02", name: "holoo金色项链", priceYuan: 169.0, category: "饰品" },
  { occurredAt: "2026-01-09", name: "ulanzi ma39手机磁吸吸盘", priceYuan: 51.92, category: "家具" },
  { occurredAt: "2025-12-25", name: "苏菲家queen 复古正肩V领长袖", priceYuan: 38.69, category: "衣物" },
  { occurredAt: "2025-11-27", name: "拉夏贝尔燕麦色长袖针织", priceYuan: 59.3, category: "衣物" },
  { occurredAt: "2025-11-27", name: "举重的妖精微光绿套装", priceYuan: 141.56, category: "衣物" },
  { occurredAt: "2025-11-25", name: "巴拉巴拉奶白羽绒服", priceYuan: 153.91, category: "衣物" },
  { occurredAt: "2025-11-24", name: "巴拉巴拉黑色羽绒服", priceYuan: 140.91, category: "衣物" },
  { occurredAt: "2025-11-19", name: "puma咖啡棕德训鞋", priceYuan: 359.1, category: "衣物" },
  { occurredAt: "2025-11-19", name: "手机防水袋", priceYuan: 5.12, category: "日用品" },
  { occurredAt: "2025-11-19", name: "胡茬叔叔灰色帽子", priceYuan: 22.8, category: "饰品" },
  { occurredAt: "2025-11-19", name: "361度游泳速干浴巾", priceYuan: 25.37, category: "日用品" },
  { occurredAt: "2025-12-15", name: "rappeye藏青色羽绒服", priceYuan: 502.2, category: "衣物" },
  { occurredAt: "2025-11-16", name: "维尼奥棕色托特奥", priceYuan: 109.73, category: "箱包" },
  { occurredAt: "2025-11-14", name: "forever21蕾丝假两件长袖", priceYuan: 81.9, category: "衣物" },
  { occurredAt: "2025-11-10", name: "花西子散粉", priceYuan: 152.89, category: "日用品" },
  { occurredAt: "2025-11-08", name: "yoloshop灰色连帽开衫毛衣", priceYuan: 151.2, category: "衣物" },
  { occurredAt: "2025-11-07", name: "衣架*30", priceYuan: 10.0, category: "日用品" },
  { occurredAt: "2025-11-06", name: "outofoffice双头遮瑕", priceYuan: 34.1, category: "日用品" },
  { occurredAt: "2025-11-06", name: "bincavidou眼线笔", priceYuan: 22.14, category: "日用品" },
  { occurredAt: "2025-11-01", name: "苏萱家纺四件套", priceYuan: 183.3, category: "床品" },
  { occurredAt: "2025-10-31", name: "大豆被", priceYuan: 66.3, category: "床品" },
  { occurredAt: "2025-10-15", name: "汇尚名店风衣", priceYuan: 155.0, category: "衣物" },
  { occurredAt: "2025-10-12", name: "纯棉睡衣", priceYuan: 80.89, category: "衣物" },
  { occurredAt: "2025-10-10", name: "aji箱包奶油黄", priceYuan: 284.0, category: "箱包" },
  { occurredAt: "2025-07-15", name: "蕾丝吊带", priceYuan: 49.0, category: "衣物" },
  { occurredAt: "2025-09-16", name: "花仪玲假两件碎花长裙", priceYuan: 79.9, category: "衣物" },
  { occurredAt: "2025-05-20", name: "素色衣库白T", priceYuan: 27.7, category: "衣物" },
  { occurredAt: "2025-05-15", name: "moment米色帽子", priceYuan: 33.69, category: "饰品" },
  { occurredAt: "2025-05-13", name: "黄玉貔貅", priceYuan: 47.0, category: "饰品" },
  { occurredAt: "2025-05-13", name: "白水晶手串", priceYuan: 35.0, category: "饰品" },
];

const CONSUMABLE_ROWS: RawConsumableRow[] = [
  { occurredAt: "2026-05-11", name: "妮维雅爽身精华12ml", priceYuan: 10.9 },
  { occurredAt: "2025-11-19", name: "自然堂洗发水", priceYuan: 41.4 },
  { occurredAt: "2025-11-19", name: "彩棠遮瑕笔", priceYuan: 69.26 },
  { occurredAt: "2025-10-25", name: "88vip", priceYuan: 88.0 },
  { occurredAt: "2025-11-06", name: "戈戈舞G04口红", priceYuan: 34.0 },
  { occurredAt: "2025-11-05", name: "insbaha染眉膏", priceYuan: 39.0 },
  { occurredAt: "2025-11-05", name: "玉泽面霜*2", priceYuan: 185.0 },
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
