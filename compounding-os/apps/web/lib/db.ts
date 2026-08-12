import { ensureSchema, getDb } from "@compos/db";

let initialized = false;

export function db() {
  const instance = getDb();
  if (!initialized) {
    ensureSchema(instance);
    initialized = true;
  }
  return instance;
}
