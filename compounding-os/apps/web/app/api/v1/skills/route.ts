import { createSkill, listSkills } from "@compos/db";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api";
import { db } from "@/lib/db";

const createSchema = z.object({
  name: z.string().min(1),
});

export async function GET() {
  const instance = await db();
  const skills = await listSkills(instance);
  return apiOk({ skills });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_body", "请填写能力名称");
  }

  const instance = await db();
  const skill = await createSkill(instance, parsed.data.name);
  return apiOk({ skill }, 201);
}
