"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TodayRitual } from "@/components/TodayRitual";
import type { RitualCount, RitualKey, RitualOptionAsset, RitualOptionSkill, TimelineItem } from "@/lib/today-types";

export function TodayLive({
  counts,
  assets,
  skills,
  timeline,
}: {
  counts: RitualCount[];
  assets: RitualOptionAsset[];
  skills: RitualOptionSkill[];
  timeline: TimelineItem[];
}) {
  const [items, setItems] = useState(timeline);
  const [ritualCounts, setRitualCounts] = useState(counts);

  useEffect(() => {
    setItems(timeline);
  }, [timeline]);

  useEffect(() => {
    setRitualCounts(counts);
  }, [counts]);

  function onRecorded(item: TimelineItem, ritual: RitualKey, lastLabel?: string) {
    setItems((prev) => [item, ...prev.filter((p) => p.id !== item.id)].slice(0, 20));
    setRitualCounts((prev) =>
      prev.map((c) => (c.key === ritual ? { ...c, count: c.count + 1, lastLabel } : c)),
    );
  }

  return (
    <>
      <TodayRitual counts={ritualCounts} assets={assets} skills={skills} onRecorded={onRecorded} />
      <section className="card p-5">
        <h2 className="text-sm font-semibold">人生时间轴</h2>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">还没有事件。先记一笔，或点一下上面的今日动作。</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {items.map((item) => (
              <li key={item.id} className="flex gap-3 text-sm">
                <span className="w-16 shrink-0 text-xs text-ink-soft tabular-nums">{item.date.slice(5)}</span>
                <div className="min-w-0">
                  {item.href ? (
                    <Link href={item.href} className="font-medium hover:underline">
                      {item.title}
                    </Link>
                  ) : (
                    <div className="font-medium">{item.title}</div>
                  )}
                  <div className="text-xs text-ink-soft">{item.detail}</div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
