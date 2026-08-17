import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

let dbInstance: Db | null = null;
let sqliteClient: Client | null = null;

export function getDbPath(): string {
  // Can be a local file path or a turso URL
  return process.env.COMPOS_DB_URL ?? process.env.COMPOS_DB_PATH ?? "file:./data/app.db";
}

export function createDb(url: string = getDbPath()): Db {
  const isLocalFile = url.startsWith("file:") || url.startsWith("/");
  
  if (isLocalFile) {
    const actualPath = url.replace("file:", "");
    if (actualPath !== ":memory:") {
      const dir = dirname(actualPath);
      if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
    }
  }

  const authToken = process.env.COMPOS_DB_AUTH_TOKEN;

  sqliteClient = createClient({
    url,
    authToken,
  });

  return drizzle(sqliteClient, { schema });
}

/** 进程内单例，web 端 Route Handler 复用同一个连接。 */
export function getDb(): Db {
  if (!dbInstance) {
    dbInstance = createDb();
  }
  return dbInstance;
}

export async function ensureSchema(db: Db): Promise<void> {
  if (!sqliteClient) return;
  // Use multiple statements for table creation
  await sqliteClient.executeMultiple(`
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
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default',
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS life_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default',
      type TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS asset_plans (
      asset_id TEXT PRIMARY KEY REFERENCES assets(id),
      intent TEXT NOT NULL DEFAULT 'continue',
      replace_cost_cents INTEGER,
      window_start TEXT,
      window_end TEXT,
      trigger_years TEXT,
      trigger_maint_pct TEXT,
      trigger_uses INTEGER,
      trigger_note TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS asset_reserves (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      target_cents INTEGER NOT NULL,
      target_date TEXT NOT NULL,
      current_cents INTEGER NOT NULL DEFAULT 0,
      asset_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS skill_plans (
      skill_id TEXT PRIMARY KEY REFERENCES skills(id),
      status TEXT NOT NULL DEFAULT 'learn',
      hours INTEGER NOT NULL DEFAULT 0,
      money_cents INTEGER NOT NULL DEFAULT 0,
      applications INTEGER NOT NULL DEFAULT 0,
      weekly_hours INTEGER NOT NULL DEFAULT 0,
      outcome TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_asset_id ON events(asset_id);
    CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
    CREATE INDEX IF NOT EXISTS idx_life_events_occurred_at ON life_events(occurred_at);
  `);
}
