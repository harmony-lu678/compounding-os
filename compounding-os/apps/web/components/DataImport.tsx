"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DataImport() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setPending(true);
    setMessage(null);
    try {
      const text = await file.text();
      const body = JSON.parse(text);
      const res = await fetch("/api/v1/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message ?? "导入失败");
      const r = json.result as {
        assets: { inserted: number; skipped: number };
        events: { inserted: number; skipped: number };
        skills: { inserted: number; skipped: number };
        lifeEvents: { inserted: number; skipped: number };
      };
      setMessage(
        `导入完成：资产 +${r.assets.inserted}（跳过 ${r.assets.skipped}）· 事件 +${r.events.inserted} · 能力 +${r.skills.inserted} · 生活记录 +${r.lifeEvents.inserted}`,
      );
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "导入失败，请确认是本产品的 JSON");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card p-5">
      <h2 className="mb-1 text-sm font-medium">批量导入</h2>
      <p className="mb-3 text-xs text-ink-soft">
        只进不出。上传以前的 JSON 数据包，已有记录按 id 跳过，不会覆盖。不提供批量导出。
      </p>
      <label className="btn-primary inline-flex cursor-pointer rounded-xl px-3 py-2 text-sm">
        {pending ? "正在导入…" : "选择 JSON 文件"}
        <input
          type="file"
          accept="application/json,.json"
          className="hidden"
          disabled={pending}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </label>
      {message && <p className="mt-3 text-xs text-ink-soft">{message}</p>}
    </section>
  );
}
