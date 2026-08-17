import { ChangeView } from "@/components/ChangeView";
import { getChangeData } from "@/lib/change";
import { parseChangeQuestion, parseChartRange } from "@/lib/change-types";

export default async function ChangePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; q?: string }>;
}) {
  const { range, q } = await searchParams;
  const data = await getChangeData(parseChartRange(range));
  return <ChangeView data={data} question={parseChangeQuestion(q)} />;
}
