import { daysBetween, todayIso } from "@compos/core";
import type { AssetSummary } from "@/lib/metrics";

export type RestockUrgency = "overdue" | "soon";

export interface RestockReminder {
  id: string;
  name: string;
  category: string;
  urgency: RestockUrgency;
  daysLeft: number;
  until: string;
  label: string;
}

const SOON_DAYS = 14;
const DAILY_GOODS_REMAINING_DAYS = 45;

function reminder(input: Omit<RestockReminder, "label"> & { label?: string }): RestockReminder {
  const label =
    input.label ??
    (input.urgency === "overdue"
      ? `按预估已经该用完了，可以补货`
      : `大约还有 ${input.daysLeft} 天，可以准备补货`);
  return { ...input, label };
}

export function restockFromSummary(asset: AssetSummary, asOf: string = todayIso()): RestockReminder | null {
  if (asset.status !== "active") return null;

  if (asset.metrics.kind === "consumable") {
    const m = asset.metrics.consumable;
    if (m.status !== "in_progress" || !m.predictedDepletionDate) return null;
    const daysLeft = daysBetween(asOf, m.predictedDepletionDate.min);
    if (daysLeft < 0) {
      return reminder({
        id: asset.id,
        name: asset.name,
        category: asset.category,
        urgency: "overdue",
        daysLeft,
        until: m.predictedDepletionDate.min,
        label: `按预估 ${m.predictedDepletionDate.min} 就该用完了，可以补货；用完后点「用完了」把周期变成实测`,
      });
    }
    if (daysLeft <= SOON_DAYS) {
      return reminder({
        id: asset.id,
        name: asset.name,
        category: asset.category,
        urgency: "soon",
        daysLeft,
        until: m.predictedDepletionDate.min,
      });
    }
    return null;
  }

  if (asset.category !== "日用品") return null;
  const m = asset.metrics.durable;
  // 日用品里既有防晒/耗材，也有伞这类耐用物。只对购入不久的做补货提醒，避免旧伞一直「该补了」。
  if (m.daysHeld > 150) return null;
  const remainingDays = 90 - m.daysHeld;
  if (remainingDays > DAILY_GOODS_REMAINING_DAYS) return null;
  return reminder({
    id: asset.id,
    name: asset.name,
    category: asset.category,
    urgency: remainingDays <= 0 ? "overdue" : "soon",
    daysLeft: remainingDays,
    until: asOf,
    label:
      remainingDays <= 0
        ? `按寿命已经到了，日用品可以看要不要补一件`
        : `按寿命大约还剩 ${remainingDays} 天，日用品可以准备补货`,
  });
}

export function collectRestockReminders(assets: AssetSummary[], asOf: string = todayIso()): RestockReminder[] {
  return assets
    .map((asset) => restockFromSummary(asset, asOf))
    .filter((item): item is RestockReminder => item !== null)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}