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
    CREATE INDEX IF NOT EXISTS idx_events_asset_id ON events(asset_id);
    CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
  `);
}
