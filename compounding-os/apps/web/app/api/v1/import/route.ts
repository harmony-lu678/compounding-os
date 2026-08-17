import { importAll, type ImportSnapshot } from "@compos/db";
import { apiError, apiOk } from "@/lib/api";
import { db } from "@/lib/db";

function pickSnapshot(body: unknown): ImportSnapshot | null {
  if (!body || typeof body !== "object") return null;
  const root = body as Record<string, unknown>;
  const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;
  if (!data.assets && !data.events && !data.skills && !data.lifeEvents) return null;
  return {
    assets: Array.isArray(data.assets) ? data.assets : [],
    events: Array.isArray(data.events) ? data.events : [],
    skills: Array.isArray(data.skills) ? data.skills : [],
    lifeEvents: Array.isArray(data.lifeEvents) ? data.lifeEvents : [],
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const snapshot = pickSnapshot(body);
  if (!snapshot) {
    return apiError("invalid_body", "请上传本产品的 JSON 数据包（含 assets / events）");
  }

  const instance = await db();
  const result = await importAll(instance, snapshot);
  return apiOk({ result }, 201);
}
