import { redirect } from "next/navigation";

export default async function WeeklyRedirect({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  redirect(range ? `/review?range=${range}` : "/review");
}
