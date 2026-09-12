"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/ClientProviders";
import { t } from "@/lib/i18n";
import { formatMoney } from "@/lib/utils";

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
        { label: t(locale, "openConversations"), value: data.openConvos },
        { label: t(locale, "overdue"), value: data.overdueTasks },
        { label: t(locale, "leadsThisWeek"), value: data.leadsWeek },
        { label: t(locale, "todayCost"), value: formatMoney(data.todayCost) },
        { label: t(locale, "costPerLead"), value: formatMoney(data.costPerLead) },
        { label: t(locale, "margin"), value: formatMoney(data.margin) },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          {t(locale, "dashboard")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {locale === "tr"
            ? "EA Global Water müşteri yönetimi — gelen kutusu, pipeline, yapay zeka ve günlük maliyet."
            : "EA Global Water customer management — inbox, pipeline, AI, and daily cost."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {c.label}
            </div>
            <div className="mt-2 text-3xl font-black text-slate-900">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold">{t(locale, "pipeline")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {(data?.pipeline || []).map((s) => (
            <div
              key={s.key}
              className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center"
            >
              <div className="text-xs font-semibold text-slate-500">
                {locale === "tr" ? s.nameTr : s.name}
              </div>
              <div className="mt-2 text-2xl font-black text-blue-700">{s.count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
