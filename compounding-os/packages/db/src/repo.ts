import { desc, eq, inArray } from "drizzle-orm";
import { ulid } from "ulid";
import type { Db } from "./client";
import { assetPlans, assetReserves, assets, events, lifeEvents, settings, skillPlans, skills } from "./schema";

export interface AssetRow {
  id: string;
  userId: string;
  kind: "durable" | "consumable";
  name: string;
  category: string;
  priceCents: number;
  status: "active" | "disposed" | "archived";
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface EventRow {
  id: string;
  userId: string;
  assetId: string;
  type: string;
  occurredAt: string;
  payload: unknown;
  createdAt: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

export interface CreateAssetInput {
  id?: string;
  kind: "durable" | "consumable";
  name: string;
  category: string;
  priceCents: number;
  occurredAt: string;
  payload: unknown;
}

export async function createAsset(db: Db, input: CreateAssetInput): Promise<AssetRow> {
  const id = input.id ?? ulid();
  const now = nowIso();

  await db.transaction(async (tx) => {
    await tx.insert(assets).values({
      id,
      userId: "default",
      kind: input.kind,
      name: input.name,
      category: input.category,
      priceCents: input.priceCents,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(events).values({
      id: ulid(),
      userId: "default",
      assetId: id,
      type: "acquired",
      occurredAt: input.occurredAt,
      payload: JSON.stringify(input.payload),
      createdAt: now,
    });
  });

  return {
    id,
    userId: "default",
    kind: input.kind,
    name: input.name,
    category: input.category,
    priceCents: input.priceCents,
    status: "active",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

export interface AppendEventInput {
  assetId: string;
  type: string;
  occurredAt: string;
  payload: unknown;
}

const LIFECYCLE_CLOSING_TYPES = new Set(["disposed", "depleted"]);

export async function appendEvent(db: Db, input: AppendEventInput): Promise<EventRow> {
  const id = ulid();
  const now = nowIso();

  await db.transaction(async (tx) => {
    await tx.insert(events).values({
      id,
      userId: "default",
      assetId: input.assetId,
      type: input.type,
      occurredAt: input.occurredAt,
      payload: JSON.stringify(input.payload),
      createdAt: now,
    });

    if (LIFECYCLE_CLOSING_TYPES.has(input.type)) {
      await tx.update(assets)
        .set({ status: "disposed", updatedAt: now })
        .where(eq(assets.id, input.assetId));
    }
  });

  return {
    id,
    userId: "default",
    assetId: input.assetId,
    type: input.type,
    occurredAt: input.occurredAt,
    payload: input.payload,
    createdAt: now,
  };
}

export interface ListAssetsFilter {
  kind?: "durable" | "consumable";
  status?: "active" | "disposed" | "archived";
}

export async function listAssets(db: Db, filter: ListAssetsFilter = {}): Promise<AssetRow[]> {
  const rows = await db.select().from(assets).orderBy(desc(assets.createdAt));
  return rows.filter(
    (r) => (!filter.kind || r.kind === filter.kind) && (!filter.status || r.status === filter.status)
  ) as AssetRow[];
}

export async function getAsset(db: Db, id: string): Promise<AssetRow | undefined> {
  const rows = await db.select().from(assets).where(eq(assets.id, id));
  return rows[0] as AssetRow | undefined;
}

function parseEventRow(row: typeof events.$inferSelect): EventRow {
  return { ...row, payload: JSON.parse(row.payload) };
}

export async function getAssetEvents(db: Db, assetId: string): Promise<EventRow[]> {
  const rows = await db.select().from(events).where(eq(events.assetId, assetId)).orderBy(events.occurredAt, events.createdAt);
  return rows.map(parseEventRow);
}

export async function getEventsForAssets(db: Db, assetIds: string[]): Promise<Map<string, EventRow[]>> {
  if (assetIds.length === 0) return new Map();
  const rows = await db.select().from(events).where(inArray(events.assetId, assetIds)).orderBy(events.occurredAt, events.createdAt);

  const grouped = new Map<string, EventRow[]>();
  for (const row of rows) {
    const parsed = parseEventRow(row);
    const list = grouped.get(parsed.assetId) ?? [];
    list.push(parsed);
    grouped.set(parsed.assetId, list);
  }
  return grouped;
}

export async function exportAll(db: Db): Promise<{
  assets: AssetRow[];
  events: EventRow[];
  lifeEvents: LifeEventRow[];
  skills: SkillRow[];
}> {
  const allAssets = await db.select().from(assets);
  const allEvents = await db.select().from(events);
  const allLife = await db.select().from(lifeEvents);
  const allSkills = await db.select().from(skills);
  return {
    assets: allAssets as AssetRow[],
    events: allEvents.map(parseEventRow),
    lifeEvents: allLife.map(parseLifeEventRow),
    skills: allSkills as SkillRow[],
  };
}

export interface SkillRow {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
}

export async function listSkills(db: Db): Promise<SkillRow[]> {
  const rows = await db.select().from(skills).orderBy(desc(skills.createdAt));
  return rows as SkillRow[];
}

export async function getSkill(db: Db, id: string): Promise<SkillRow | null> {
  const rows = await db.select().from(skills).where(eq(skills.id, id)).limit(1);
  return (rows[0] as SkillRow | undefined) ?? null;
}

export async function createSkill(db: Db, name: string): Promise<SkillRow> {
  const id = ulid();
  const now = nowIso();
  const trimmed = name.trim();
  await db.insert(skills).values({ id, userId: "default", name: trimmed, createdAt: now });
  return { id, userId: "default", name: trimmed, createdAt: now };
}

export interface LifeEventRow {
  id: string;
  userId: string;
  type: string;
  occurredAt: string;
  payload: unknown;
  createdAt: string;
}

function parseLifeEventRow(row: typeof lifeEvents.$inferSelect): LifeEventRow {
  return { ...row, payload: JSON.parse(row.payload) };
}

export async function appendLifeEvent(
  db: Db,
  input: { type: string; occurredAt: string; payload?: unknown },
): Promise<LifeEventRow> {
  const id = ulid();
  const now = nowIso();
  await db.insert(lifeEvents).values({
    id,
    userId: "default",
    type: input.type,
    occurredAt: input.occurredAt,
    payload: JSON.stringify(input.payload ?? {}),
    createdAt: now,
  });
  return {
    id,
    userId: "default",
    type: input.type,
    occurredAt: input.occurredAt,
    payload: input.payload ?? {},
    createdAt: now,
  };
}

export async function listLifeEvents(db: Db, limit = 40): Promise<LifeEventRow[]> {
  const rows = await db.select().from(lifeEvents).orderBy(desc(lifeEvents.occurredAt), desc(lifeEvents.createdAt));
  return rows.slice(0, limit).map(parseLifeEventRow);
}

export async function listAllLifeEvents(db: Db): Promise<LifeEventRow[]> {
  const rows = await db.select().from(lifeEvents).orderBy(desc(lifeEvents.occurredAt), desc(lifeEvents.createdAt));
  return rows.map(parseLifeEventRow);
}

export async function getSetting(db: Db, key: string): Promise<string | null> {
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

export async function setSetting(db: Db, key: string, value: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

export interface ImportSnapshot {
  assets?: Array<Partial<AssetRow> & { id: string; name: string; kind: "durable" | "consumable"; category: string; priceCents: number }>;
  events?: Array<Partial<EventRow> & { id: string; assetId: string; type: string; occurredAt: string }>;
  lifeEvents?: Array<Partial<LifeEventRow> & { id: string; type: string; occurredAt: string }>;
  skills?: Array<Partial<SkillRow> & { id: string; name: string }>;
}

export interface ImportResult {
  assets: { inserted: number; skipped: number };
  events: { inserted: number; skipped: number };
  skills: { inserted: number; skipped: number };
  lifeEvents: { inserted: number; skipped: number };
}

function asJson(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value ?? {});
}

export async function importAll(db: Db, snapshot: ImportSnapshot): Promise<ImportResult> {
  const result: ImportResult = {
    assets: { inserted: 0, skipped: 0 },
    events: { inserted: 0, skipped: 0 },
    skills: { inserted: 0, skipped: 0 },
    lifeEvents: { inserted: 0, skipped: 0 },
  };
  const now = nowIso();

  for (const row of snapshot.assets ?? []) {
    const inserted = await db
      .insert(assets)
      .values({
        id: row.id,
        userId: row.userId ?? "default",
        kind: row.kind,
        name: row.name,
        category: row.category,
        priceCents: row.priceCents,
        status: row.status ?? "active",
        createdAt: row.createdAt ?? now,
        updatedAt: row.updatedAt ?? now,
        deletedAt: row.deletedAt ?? null,
      })
      .onConflictDoNothing()
      .returning({ id: assets.id });
    if (inserted.length > 0) result.assets.inserted += 1;
    else result.assets.skipped += 1;
  }

  for (const row of snapshot.skills ?? []) {
    const inserted = await db
      .insert(skills)
      .values({
        id: row.id,
        userId: row.userId ?? "default",
        name: row.name,
        createdAt: row.createdAt ?? now,
      })
      .onConflictDoNothing()
      .returning({ id: skills.id });
    if (inserted.length > 0) result.skills.inserted += 1;
    else result.skills.skipped += 1;
  }

  const assetIds = new Set((await db.select({ id: assets.id }).from(assets)).map((r) => r.id));
  for (const row of snapshot.events ?? []) {
    if (!assetIds.has(row.assetId)) {
      result.events.skipped += 1;
      continue;
    }
    const inserted = await db
      .insert(events)
      .values({
        id: row.id,
        userId: row.userId ?? "default",
        assetId: row.assetId,
        type: row.type,
        occurredAt: row.occurredAt,
        payload: asJson(row.payload),
        createdAt: row.createdAt ?? now,
      })
      .onConflictDoNothing()
      .returning({ id: events.id });
    if (inserted.length > 0) result.events.inserted += 1;
    else result.events.skipped += 1;
  }

  for (const row of snapshot.lifeEvents ?? []) {
    const inserted = await db
      .insert(lifeEvents)
      .values({
        id: row.id,
        userId: row.userId ?? "default",
        type: row.type,
        occurredAt: row.occurredAt,
        payload: asJson(row.payload),
        createdAt: row.createdAt ?? now,
      })
      .onConflictDoNothing()
      .returning({ id: lifeEvents.id });
    if (inserted.length > 0) result.lifeEvents.inserted += 1;
    else result.lifeEvents.skipped += 1;
  }

  return result;
}

export type PlanIntent = "continue" | "upgrade" | "sell" | "replace";
export type SkillPlanStatus = "learn" | "practice" | "project" | "output" | "return";

export interface AssetPlanRow {
  assetId: string;
  intent: PlanIntent;
  replaceCostCents: number | null;
  windowStart: string | null;
  windowEnd: string | null;
  triggerYears: string | null;
  triggerMaintPct: string | null;
  triggerUses: number | null;
  triggerNote: string | null;
  updatedAt: string;
}

export interface AssetReserveRow {
  id: string;
  name: string;
  targetCents: number;
  targetDate: string;
  currentCents: number;
  assetId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SkillPlanRow {
  skillId: string;
  status: SkillPlanStatus;
  hours: number;
  moneyCents: number;
  applications: number;
  weeklyHours: number;
  outcome: string | null;
  updatedAt: string;
}

export async function getAssetPlan(db: Db, assetId: string): Promise<AssetPlanRow | null> {
  const rows = await db.select().from(assetPlans).where(eq(assetPlans.assetId, assetId)).limit(1);
  return (rows[0] as AssetPlanRow | undefined) ?? null;
}

export async function listAssetPlans(db: Db): Promise<AssetPlanRow[]> {
  return (await db.select().from(assetPlans)) as AssetPlanRow[];
}

export async function upsertAssetPlan(
  db: Db,
  input: Omit<AssetPlanRow, "updatedAt">,
): Promise<AssetPlanRow> {
  const updatedAt = nowIso();
  const row = { ...input, updatedAt };
  await db
    .insert(assetPlans)
    .values(row)
    .onConflictDoUpdate({
      target: assetPlans.assetId,
      set: {
        intent: row.intent,
        replaceCostCents: row.replaceCostCents,
        windowStart: row.windowStart,
        windowEnd: row.windowEnd,
        triggerYears: row.triggerYears,
        triggerMaintPct: row.triggerMaintPct,
        triggerUses: row.triggerUses,
        triggerNote: row.triggerNote,
        updatedAt,
      },
    });
  return row;
}

export async function listReserves(db: Db): Promise<AssetReserveRow[]> {
  return (await db.select().from(assetReserves).orderBy(desc(assetReserves.createdAt))) as AssetReserveRow[];
}

export async function createReserve(
  db: Db,
  input: { name: string; targetCents: number; targetDate: string; currentCents?: number; assetId?: string | null },
): Promise<AssetReserveRow> {
  const now = nowIso();
  const row: AssetReserveRow = {
    id: ulid(),
    name: input.name.trim(),
    targetCents: input.targetCents,
    targetDate: input.targetDate,
    currentCents: input.currentCents ?? 0,
    assetId: input.assetId ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(assetReserves).values(row);
  return row;
}

export async function updateReserve(
  db: Db,
  id: string,
  patch: Partial<Pick<AssetReserveRow, "name" | "targetCents" | "targetDate" | "currentCents" | "assetId">>,
): Promise<AssetReserveRow | null> {
  const existing = (await db.select().from(assetReserves).where(eq(assetReserves.id, id)).limit(1))[0] as
    | AssetReserveRow
    | undefined;
  if (!existing) return null;
  const next = { ...existing, ...patch, updatedAt: nowIso() };
  await db
    .update(assetReserves)
    .set({
      name: next.name,
      targetCents: next.targetCents,
      targetDate: next.targetDate,
      currentCents: next.currentCents,
      assetId: next.assetId,
      updatedAt: next.updatedAt,
    })
    .where(eq(assetReserves.id, id));
  return next;
}

export async function getSkillPlan(db: Db, skillId: string): Promise<SkillPlanRow | null> {
  const rows = await db.select().from(skillPlans).where(eq(skillPlans.skillId, skillId)).limit(1);
  return (rows[0] as SkillPlanRow | undefined) ?? null;
}

export async function listSkillPlans(db: Db): Promise<SkillPlanRow[]> {
  return (await db.select().from(skillPlans)) as SkillPlanRow[];
}

export async function upsertSkillPlan(db: Db, input: Omit<SkillPlanRow, "updatedAt">): Promise<SkillPlanRow> {
  const updatedAt = nowIso();
  const row = { ...input, updatedAt };
  await db
    .insert(skillPlans)
    .values(row)
    .onConflictDoUpdate({
      target: skillPlans.skillId,
      set: {
        status: row.status,
        hours: row.hours,
        moneyCents: row.moneyCents,
        applications: row.applications,
        weeklyHours: row.weeklyHours,
        outcome: row.outcome,
        updatedAt,
      },
    });
  return row;
}
