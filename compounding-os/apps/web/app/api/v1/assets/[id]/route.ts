import { apiError, apiOk } from "@/lib/api";
import { getAssetDetail } from "@/lib/queries";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = getAssetDetail(id);
  if (!detail) return apiError("not_found", "资产不存在", 404);
  return apiOk(detail);
}
