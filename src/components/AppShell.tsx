"use client";

import Image from "next/image";
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
  Menu,
  X,
  Droplets,
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
  mustChangePassword = false,
}: {
  children: React.ReactNode;
  locale: Locale;
  onLocale: (l: Locale) => void;
  userName?: string;
  mustChangePassword?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<{ id: string; title: string; body?: string | null }[]>([]);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const lockedOut = mustChangePassword && !pathname.startsWith("/account");
  async function loadNotifications() { const response = await fetch("/api/notifications"); const data = await response.json(); const rows = data.notifications || []; setNotifications(rows); setUnread(rows.filter((item: { readAt?: string | null }) => !item.readAt).length); }
  useEffect(() => {
    if (mustChangePassword) return;
    void loadNotifications();
    const source = new EventSource("/api/realtime");
    source.addEventListener("summary", (event) => { const data = JSON.parse(event.data) as { unread?: number }; setUnread(data.unread || 0); });
    return () => source.close();
  }, [mustChangePassword]);
  useEffect(() => {
    if (lockedOut) router.replace("/account");
  }, [lockedOut, router]);
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mustChangePassword) return;
    const timer = window.setTimeout(() => {
      nav.forEach((item) => {
        router.prefetch(item.href);
        routeData[item.href]?.forEach(prefetchClientJson);
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [router, mustChangePassword]);

  async function logout() {
    clearClientJsonCache();
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  const groups = [
    { label: locale === "tr" ? "Günlük iş" : "Daily work", hrefs: ["/dashboard", "/inbox", "/contacts", "/leads", "/tasks", "/events"] },
    { label: locale === "tr" ? "Büyüme" : "Growth", hrefs: ["/automations", "/campaigns", "/knowledge"] },
    { label: locale === "tr" ? "Kurulum" : "Setup", hrefs: ["/widget-settings", "/operations", "/costs", "/widget-demo"] },
  ];

  function Brand() {
    return (
      <Link href="/dashboard" className="block" aria-label={t(locale, "appName")}>
        <Image src="/brand/ea-global-white.png" alt="EA Global Water Systems" width={900} height={209} priority className="h-auto w-44" />
        <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-aqua-300/80">{t(locale, "tagline")}</div>
      </Link>
    );
  }

  function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <div className="space-y-5">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ea-200/50">{group.label}</div>
            <div className="space-y-0.5">
              {group.hrefs.map((href) => {
                const item = nav.find((entry) => entry.href === href);
                if (!item) return null;
                const Icon = item.icon;
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                      active
                        ? "bg-white/10 text-white ring-1 ring-white/10 before:absolute before:left-0 before:top-2 before:h-[calc(100%-1rem)] before:w-1 before:rounded-r before:bg-aqua-400"
                        : "text-ea-50/75 hover:bg-white/[0.07] hover:text-white",
                    )}
                  >
                    <Icon className={cn("h-4 w-4", active ? "text-aqua-300" : "text-ea-200/60")} />
                    {t(locale, item.key)}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function AccountFooter() {
    return (
      <div className="space-y-1 border-t border-white/10 p-3">
        <button
          onClick={() => onLocale(locale === "tr" ? "en" : "tr")}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-ea-50/80 hover:bg-white/[0.07]"
        >
          <Languages className="h-4 w-4" />
          {locale === "tr" ? "English" : "Türkçe"}
        </button>
        <Link href="/account" className="flex items-center gap-2 truncate rounded-xl px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/[0.07]">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-aqua-500/20 text-xs font-bold text-aqua-200">{(userName || "?").trim().charAt(0).toUpperCase()}</span>
          <span className="truncate">{userName}</span>
        </Link>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-ea-50/80 hover:bg-white/[0.07]"
        >
          <LogOut className="h-4 w-4" />
          {t(locale, "logout")}
        </button>
      </div>
    );
  }

  return (
    <div className="h-dvh overflow-hidden text-slate-900">
      <div className="flex h-full">
        <aside className="hidden h-full w-[17.5rem] shrink-0 flex-col bg-gradient-to-b from-ea-950 via-[#112d5a] to-ea-950 text-slate-100 md:flex">
          <div className="px-5 py-6">
            <Brand />
          </div>
          <nav className="flex-1 overflow-y-auto px-3 pb-4">
            <NavLinks />
          </nav>
          <AccountFooter />
        </aside>
        {mobileOpen ? (
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        ) : null}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[17.5rem] flex-col bg-gradient-to-b from-ea-950 via-[#112d5a] to-ea-950 text-slate-100 transition-transform duration-200 md:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between px-5 py-5">
            <Brand />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl p-2 text-ea-50/80 hover:bg-white/[0.07]"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 pb-4">
            <NavLinks onNavigate={() => setMobileOpen(false)} />
          </nav>
          <AccountFooter />
        </aside>
        <main id="app-scroll" className="flex min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ea-900/10 bg-white/80 px-4 py-3 backdrop-blur md:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-xl border border-ea-900/10 bg-white p-2 shadow-sm md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <Image src="/brand/ea-global.png" alt="EA Global Water Systems" width={900} height={209} className="h-auto w-32 md:hidden" />
              <div className="hidden items-center gap-2 text-sm font-semibold text-ea-900 md:flex">
                <Droplets className="h-4 w-4 text-aqua-500" />
                {t(locale, nav.find((item) => pathname.startsWith(item.href))?.key || "dashboard")}
              </div>
            </div>
            {mustChangePassword ? <div /> : (
              <div className="relative flex items-center gap-3">
                <Link href="/account" className="hidden items-center gap-2 rounded-xl px-2 py-1 text-sm font-medium text-ea-900 hover:bg-ea-50 sm:flex">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-ea-600 to-aqua-500 text-xs font-bold text-white">{(userName || "?").trim().charAt(0).toUpperCase()}</span>
                  <span className="max-w-40 truncate">{userName}</span>
                </Link>
                <button
                  onClick={() => { setOpenNotifications(!openNotifications); void loadNotifications(); }}
                  className="relative rounded-xl border border-ea-900/10 bg-white p-2 text-ea-800 shadow-sm hover:bg-ea-50"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {unread ? <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[9px] text-white">{unread}</span> : null}
                </button>
                {openNotifications ? (
                  <div className="absolute right-0 top-full z-20 mt-2 max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-ea-900/10 bg-white shadow-2xl">
                    <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{locale === "tr" ? "Bildirimler" : "Notifications"}</div>
                    {notifications.length ? notifications.slice(0, 8).map((n) => (
                      <button key={n.id} onClick={async () => { await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: n.id }) }); void loadNotifications(); }} className="block w-full border-b border-slate-50 px-3 py-2.5 text-left last:border-0 hover:bg-ea-50">
                        <div className="text-sm font-semibold">{n.title}</div>
                        <div className="text-xs text-slate-500">{n.body}</div>
                      </button>
                    )) : <div className="p-4 text-sm text-slate-500">{locale === "tr" ? "Bildirim yok" : "No notifications"}</div>}
                  </div>
                ) : null}
              </div>
            )}
          </header>
          <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col p-4 md:px-8 md:py-7">{lockedOut ? null : children}</div>
        </main>
      </div>
    </div>
  );
}
