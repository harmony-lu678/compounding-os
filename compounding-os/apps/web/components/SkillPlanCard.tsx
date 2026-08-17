"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SKILL_STATUSES } from "@/lib/plan-types";

export function SkillPlanCard({
  skillId,
  initial,
}: {
  skillId: string;
  initial: {
    status: string;
    hours: number;
    moneyYuan: number;
    applications: number;
    weeklyHours: number;
    outcome: string;
  };
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initial.status);
  const [hours, setHours] = useState(String(initial.hours));
  const [money, setMoney] = useState(String(initial.moneyYuan));
  const [applications, setApplications] = useState(String(initial.applications));
  const [weeklyHours, setWeeklyHours] = useState(String(initial.weeklyHours));
  const [outcome, setOutcome] = useState(initial.outcome);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/skills/${skillId}/plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          hours: Number(hours) || 0,
          moneyYuan: Number(money) || 0,
          applications: Number(applications) || 0,
          weeklyHours: Number(weeklyHours) || 0,
          outcome,
        }),
      });
      if (!res.ok) throw new Error("保存失败");
      setMessage("能力账户已更新。不做星级，只记投入和产出。");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "保存失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="card space-y-4 p-5" onSubmit={save}>
      <div>
        <h2 className="text-sm font-semibold">能力账户</h2>
        <p className="mt-1 text-xs text-ink-soft">时间、金钱、用过几次、产出了什么。不评等级。</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {SKILL_STATUSES.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setStatus(item.key)}
            className={`rounded-2xl px-3 py-1.5 text-sm ${status === item.key ? "bg-brand" : "bg-paper"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-ink-soft">
          累计投入小时
          <input value={hours} onChange={(e) => setHours(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink" />
        </label>
        <label className="text-xs text-ink-soft">
          累计投入金钱
          <input value={money} onChange={(e) => setMoney(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink" />
        </label>
        <label className="text-xs text-ink-soft">
          实际应用次数
          <input value={applications} onChange={(e) => setApplications(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink" />
        </label>
        <label className="text-xs text-ink-soft">
          每周打算给它几小时
          <input value={weeklyHours} onChange={(e) => setWeeklyHours(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink" />
        </label>
      </div>
      <label className="block text-xs text-ink-soft">
        已经产生的结果（收入、效率、项目，写人话即可）
        <textarea
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink"
        />
      </label>
      <button type="submit" disabled={pending} className="btn-primary rounded-2xl px-4 py-2 text-sm">
        保存能力账户
      </button>
      {message && <p className="text-xs text-ink-soft">{message}</p>}
    </form>
  );
}
