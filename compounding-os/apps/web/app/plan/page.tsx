import { PlanView } from "@/components/PlanView";
import { getPlanOverview, parseHorizon } from "@/lib/plan";
import { PLAN_HORIZONS, type PlanHorizonKey } from "@/lib/plan-types";

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ horizon?: string }>;
}) {
  const { horizon } = await searchParams;
  const months = parseHorizon(horizon);
  const key = (PLAN_HORIZONS.find((h) => h.months === months)?.key ?? "24") as PlanHorizonKey;
  const data = await getPlanOverview(months);
  return <PlanView data={data} horizon={key} />;
}
