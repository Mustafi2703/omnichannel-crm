"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CalendarDays, CalendarRange, PieChart, TrendingUp, UserRound, Wallet } from "lucide-react";
import { useLocale } from "@/components/ClientProviders";
import { PageHeader } from "@/components/PageHeader";
import { t } from "@/lib/i18n";
import { formatMoney } from "@/lib/utils";

type CostCategory = { category: string; _sum?: { totalCost?: number | null } };
type CostsData = {
  warn?: string;
  todayCost?: number;
  monthCost?: number;
  costPerLead?: number;
  margin?: number;
  byCategory?: CostCategory[];
};

export default function CostsPage() {
  const { locale } = useLocale();
  const [data, setData] = useState<CostsData | null>(null);
  useEffect(() => {
    fetch("/api/costs")
      .then((r) => r.json())
      .then(setData);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Wallet}
        title={t(locale, "costs")}
        description={
          locale === "tr"
            ? "Günlük maliyet, lead başı maliyet ve marj görünürlüğü"
            : "Daily cost, cost-per-lead and margin visibility"
        }
      />
      {data?.warn && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 break-words">{data.warn}</span>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            [t(locale, "todayCost"), data?.todayCost, CalendarDays],
            [locale === "tr" ? "Aylık" : "Month", data?.monthCost, CalendarRange],
            [t(locale, "costPerLead"), data?.costPerLead, UserRound],
            [t(locale, "margin"), data?.margin, TrendingUp],
          ] as const
        ).map(([label, value, Icon]) => (
          <div key={String(label)} className="ea-card-pad">
            <div className="flex items-center justify-between gap-2">
              <div className="ea-label">{label as string}</div>
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ea-50 text-ea-600">
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 break-words text-2xl font-bold text-ea-950">{formatMoney(Number(value || 0))}</div>
          </div>
        ))}
      </div>
      <div className="ea-table-wrap">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-4 md:px-5">
          <PieChart className="h-4 w-4 text-ea-600" />
          <h2 className="ea-section-title">
            {locale === "tr" ? "Kategori kırılımı (bugün)" : "Category breakdown (today)"}
          </h2>
        </div>
        <table className="ea-table">
          <tbody>
            {(data?.byCategory || []).map((c) => (
              <tr key={c.category}>
                <td className="capitalize text-slate-700">{c.category}</td>
                <td className="whitespace-nowrap text-right font-semibold text-ea-950">{formatMoney(c._sum?.totalCost || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
