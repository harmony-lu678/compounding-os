import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryIcon } from "@/components/category";
import { SkillLearnButton } from "@/components/SkillLearnButton";
import { SkillPlanCard } from "@/components/SkillPlanCard";
import { getSkillPlan } from "@compos/db";
import { db } from "@/lib/db";
import { getSkillView } from "@/lib/skills";

export default async function SkillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getSkillView(id);
  if (!data) notFound();
  const plan = await getSkillPlan(await db(), id);

  return (
    <div className="space-y-5">
      <Link href="/assets" className="text-xs text-ink-soft hover:text-ink">
        ← 所有资产
      </Link>

      <section className="card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="icon-chip">
              <CategoryIcon category="能力" />
            </span>
            <div>
              <div className="text-xs text-ink-soft">能力资产</div>
              <h1 className="text-[24px] font-semibold tracking-tight">{data.skill.name}</h1>
            </div>
          </div>
          <SkillLearnButton skillId={data.skill.id} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-ink-soft">学过</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{data.skill.learnCount} 次</div>
          </div>
          <div>
            <div className="text-xs text-ink-soft">做出过东西</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{data.skill.createCount} 次</div>
          </div>
        </div>
        <p className="mt-4 text-xs text-ink-soft">能力不算折旧。下面的账户记投入、应用和产出。</p>
      </section>

      <SkillPlanCard
        skillId={data.skill.id}
        initial={{
          status: plan?.status ?? "learn",
          hours: plan?.hours ?? 0,
          moneyYuan: (plan?.moneyCents ?? 0) / 100,
          applications: plan?.applications ?? 0,
          weeklyHours: plan?.weeklyHours ?? 0,
          outcome: plan?.outcome ?? "",
        }}
      />

      <section className="card p-5">
        <h2 className="text-sm font-semibold">这条能力上的记录</h2>
        {data.timeline.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">还没有记录。点上面「记下一次学习」，或从今日选这项能力。</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {data.timeline.map((item) => (
              <li key={item.id} className="flex gap-3 text-sm">
                <span className="w-16 shrink-0 text-xs text-ink-soft tabular-nums">{item.date.slice(5)}</span>
                <div className="font-medium">{item.title}</div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
