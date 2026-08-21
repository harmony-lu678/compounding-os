"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { IconPlus, NAV_ICONS } from "@/components/icons";

const NAV = [
  { href: "/", label: "今日", icon: NAV_ICONS.ledger },
  { href: "/assets", label: "资产", icon: NAV_ICONS.assets },
  { href: "/review", label: "变化", icon: NAV_ICONS.chart },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/season");
  if (href === "/assets") {
    return pathname === "/assets" || pathname.startsWith("/assets/") || pathname.startsWith("/skills/");
  }
  if (href === "/review") {
    return pathname === "/review" || pathname.startsWith("/review/") || pathname.startsWith("/weekly");
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
            <span className="block text-xs text-ink-soft">每日复利</span>
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
          <Link href="/settings" className="block px-2 text-xs text-ink-soft hover:text-ink">
            设定
          </Link>
        </div>
      </aside>

      <main className="flex-1 md:ml-[232px] pb-24 md:pb-10">
        <div className="mx-auto w-full max-w-[920px] px-4 pt-5 sm:px-8 md:pt-8">
          <div className="mb-3 flex justify-end md:hidden">
            <Link href="/settings" className="text-xs text-ink-soft hover:text-ink">
              设定
            </Link>
          </div>
          {children}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-card/95 backdrop-blur-md">
        <div className="flex items-center justify-around px-6 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {NAV.map((item) => {
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
