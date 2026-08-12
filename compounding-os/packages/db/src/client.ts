import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

let dbInstance: Db | null = null;
let sqliteInstance: Database.Database | null = null;

export function getDbPath(): string {
  return process.env.COMPOS_DB_PATH ?? "./data/app.db";
}

export function createDb(path: string = getDbPath()): Db {
  if (path !== ":memory:") {
    const dir = dirname(path);
    if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

/** 进程内单例，web 端 Route Handler 复用同一个连接。 */
export function getDb(): Db {
  if (!dbInstance) {
    dbInstance = createDb();
  }
  return dbInstance;
}

export function ensureSchema(db: Db): void {
  const sqlite = (db as unknown as { $client: Database.Database }).$client;
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default',
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default',
      asset_id TEXT NOT NULL REFERENCES assets(id),
      type TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_asset_id ON events(asset_id);
    CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
  `);
}
