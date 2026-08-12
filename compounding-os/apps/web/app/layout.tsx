import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Compounding OS",
  description: "记录你拥有的，计算你消耗的，衡量你积累的，预测你未来的。",
};

const NAV = [
  { href: "/", label: "Today" },
  { href: "/assets", label: "Assets" },
  { href: "/weekly", label: "Weekly" },
  { href: "/settings", label: "Settings" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">
        <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6">
          <header className="mb-8 flex items-center justify-between">
            <Link href="/" className="text-sm font-semibold tracking-tight text-ink">
              Personal Compounding OS
            </Link>
            <nav className="flex gap-1 rounded-full border border-line bg-card p-1 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3 py-1.5 text-ink-soft transition hover:bg-paper hover:text-ink"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
