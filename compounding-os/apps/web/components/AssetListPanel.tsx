"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ConsumableAssetRow, DurableAssetRow, SkillAssetRow } from "@/components/AssetRows";
import { SkillCreateBar } from "@/components/SkillCreateBar";
import type { AssetSummary } from "@/lib/metrics";
import type { SkillSummary } from "@/lib/skill-types";

type KindFilter = "all" | "durable" | "consumable" | "skill";

const FILTERS: { key: KindFilter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "durable", label: "耐用品" },
  { key: "consumable", label: "消耗品" },
  { key: "skill", label: "能力" },
];

export function AssetListPanel({
  assets,
  skills,
}: {
  assets: AssetSummary[];
  skills: SkillSummary[];
}) {
  const [filter, setFilter] = useState<KindFilter>("all");

  const filteredAssets = useMemo(() => {
    if (filter === "skill") return [];
    if (filter === "all") return assets;
    return assets.filter((asset) => asset.kind === filter);
  }, [assets, filter]);

  const showSkills = filter === "all" || filter === "skill";
  const visibleSkills = showSkills ? skills : [];

  const durableCount = assets.filter((a) => a.kind === "durable").length;
  const consumableCount = assets.filter((a) => a.kind === "consumable").length;
  const empty = filteredAssets.length === 0 && visibleSkills.length === 0;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">所有资产</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {filter === "all" &&
              `${assets.length + skills.length} 件 · 耐用品 ${durableCount} · 消耗品 ${consumableCount} · 能力 ${skills.length}`}
            {filter === "durable" && `${filteredAssets.length} 件耐用品`}
            {filter === "consumable" && `${filteredAssets.length} 件消耗品`}
            {filter === "skill" && `${skills.length} 项能力 · 学习挂在这里，不算折旧`}
          </p>
        </div>
        <Link
          href="/plan"
          className="inline-flex shrink-0 items-center rounded-2xl btn-primary px-4 py-2 text-sm"
        >
          规划
        </Link>
      </div>

      <div className="inline-flex rounded-2xl bg-line/60 p-1" role="tablist" aria-label="资产类型筛选">
        {FILTERS.map(({ key, label }) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(key)}
              className={`rounded-xl px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active ? "segment-active" : "text-ink-soft hover:text-ink"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {filter === "skill" && (
        <div className="card p-4">
          <p className="mb-3 text-xs text-ink-soft">先在这里建一项能力，再到「今日 → 学习」记一次。</p>
          <SkillCreateBar />
        </div>
      )}

      <div className="card overflow-hidden divide-y divide-line">
        {empty ? (
          <div className="p-10 text-center text-sm text-ink-soft">
            {filter === "skill"
              ? "还没有能力资产。上面填一个名字就能建。"
              : assets.length === 0 && skills.length === 0
                ? "还没有录入任何资产。"
                : "当前筛选下没有资产。"}
          </div>
        ) : (
          <>
            {filteredAssets.map((asset) =>
              asset.kind === "durable" ? (
                <DurableAssetRow key={asset.id} asset={asset} />
              ) : (
                <ConsumableAssetRow key={asset.id} asset={asset} />
              ),
            )}
            {visibleSkills.map((skill) => (
              <SkillAssetRow key={skill.id} skill={skill} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
