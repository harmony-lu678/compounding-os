import { apiError } from "@/lib/api";

export async function GET() {
  return apiError("forbidden", "不提供批量导出", 403);
}
