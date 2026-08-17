"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { IconPlus, NAV_ICONS } from "@/components/icons";

const NAV = [
  { href: "/", label: "今日", icon: NAV_ICONS.ledger },
  { href: "/assets", label: "资产", icon: NAV_ICONS.assets },
  { href: "/weekly", label: "变化", icon: NAV_ICONS.chart },
  { href: "/settings", label: "设定", icon: NAV_ICONS.me },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/assets") {
    return (
      pathname === "/assets" ||
      pathname.startsWith("/assets/") ||
      pathname.startsWith("/skills/") ||
      pathname.startsWith("/plan")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const chromeLess = pathname === "/login" || pathname.startsWith("/assets/new");

  if (chromeLess) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col md:flex-row">
      <aside className="hidden md:flex flex-col w-[232px] h-screen border-r border-line bg-card fixed left-0 top-0 z-40 px-4 py-6">
        <Link href="/" className="flex items-center gap-3 px-2 mb-8">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand text-ink font-semibold">
            C
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold tracking-tight">Compounding</span>
            <span className="block text-xs text-ink-soft">个人账本</span>
          </span>
        </Link>

        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${active ? "nav-item-active" : ""}`}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 px-1">
          <Link
            href="/assets/new"
            className="btn-primary flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-sm"
          >
            <IconPlus size={18} />
            记一笔
          </Link>
          <div className="px-2 text-[11px] text-ink-soft/70">Self-hosted · Local</div>
        </div>
      </aside>

      <main className="flex-1 md:ml-[232px] pb-24 md:pb-10">
        <div className="mx-auto w-full max-w-[920px] px-4 pt-5 sm:px-8 md:pt-8">{children}</div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-card/95 backdrop-blur-md">
        <div className="flex items-end justify-between px-3 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {NAV.slice(0, 2).map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex w-16 flex-col items-center gap-0.5 py-1.5 text-[11px] ${
                  active ? "text-ink font-medium" : "text-ink-soft"
                }`}
              >
                <Icon size={22} />
                {item.label}
              </Link>
            );
          })}

          <div className="relative flex w-16 flex-col items-center">
            <Link
              href="/assets/new"
              className="absolute -top-5 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-ink shadow-[0_8px_20px_rgb(240,201,74,0.45)] active:scale-95"
              aria-label="记一笔"
            >
              <IconPlus size={24} />
            </Link>
            <span className="mt-8 text-[11px] text-ink-soft">记一笔</span>
          </div>

          {NAV.slice(2).map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex w-16 flex-col items-center gap-0.5 py-1.5 text-[11px] ${
                  active ? "text-ink font-medium" : "text-ink-soft"
                }`}
              >
                <Icon size={22} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
