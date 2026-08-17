import { FREQ_TIERS, type FreqTier } from "@compos/core";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api";
import { getCategoryDefaults, saveCategoryDefaults } from "@/lib/category-settings";

const freqSchema = z.enum(Object.keys(FREQ_TIERS) as [FreqTier, ...FreqTier[]]);
const metricSchema = z.enum(["daily", "per_use"]);

const durableSchema = z.object({
  label: z.string().min(1),
  lifespanMonths: z.number().positive(),
  residualRateMin: z.number().min(0).max(1),
  residualRateMax: z.number().min(0).max(1),
  defaultFreqTier: freqSchema,
  referenceFreqPerMonth: z.number().nonnegative(),
  costMetric: metricSchema,
});

const consumableSchema = z.object({
  label: z.string().min(1),
  cycleDaysMin: z.number().positive(),
  cycleDaysMax: z.number().positive(),
  defaultFreqTier: freqSchema,
  costMetric: metricSchema,
});

const bodySchema = z.object({
  durable: z.record(durableSchema),
  consumable: z.record(consumableSchema),
});

export async function GET() {
  const defaults = await getCategoryDefaults();
  return apiOk(defaults);
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_body", "设定格式不对，请检查数字和档位");
  }
  for (const def of Object.values(parsed.data.durable)) {
    if (def.residualRateMin > def.residualRateMax) {
      return apiError("invalid_body", "残值下限不能大于上限");
    }
  }
  for (const def of Object.values(parsed.data.consumable)) {
    if (def.cycleDaysMin > def.cycleDaysMax) {
      return apiError("invalid_body", "消耗周期下限不能大于上限");
    }
  }
  const saved = await saveCategoryDefaults(parsed.data);
  return apiOk(saved);
}
