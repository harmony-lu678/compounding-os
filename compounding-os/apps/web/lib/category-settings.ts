import {
  CONSUMABLE_SUBCATEGORY_DEFAULTS,
  DURABLE_CATEGORY_DEFAULTS,
  resolveConsumableDefaults,
  resolveDurableDefaults,
  type ConsumableSubcategoryDefault,
  type DurableCategoryDefault,
} from "@compos/core";
import { getSetting, setSetting } from "@compos/db";
import { db } from "@/lib/db";

export const CATEGORY_DEFAULTS_KEY = "category_defaults";

export interface CategoryDefaults {
  durable: Record<string, DurableCategoryDefault>;
  consumable: Record<string, ConsumableSubcategoryDefault>;
}

function parseStored(raw: string | null): Partial<CategoryDefaults> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Partial<CategoryDefaults>;
  } catch {
    return {};
  }
}

export async function getCategoryDefaults(): Promise<CategoryDefaults> {
  const instance = await db();
  const stored = parseStored(await getSetting(instance, CATEGORY_DEFAULTS_KEY));
  return {
    durable: stored.durable && Object.keys(stored.durable).length > 0 ? stored.durable : { ...DURABLE_CATEGORY_DEFAULTS },
    consumable:
      stored.consumable && Object.keys(stored.consumable).length > 0
        ? stored.consumable
        : { ...CONSUMABLE_SUBCATEGORY_DEFAULTS },
  };
}

export async function saveCategoryDefaults(next: CategoryDefaults): Promise<CategoryDefaults> {
  const instance = await db();
  const durable = resolveDurableDefaults(next.durable);
  const consumable = resolveConsumableDefaults(next.consumable);
  // 用户提交的完整表即为当前设定；空表回落到内置默认
  const saved: CategoryDefaults = {
    durable: Object.keys(next.durable).length > 0 ? next.durable : durable,
    consumable: Object.keys(next.consumable).length > 0 ? next.consumable : consumable,
  };
  await setSetting(instance, CATEGORY_DEFAULTS_KEY, JSON.stringify(saved));
  return saved;
}
