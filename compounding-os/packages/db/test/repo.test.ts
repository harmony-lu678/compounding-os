import { beforeEach, describe, expect, it } from "vitest";
import { createDb, ensureSchema, type Db } from "../src/client.js";
import { appendEvent, createAsset, getAsset, getAssetEvents, listAssets } from "../src/repo.js";

let db: Db;

beforeEach(() => {
  db = createDb(":memory:");
  ensureSchema(db);
});

describe("repo", () => {
  it("createAsset 写入 assets 行 + acquired 事件", () => {
    const asset = createAsset(db, {
      kind: "durable",
      name: "MacBook Air",
      category: "电子产品",
      priceCents: 400000,
      occurredAt: "2026-03-04",
      payload: { kind: "durable", category: "电子产品", priceCents: 400000 },
    });

    expect(getAsset(db, asset.id)?.name).toBe("MacBook Air");
    const evts = getAssetEvents(db, asset.id);
    expect(evts).toHaveLength(1);
    expect(evts[0]?.type).toBe("acquired");
  });

  it("appendEvent 追加事件；disposed/depleted 会把资产状态改为 disposed", () => {
    const asset = createAsset(db, {
      kind: "consumable",
      name: "洗发水",
      category: "消耗品",
      priceCents: 4000,
      occurredAt: "2026-01-01",
      payload: { kind: "consumable", category: "消耗品", priceCents: 4000, startDate: "2026-01-01" },
    });

    appendEvent(db, { assetId: asset.id, type: "depleted", occurredAt: "2026-03-01", payload: {} });

    expect(getAssetEvents(db, asset.id)).toHaveLength(2);
    expect(getAsset(db, asset.id)?.status).toBe("disposed");
  });

  it("listAssets 支持按 kind 过滤", () => {
    createAsset(db, {
      kind: "durable",
      name: "A",
      category: "电子产品",
      priceCents: 100,
      occurredAt: "2026-01-01",
      payload: {},
    });
    createAsset(db, {
      kind: "consumable",
      name: "B",
      category: "消耗品",
      priceCents: 100,
      occurredAt: "2026-01-01",
      payload: {},
    });

    expect(listAssets(db, { kind: "consumable" })).toHaveLength(1);
    expect(listAssets(db)).toHaveLength(2);
  });
});
