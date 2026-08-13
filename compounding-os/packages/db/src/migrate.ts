import { createDb, ensureSchema, getDbPath } from "./client";

async function main() {
  const db = createDb();
  await ensureSchema(db);
  console.log(`schema ready at ${getDbPath()}`);
}

main().catch(console.error);
