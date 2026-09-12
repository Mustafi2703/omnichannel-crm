"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/components/ClientProviders";
import { t } from "@/lib/i18n";
import { formatMoney, formatDate } from "@/lib/utils";
import { getClientJson, invalidateClientJson } from "@/lib/client-json-cache";

type Stage = { id: string; key: string; name: string; nameTr: string };
type LeadRow = {
  id: string;
  title: string;
  score: number;
  source: string;
  expectedValue?: number | null;
  nextFollowupAt?: string | null;
  stageId: string;
  stage?: Stage;
  contact?: { displayName?: string | null };
};

export default function LeadsPage() {
  const { locale } = useLocale();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [q, setQ] = useState("");

  const load = useCallback(async (query = "") => {
    const data = await getClientJson<{ leads?: LeadRow[]; stages?: Stage[] }>(`/api/leads?q=${encodeURIComponent(query)}`);
    setLeads(data.leads || []);
    setStages(data.stages || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function moveStage(id: string, stageId: string) {
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, stageId }),
    });
    invalidateClientJson("/api/leads");
    load(q);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">{t(locale, "leads")}</h1>
          <p className="text-sm text-slate-500">
            {locale === "tr" ? "Pipeline + skor + kaynak + takip" : "Pipeline + score + source + follow-up"}
          </p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder={t(locale, "search")}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">{t(locale, "source")}</th>
              <th className="px-4 py-3">{t(locale, "stage")}</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">{t(locale, "followUp")}</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="border-b border-slate-50">
                <td className="px-4 py-3">
                  <div className="font-semibold">{l.title}</div>
                  <div className="text-xs text-slate-500">{l.contact?.displayName}</div>
                </td>
                <td className="px-4 py-3 capitalize">{l.source}</td>
                <td className="px-4 py-3">
                  <select
                    className="rounded-lg border border-slate-200 px-2 py-1"
                    value={l.stageId}
                    onChange={(e) => moveStage(l.id, e.target.value)}
                  >
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {locale === "tr" ? s.nameTr : s.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 font-bold text-blue-700">{l.score}</td>
                <td className="px-4 py-3">{formatMoney(l.expectedValue || 0)}</td>
                <td className="px-4 py-3 text-xs">
                  {formatDate(l.nextFollowupAt, locale === "tr" ? "tr-TR" : "en-US")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
