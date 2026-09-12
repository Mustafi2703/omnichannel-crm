"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  Users,
  Kanban,
  CheckSquare,
  Wallet,
  BookOpen,
  MessageSquare,
  Bell,
  CalendarDays,
  Workflow,
  Send,
  Settings2,
  LogOut,
  Languages,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { t, type Locale } from "@/lib/i18n";
import { clearClientJsonCache, prefetchClientJson } from "@/lib/client-json-cache";
import { useEffect, useState } from "react";

const nav = [
  { href: "/dashboard", key: "dashboard" as const, icon: LayoutDashboard },
  { href: "/inbox", key: "inbox" as const, icon: Inbox },
  { href: "/contacts", key: "contacts" as const, icon: Users },
  { href: "/leads", key: "leads" as const, icon: Kanban },
  { href: "/tasks", key: "tasks" as const, icon: CheckSquare },
  { href: "/events", key: "calendar" as const, icon: CalendarDays },
  { href: "/automations", key: "automations" as const, icon: Workflow },
  { href: "/campaigns", key: "campaigns" as const, icon: Send },
  { href: "/widget-settings", key: "widgetSettings" as const, icon: Settings2 },
  { href: "/operations", key: "operations" as const, icon: Settings2 },
  { href: "/costs", key: "costs" as const, icon: Wallet },
  { href: "/knowledge", key: "knowledge" as const, icon: BookOpen },
  { href: "/widget-demo", key: "widgetDemo" as const, icon: MessageSquare },
];

const routeData: Record<string, string[]> = {
  "/dashboard": ["/api/dashboard"],
  "/contacts": ["/api/contacts"],
  "/leads": ["/api/leads?q="],
  "/tasks": ["/api/tasks"],
  "/events": ["/api/events"],
  "/costs": ["/api/costs"],
  "/knowledge": ["/api/knowledge"],
  "/operations": ["/api/admin/operations"],
  "/widget-settings": ["/api/admin/widget"],
};

export function AppShell({
  children,
  locale,
  onLocale,
  userName,
}: {
  children: React.ReactNode;
  locale: Locale;
  onLocale: (l: Locale) => void;
  userName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<{ id: string; title: string; body?: string | null }[]>([]);
  const [openNotifications, setOpenNotifications] = useState(false);
  async function loadNotifications() { const response = await fetch("/api/notifications"); const data = await response.json(); const rows = data.notifications || []; setNotifications(rows); setUnread(rows.filter((item: { readAt?: string | null }) => !item.readAt).length); }
  useEffect(() => { void loadNotifications(); const source = new EventSource("/api/realtime"); source.addEventListener("summary", (event) => { const data = JSON.parse(event.data) as { unread?: number }; setUnread(data.unread || 0); }); return () => source.close(); }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      nav.forEach((item) => {
        router.prefetch(item.href);
        routeData[item.href]?.forEach(prefetchClientJson);
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [router]);

  async function logout() {
    clearClientJsonCache();
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col border-r border-slate-200 bg-[#0f172a] text-slate-100 md:flex">
          <div className="border-b border-white/10 px-5 py-5">
            <div className="text-lg font-bold tracking-tight">{t(locale, "appName")}</div>
            <div className="mt-1 text-xs text-slate-400">{t(locale, "tagline")}</div>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                    active
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t(locale, item.key)}
                </Link>
              );
            })}
          </nav>
          <div className="space-y-2 border-t border-white/10 p-4">
            <button
              onClick={() => onLocale(locale === "tr" ? "en" : "tr")}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
            >
              <Languages className="h-4 w-4" />
              {locale === "tr" ? "English" : "Türkçe"}
            </button>
            <div className="px-3 text-xs text-slate-500">{userName}</div>
            <button
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
            >
              <LogOut className="h-4 w-4" />
              {t(locale, "logout")}
            </button>
          </div>
        </aside>
        <main className="flex-1 overflow-auto">
          <div className="border-b border-slate-200 bg-white px-4 py-3 md:hidden">
            <div className="font-bold">{t(locale, "appName")}</div>
          </div>
          <div className="mx-auto max-w-7xl p-4 md:p-8"><div className="mb-3 flex justify-end"><div className="relative"><button onClick={() => { setOpenNotifications(!openNotifications); void loadNotifications(); }} className="relative rounded-lg border border-slate-200 bg-white p-2" aria-label="Notifications"><Bell className="h-4 w-4" />{unread ? <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[9px] text-white">{unread}</span> : null}</button>{openNotifications ? <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">{notifications.length ? notifications.slice(0, 8).map((n) => <button key={n.id} onClick={async () => { await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: n.id }) }); void loadNotifications(); }} className="block w-full rounded-lg p-2 text-left hover:bg-slate-50"><div className="text-sm font-semibold">{n.title}</div><div className="text-xs text-slate-500">{n.body}</div></button>) : <div className="p-3 text-sm text-slate-500">No notifications</div>}</div> : null}</div></div>{children}</div>
        </main>
      </div>
    </div>
  );
}
