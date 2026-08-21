import { ReviewView } from "@/components/ReviewView";
import { getChangeData } from "@/lib/change";
import { parseChartRange } from "@/lib/change-types";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const data = await getChangeData(parseChartRange(range));
  return <ReviewView data={data} />;
}
