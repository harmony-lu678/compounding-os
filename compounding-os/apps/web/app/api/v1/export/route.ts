import { NextResponse } from "next/server";
import { exportAll } from "@compos/db";
import { db as getWebDb } from "@/lib/db";

export async function GET() {
  try {
    const db = await getWebDb();
    const data = await exportAll(db);
    
    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      source: "Personal Compounding OS",
      data
    }, {
      headers: {
        "Content-Disposition": 'attachment; filename="compounding-os-export.json"'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message } }, { status: 500 });
  }
}
