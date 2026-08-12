import { apiOk } from "@/lib/api";
import { getDashboardData } from "@/lib/queries";

export async function GET() {
  return apiOk(getDashboardData());
}
