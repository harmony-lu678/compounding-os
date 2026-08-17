"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SkillCreateBar({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setPending(true);
    try {
      const res = await fetch("/api/v1/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) return;
      setName("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={create} className={compact ? "flex gap-2" : "flex flex-col gap-2 sm:flex-row"}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="例如：AI Agent、英语、力量训练"
        className="flex-1 rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none"
      />
      <button type="submit" disabled={pending || !name.trim()} className="btn-primary rounded-xl px-3 py-2 text-sm">
        新建能力
      </button>
    </form>
  );
}
