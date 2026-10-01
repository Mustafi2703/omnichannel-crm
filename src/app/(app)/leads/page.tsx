"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Kanban, Table2 } from "lucide-react";
import { useLocale } from "@/components/ClientProviders";
import { t } from "@/lib/i18n";
import { formatMoney, formatDate } from "@/lib/utils";
import { getClientJson, invalidateClientJson } from "@/lib/client-json-cache";

type Stage = { id: string; key: string; name: string; nameTr: string; sortOrder?: number };
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
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const load = useCallback(async (query = "") => {
    const data = await getClientJson<{ leads?: LeadRow[]; stages?: Stage[] }>(
      `/api/leads?q=${encodeURIComponent(query)}`,
    );
    setLeads(data.leads || []);
    setStages([...(data.stages || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
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

  const byStage = useMemo(() => {
    const map = new Map<string, LeadRow[]>();
    for (const stage of stages) map.set(stage.id, []);
    for (const lead of leads) {
      const list = map.get(lead.stageId) || [];
      list.push(lead);
      map.set(lead.stageId, list);
    }
    return map;
  }, [leads, stages]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">{t(locale, "leads")}</h1>
          <p className="text-sm text-slate-500">
            {locale === "tr" ? "Kanban pipeline + tablo görünümü" : "Kanban pipeline + table view"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(q)}
            placeholder={t(locale, "search")}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <div className="flex rounded-xl border border-slate-200 bg-white p-1">
            <button
              onClick={() => setView("kanban")}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold ${view === "kanban" ? "bg-slate-900 text-white" : "text-slate-600"}`}
            >
              <Kanban className="h-3.5 w-3.5" /> Kanban
            </button>
            <button
              onClick={() => setView("table")}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold ${view === "table" ? "bg-slate-900 text-white" : "text-slate-600"}`}
            >
              <Table2 className="h-3.5 w-3.5" /> Table
            </button>
          </div>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {stages.map((stage) => (
            <section
              key={stage.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggingId) void moveStage(draggingId, stage.id);
                setDraggingId(null);
              }}
              className="min-w-[260px] flex-1 rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-sm font-bold">{locale === "tr" ? stage.nameTr : stage.name}</h2>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">
                  {(byStage.get(stage.id) || []).length}
                </span>
              </div>
              <div className="space-y-2">
                {(byStage.get(stage.id) || []).map((lead) => (
                  <article
                    key={lead.id}
                    draggable
                    onDragStart={() => setDraggingId(lead.id)}
                    onDragEnd={() => setDraggingId(null)}
                    className="cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-sm active:cursor-grabbing"
                  >
                    <div className="font-semibold">{lead.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{lead.contact?.displayName || "—"}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 font-bold text-blue-700">
                        {lead.score}
                      </span>
                      <span className="capitalize text-slate-500">{lead.source}</span>
                      <span className="font-semibold text-slate-700">
                        {formatMoney(lead.expectedValue || 0)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
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
      )}
    </div>
  );
}
