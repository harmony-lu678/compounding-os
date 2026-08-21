"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RITUALS,
  timelineItemFromRecord,
  type RitualCount,
  type RitualKey,
  type RitualOptionAsset,
  type RitualOptionSkill,
  type TimelineItem,
} from "@/lib/today-types";

type Sheet = RitualKey | null;

export function TodayRitual({
  counts,
  assets,
  skills,
  onRecorded,
}: {
  counts: RitualCount[];
  assets: RitualOptionAsset[];
  skills: RitualOptionSkill[];
  onRecorded?: (item: TimelineItem, ritual: RitualKey, lastLabel?: string) => void;
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [newSkill, setNewSkill] = useState("");
  const [saveTitle, setSaveTitle] = useState("");
  const [saveAmount, setSaveAmount] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createSkillId, setCreateSkillId] = useState("");

  const countMap = useMemo(() => Object.fromEntries(counts.map((c) => [c.key, c])), [counts]);

  const filteredAssets = assets.filter(
    (a) => !query || a.name.includes(query) || a.category.includes(query),
  );

  function close() {
    setSheet(null);
    setError(null);
    setQuery("");
    setNewSkill("");
    setSaveTitle("");
    setSaveAmount("");
    setCreateTitle("");
    setCreateSkillId("");
  }

  async function post(body: unknown) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/life-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message ?? "记录失败");
      const type = (body as { type?: RitualKey }).type;
      if (type && json.event) {
        onRecorded?.(
          timelineItemFromRecord({ type, event: json.event, label: json.label ?? "" }),
          type,
          json.label,
        );
      }
      close();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "记录失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold">今天，让什么产生了价值？</h2>
      <p className="mt-1 text-xs text-ink-soft">先选动作，再选具体对象。一次点完即闭环。</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {RITUALS.map((r) => {
          const item = countMap[r.key];
          const count = item?.count ?? 0;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => setSheet(r.key)}
              className={`rounded-2xl px-3 py-3 text-left transition-colors ${
                count > 0 ? "bg-brand text-ink" : "bg-brand-muted/70 hover:bg-brand-muted"
              }`}
            >
              <div className="text-sm font-semibold">{r.label}</div>
              <div className="mt-0.5 line-clamp-2 text-[11px] text-ink-soft">
                {count > 0 ? `${item?.lastLabel ?? r.label} · ${count} 次` : r.hint}
              </div>
            </button>
          );
        })}
      </div>

      {sheet && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/30 p-3 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-card p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">{RITUALS.find((r) => r.key === sheet)?.label}</h3>
              <button type="button" className="text-sm text-ink-soft" onClick={close}>
                取消
              </button>
            </div>

            {sheet === "use" && (
              <div className="space-y-3">
                <p className="text-xs text-ink-soft">今天具体使用了哪一件？会记到该资产的事件里。</p>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索资产"
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none"
                />
                <div className="max-h-72 space-y-1 overflow-y-auto">
                  {filteredAssets.length === 0 && <p className="py-6 text-center text-sm text-ink-soft">没有可使用的资产</p>}
                  {filteredAssets.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      disabled={pending}
                      onClick={() => post({ type: "use", assetId: a.id })}
                      className="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left hover:bg-brand-muted"
                    >
                      <span className="text-sm font-medium">{a.name}</span>
                      <span className="text-xs text-ink-soft">{a.category}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sheet === "learn" && (
              <div className="space-y-3">
                <p className="text-xs text-ink-soft">选择一项能力，或当场新建。学习次数会挂在这项能力上。</p>
                <div className="flex gap-2">
                  <input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="新能力，如 AI Agent"
                    className="flex-1 rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none"
                  />
                  <button
                    type="button"
                    disabled={pending || !newSkill.trim()}
                    onClick={() => post({ type: "learn", newSkillName: newSkill.trim() })}
                    className="btn-primary rounded-xl px-3 text-sm"
                  >
                    新建并记录
                  </button>
                </div>
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {skills.length === 0 && <p className="py-4 text-center text-sm text-ink-soft">还没有能力资产，先在上面新建一项。</p>}
                  {skills.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      disabled={pending}
                      onClick={() => post({ type: "learn", skillId: s.id })}
                      className="flex w-full rounded-2xl px-3 py-2.5 text-left text-sm font-medium hover:bg-brand-muted"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sheet === "save" && (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!saveTitle.trim()) return;
                  post({
                    type: "save",
                    title: saveTitle.trim(),
                    amountYuan: saveAmount ? Number(saveAmount) : undefined,
                  });
                }}
              >
                <p className="text-xs text-ink-soft">记下你少买或少消耗了什么，形成「节省」闭环。</p>
                <input
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="例如：没买新耳机，继续用现有的"
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none"
                  required
                />
                <input
                  value={saveAmount}
                  onChange={(e) => setSaveAmount(e.target.value)}
                  placeholder="大约省下多少元（可选）"
                  inputMode="decimal"
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none"
                />
                <p className="text-xs text-ink-soft">或者：因为用了已有资产而没买新的</p>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索已有资产"
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none"
                />
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {filteredAssets.slice(0, 20).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        post({
                          type: "save",
                          title: `继续用 ${a.name}，没有新买`,
                          assetId: a.id,
                        })
                      }
                      className="flex w-full rounded-2xl px-3 py-2 text-left text-sm hover:bg-brand-muted"
                    >
                      用 {a.name} 代替新购
                    </button>
                  ))}
                </div>
                <button type="submit" disabled={pending || !saveTitle.trim()} className="btn-primary w-full rounded-2xl py-2.5 text-sm">
                  记下这笔节省
                </button>
              </form>
            )}

            {sheet === "create" && (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!createTitle.trim()) return;
                  post({
                    type: "create",
                    title: createTitle.trim(),
                    skillId: createSkillId || undefined,
                  });
                }}
              >
                <p className="text-xs text-ink-soft">记下今天做出的东西，可挂到一项能力上。</p>
                <input
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="例如：写完 Daily Habit 方案"
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none"
                  required
                />
                {skills.length > 0 && (
                  <select
                    value={createSkillId}
                    onChange={(e) => setCreateSkillId(e.target.value)}
                    className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm"
                  >
                    <option value="">不关联能力</option>
                    {skills.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
                <button type="submit" disabled={pending || !createTitle.trim()} className="btn-primary w-full rounded-2xl py-2.5 text-sm">
                  记下这次创造
                </button>
              </form>
            )}

            {sheet === "clean" && (
              <div className="space-y-3">
                <p className="text-xs text-ink-soft">选一件资产，再选结果：整理、用完、或处置。</p>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索资产"
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none"
                />
                <div className="max-h-72 space-y-2 overflow-y-auto">
                  {filteredAssets.map((a) => (
                    <div key={a.id} className="rounded-2xl bg-paper px-3 py-2">
                      <div className="text-sm font-medium">{a.name}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button type="button" disabled={pending} className="btn-secondary rounded-xl px-2.5 py-1 text-xs" onClick={() => post({ type: "clean", assetId: a.id, action: "tidy" })}>
                          整理了
                        </button>
                        {a.kind === "consumable" && (
                          <button type="button" disabled={pending} className="btn-secondary rounded-xl px-2.5 py-1 text-xs" onClick={() => post({ type: "clean", assetId: a.id, action: "depleted" })}>
                            用完了
                          </button>
                        )}
                        <button type="button" disabled={pending} className="btn-secondary rounded-xl px-2.5 py-1 text-xs" onClick={() => post({ type: "clean", assetId: a.id, action: "disposed" })}>
                          卖掉/丢掉
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="mt-3 text-xs text-ink-soft">{error}</p>}
          </div>
        </div>
      )}
    </section>
  );
}
