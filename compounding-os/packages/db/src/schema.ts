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
  captureMode: text("capture_mode"),
  seasonality: text("seasonality"),
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

/** 能力资产：学习投入挂在这里，不走耐用品折旧引擎。 */
export const skills = sqliteTable("skills", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("default"),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
});

/** 物理资产的未来计划：意图、更换窗口、触发条件。不是裁决。 */
export const assetPlans = sqliteTable("asset_plans", {
  assetId: text("asset_id")
    .primaryKey()
    .references(() => assets.id),
  intent: text("intent").notNull().default("continue"),
  replaceCostCents: integer("replace_cost_cents"),
  windowStart: text("window_start"),
  windowEnd: text("window_end"),
  triggerYears: text("trigger_years"),
  triggerMaintPct: text("trigger_maint_pct"),
  triggerUses: integer("trigger_uses"),
  triggerNote: text("trigger_note"),
  updatedAt: text("updated_at").notNull(),
});

/** 资产更新储备金（sinking fund）。 */
export const assetReserves = sqliteTable("asset_reserves", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  targetCents: integer("target_cents").notNull(),
  targetDate: text("target_date").notNull(),
  currentCents: integer("current_cents").notNull().default(0),
  assetId: text("asset_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** 能力账户：投入与产出，不做星级。 */
export const skillPlans = sqliteTable("skill_plans", {
  skillId: text("skill_id")
    .primaryKey()
    .references(() => skills.id),
  status: text("status").notNull().default("learn"),
  hours: integer("hours").notNull().default(0),
  moneyCents: integer("money_cents").notNull().default(0),
  applications: integer("applications").notNull().default(0),
  weeklyHours: integer("weekly_hours").notNull().default(0),
  outcome: text("outcome"),
  updatedAt: text("updated_at").notNull(),
});

/** 人生事件：不挂在某件资产上，支撑 Daily Ritual / 复利时间轴。 */
export const lifeEvents = sqliteTable("life_events", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("default"),
  type: text("type").notNull(),
  occurredAt: text("occurred_at").notNull(),
  payload: text("payload").notNull(),
  createdAt: text("created_at").notNull(),
});
