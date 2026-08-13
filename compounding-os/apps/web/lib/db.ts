import { ensureSchema, getDb } from "@compos/db";

let initialized = false;

export async function db() {
  const instance = getDb();
  if (!initialized) {
    await ensureSchema(instance);
    initialized = true;
  }
  return instance;
}
