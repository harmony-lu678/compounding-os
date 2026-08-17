"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SkillLearnButton({ skillId }: { skillId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function log() {
    setPending(true);
    try {
      await fetch("/api/v1/life-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "learn", skillId }),
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button type="button" disabled={pending} onClick={log} className="btn-primary rounded-2xl px-4 py-2 text-sm">
      记下一次学习
    </button>
  );
}
