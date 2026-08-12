import { createDb, ensureSchema, getDbPath } from "./client";

const db = createDb();
ensureSchema(db);
console.log(`schema ready at ${getDbPath()}`);
