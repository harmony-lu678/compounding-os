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

/** 统一入口：创建一个资产 = 写一条 assets 行 + 一条 acquired 事件（事务）。 */
export function createAsset(db: Db, input: CreateAssetInput): AssetRow {
  const id = input.id ?? ulid();
  const now = nowIso();

  db.transaction((tx) => {
    tx.insert(assets)
      .values({
        id,
        userId: "default",
        kind: input.kind,
        name: input.name,
        category: input.category,
        priceCents: input.priceCents,
        status: "active",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    tx.insert(events)
      .values({
        id: ulid(),
        userId: "default",
        assetId: id,
        type: "acquired",
        occurredAt: input.occurredAt,
        payload: JSON.stringify(input.payload),
        createdAt: now,
      })
      .run();
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

/** 追加事件——events 表 append-only，禁止在此提供 update/delete。 */
export function appendEvent(db: Db, input: AppendEventInput): EventRow {
  const id = ulid();
  const now = nowIso();

  db.transaction((tx) => {
    tx.insert(events)
      .values({
        id,
        userId: "default",
        assetId: input.assetId,
        type: input.type,
        occurredAt: input.occurredAt,
        payload: JSON.stringify(input.payload),
        createdAt: now,
      })
      .run();

    if (LIFECYCLE_CLOSING_TYPES.has(input.type)) {
      tx.update(assets)
        .set({ status: "disposed", updatedAt: now })
        .where(eq(assets.id, input.assetId))
        .run();
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

export function listAssets(db: Db, filter: ListAssetsFilter = {}): AssetRow[] {
  const rows = db.select().from(assets).orderBy(desc(assets.createdAt)).all();
  return rows.filter(
    (r) => (!filter.kind || r.kind === filter.kind) && (!filter.status || r.status === filter.status),
  ) as AssetRow[];
}

export function getAsset(db: Db, id: string): AssetRow | undefined {
  return db.select().from(assets).where(eq(assets.id, id)).get() as AssetRow | undefined;
}

function parseEventRow(row: typeof events.$inferSelect): EventRow {
  return { ...row, payload: JSON.parse(row.payload) };
}

export function getAssetEvents(db: Db, assetId: string): EventRow[] {
  const rows = db
    .select()
    .from(events)
    .where(eq(events.assetId, assetId))
    .orderBy(events.occurredAt, events.createdAt)
    .all();
  return rows.map(parseEventRow);
}

/** 批量取多个资产的事件，按 assetId 分组，供列表/看板一次性渲染，避免 N+1。 */
export function getEventsForAssets(db: Db, assetIds: string[]): Map<string, EventRow[]> {
  if (assetIds.length === 0) return new Map();
  const rows = db
    .select()
    .from(events)
    .where(inArray(events.assetId, assetIds))
    .orderBy(events.occurredAt, events.createdAt)
    .all();

  const grouped = new Map<string, EventRow[]>();
  for (const row of rows) {
    const parsed = parseEventRow(row);
    const list = grouped.get(parsed.assetId) ?? [];
    list.push(parsed);
    grouped.set(parsed.assetId, list);
  }
  return grouped;
}

export function exportAll(db: Db): { assets: AssetRow[]; events: EventRow[] } {
  const allAssets = db.select().from(assets).all() as AssetRow[];
  const allEvents = db.select().from(events).all().map(parseEventRow);
  return { assets: allAssets, events: allEvents };
}
