"use client";

import { useEffect, useState } from "react";
import {
  AlarmClock,
  GitBranch,
  LayoutDashboard,
  MessagesSquare,
  PiggyBank,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useLocale } from "@/components/ClientProviders";
import { PageHeader } from "@/components/PageHeader";
import { t } from "@/lib/i18n";
import { cn, formatMoney } from "@/lib/utils";

const TONES = {
  ea: "bg-gradient-to-br from-ea-600 to-ea-500 text-white shadow-sm shadow-ea-600/25",
  aqua: "bg-gradient-to-br from-aqua-500 to-ea-500 text-white shadow-sm shadow-aqua-500/25",
  rose: "bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-600/10",
  emerald: "bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-600/10",
} as const;

type Dash = {
  openConvos: number;
  overdueTasks: number;
  leadsWeek: number;
  todayCost: number;
  costPerLead: number;
  margin: number;
  pipeline: { key: string; name: string; nameTr: string; count: number }[];
};

export default function DashboardPage() {
  const { locale } = useLocale();
  const [data, setData] = useState<Dash | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);
  useEffect(() => { const source = new EventSource("/api/realtime"); source.addEventListener("summary", () => { fetch("/api/dashboard").then((r) => r.json()).then(setData).catch(() => {}); }); return () => source.close(); }, []);

  const cards = data
    ? [
        { label: t(locale, "openConversations"), value: data.openConvos, icon: MessagesSquare, tone: "ea" },
        { label: t(locale, "overdue"), value: data.overdueTasks, icon: AlarmClock, tone: "rose" },
        { label: t(locale, "leadsThisWeek"), value: data.leadsWeek, icon: TrendingUp, tone: "aqua" },
        { label: t(locale, "todayCost"), value: formatMoney(data.todayCost), icon: Wallet, tone: "ea" },
        { label: t(locale, "costPerLead"), value: formatMoney(data.costPerLead), icon: Target, tone: "aqua" },
        { label: t(locale, "margin"), value: formatMoney(data.margin), icon: PiggyBank, tone: "emerald" },
      ]
    : [];

  const pipeline = data?.pipeline || [];
  const pipelineMax = Math.max(1, ...pipeline.map((s) => s.count));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LayoutDashboard}
        title={t(locale, "dashboard")}
        description={
          locale === "tr"
            ? "EA Global Water müşteri yönetimi — gelen kutusu, pipeline, yapay zeka ve günlük maliyet."
            : "EA Global Water customer management — inbox, pipeline, AI, and daily cost."
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="ea-card min-w-0 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 text-[11px] font-semibold uppercase leading-snug tracking-wide text-slate-500">
                  {c.label}
                </div>
                <div
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-xl sm:h-10 sm:w-10",
                    TONES[c.tone as keyof typeof TONES],
                  )}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
              <div className="mt-3 break-words text-2xl font-bold tracking-tight text-ea-950 tabular-nums sm:text-3xl">
                {c.value}
              </div>
            </div>
          );
        })}
      </div>

      <div className="ea-card-pad">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-ea-50 text-ea-600">
            <GitBranch className="h-4 w-4" />
          </div>
          <h2 className="ea-section-title text-base">{t(locale, "pipeline")}</h2>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {pipeline.map((s) => (
            <div
              key={s.key}
              className="min-w-0 rounded-xl border border-ea-900/[0.06] bg-gradient-to-b from-ea-50/70 to-white p-4"
            >
              <div className="truncate text-xs font-semibold text-slate-500">
                {locale === "tr" ? s.nameTr : s.name}
              </div>
              <div className="mt-2 text-2xl font-bold tabular-nums text-ea-700">{s.count}</div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ea-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-ea-600 to-aqua-500"
                  style={{ width: `${Math.round((s.count / pipelineMax) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
