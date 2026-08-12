import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * assets 是读路径的加速表，不是事实源。
 * price_cents / kind / category 冗余存一份方便列表排序筛选；
 * 唯一事实源是 events 表——所有指标都应能从 events 重放得到。
 */
export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("default"),
  kind: text("kind", { enum: ["durable", "consumable"] }).notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  priceCents: integer("price_cents").notNull(),
  status: text("status", { enum: ["active", "disposed", "archived"] })
    .notNull()
    .default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
});

/**
 * events 是唯一事实源，append-only。禁止 UPDATE/DELETE（仓储层不提供这两个操作）。
 */
export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("default"),
  assetId: text("asset_id")
    .notNull()
    .references(() => assets.id),
  type: text("type").notNull(),
  occurredAt: text("occurred_at").notNull(),
  payload: text("payload").notNull(),
  createdAt: text("created_at").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
