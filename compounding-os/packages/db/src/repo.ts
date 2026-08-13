import { desc, eq, inArray } from "drizzle-orm";
import { ulid } from "ulid";
import type { Db } from "./client";
import { assets, events } from "./schema";

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

export async function exportAll(db: Db): Promise<{ assets: AssetRow[]; events: EventRow[] }> {
  const allAssets = await db.select().from(assets);
  const allEvents = await db.select().from(events);
  return { assets: allAssets as AssetRow[], events: allEvents.map(parseEventRow) };
}
