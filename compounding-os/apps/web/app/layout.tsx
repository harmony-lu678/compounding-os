import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Compounding OS",
  description: "记录你拥有的，计算你消耗的，衡量你积累的，预测你未来的。",
};

const NAV = [
  { href: "/", label: "今日", icon: "◉" },
  { href: "/assets", label: "资产", icon: "◇" },
  { href: "/weekly", label: "周报", icon: "◷" },
  { href: "/settings", label: "设置", icon: "⚙" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Compounding" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen antialiased bg-paper text-ink flex flex-col md:flex-row">
        {/* Mobile Top Bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-4 bg-card border-b border-line sticky top-0 z-50">
          <Link href="/" className="text-sm font-semibold tracking-tight text-ink">
            Personal Compounding OS
          </Link>
          <Link href="/assets/new" className="text-sm text-ink-soft">
            + 录入资产
          </Link>
        </header>

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 h-screen border-r border-line bg-card fixed left-0 top-0 overflow-y-auto pt-8 pb-6 px-6 z-50">
          <div className="mb-10">
            <Link href="/" className="text-lg font-semibold tracking-tight leading-tight">
              Personal<br/>Compounding<br/>OS
            </Link>
          </div>
          
          <nav className="flex flex-col gap-2 flex-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-soft transition hover:bg-paper hover:text-ink font-medium"
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-8 border-t border-line pt-6 flex flex-col gap-4">
            <Link href="/settings" className="px-3 py-2 text-sm text-ink-soft hover:text-ink font-medium">
              数据<br/>导出
            </Link>
            <div className="px-3 text-xs text-ink-soft/50">
              <p>Local</p>
              <p>Self-hosted</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-64 pb-24 md:pb-8 pt-6 px-4 sm:px-8 max-w-[1280px] w-full">
          <div className="hidden md:flex justify-end mb-8">
            <Link href="/assets/new" className="text-sm text-ink font-medium hover:underline">
              + 录入资产
            </Link>
          </div>
          <div className="max-w-[1200px]">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-line flex items-center justify-around pb-safe pt-2 z-50">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 p-2 text-ink-soft hover:text-ink"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px]">{item.label}</span>
            </Link>
          ))}
        </nav>
        
        {/* Mobile FAB */}
        <Link 
          href="/assets/new" 
          className="md:hidden fixed bottom-20 right-6 w-12 h-12 bg-ink text-card rounded-full flex items-center justify-center text-2xl shadow-lg z-50"
        >
          +
        </Link>
      </body>
    </html>
  );
}
