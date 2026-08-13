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
          <h1 className="text-xl font-semibold text-ink">Personal Compounding OS</h1>
          <p className="text-sm text-ink-soft mt-2">单用户私有部署版</p>
        </div>
        
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-ink">访问密码</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ink bg-paper"
            placeholder="输入 APP_PASSWORD"
          />
          {error && <p className="text-xs text-warn">{error}</p>}
        </div>

        <button 
          type="submit"
          className="bg-ink text-card rounded-lg py-2 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          进入账本
        </button>
      </form>
    </div>
  );
}
