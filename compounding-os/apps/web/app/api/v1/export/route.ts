import { exportAll } from "@compos/db";
import { db } from "@/lib/db";

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown) => {
    const s = typeof v === "string" ? v : JSON.stringify(v ?? "");
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))];
  return lines.join("\n");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "json";
  const { assets, events } = exportAll(db());

  if (format === "csv") {
    const body = [
      "# assets",
      toCsv(assets as unknown as Record<string, unknown>[]),
      "",
      "# events",
      toCsv(events.map((e) => ({ ...e, payload: JSON.stringify(e.payload) }))),
    ].join("\n");
    return new Response(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="compounding-os-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), assets, events }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="compounding-os-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
