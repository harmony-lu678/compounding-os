import type { IsoDate } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseIsoDate(date: IsoDate): Date {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid ISO date: ${date}`);
  }
  return d;
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  const diff = parseIsoDate(to).getTime() - parseIsoDate(from).getTime();
  return Math.round(diff / DAY_MS);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = parseIsoDate(date);
  d.setUTCDate(d.getUTCDate() + Math.round(days));
  return d.toISOString().slice(0, 10);
}

export function todayIso(): IsoDate {
  return new Date().toISOString().slice(0, 10);
}
