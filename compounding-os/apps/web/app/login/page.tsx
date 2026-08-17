"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError("密码错误");
      }
    } catch (err) {
      setError("网络错误");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <form onSubmit={handleLogin} className="card p-8 w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-lg font-semibold">C</div>
          <h1 className="text-xl font-semibold text-ink">Compounding</h1>
          <p className="text-sm text-ink-soft mt-2">个人账本 · 单用户部署</p>
        </div>
        
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-ink">访问密码</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand bg-paper"
            placeholder="输入 APP_PASSWORD"
          />
          {error && <p className="text-xs text-ink-soft">{error}</p>}
        </div>

        <button 
          type="submit"
          className="btn-primary rounded-lg py-2 text-sm w-full"
        >
          进入账本
        </button>
      </form>
    </div>
  );
}
