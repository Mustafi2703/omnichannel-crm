"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Kanban, Table2, X } from "lucide-react";
import { useLocale } from "@/components/ClientProviders";
import { t } from "@/lib/i18n";
import { formatLeadMoney, formatDate } from "@/lib/utils";
import { getClientJson, invalidateClientJson } from "@/lib/client-json-cache";

type Stage = {
  id: string;
  key: string;
  name: string;
  nameTr: string;
  position?: number;
  isWon?: boolean;
  isLost?: boolean;
};
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

function parseApiError(data: { error?: string | { message?: string } }, fallback: string) {
  if (typeof data.error === "string") return data.error;
  return data.error?.message || fallback;
}

export default function LeadsPage() {
  const { locale } = useLocale();
  const dateLocale = locale === "tr" ? "tr-TR" : "en-US";
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [q, setQ] = useState("");
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (query = "") => {
    const data = await getClientJson<{ leads?: LeadRow[]; stages?: Stage[] }>(
      `/api/leads?q=${encodeURIComponent(query)}`,
    );
    setLeads(data.leads || []);
    setStages(
      [...(data.stages || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function moveStage(id: string, stageId: string) {
    const lead = leads.find((l) => l.id === id);
    if (lead?.stageId === stageId) return;
    const stage = stages.find((s) => s.id === stageId);
    if (!stage) return;

    const body: Record<string, unknown> = { stageId };

    if (stage.isWon) {
      const raw = window.prompt(
        locale === "tr" ? "Kazanç tutarı (TRY):" : "Won amount (TRY):",
      );
      if (raw === null) return;
      const wonAmount = Number(raw);
      if (!Number.isFinite(wonAmount) || wonAmount < 0) {
        setError(locale === "tr" ? "Geçerli bir tutar girin." : "Enter a valid amount.");
        return;
      }
      body.wonAmount = wonAmount;
    }
    if (stage.isLost) {
      const lostReason = window.prompt(
        locale === "tr" ? "Kaybetme nedeni:" : "Lost reason:",
      );
      if (lostReason === null) return;
      if (!lostReason.trim()) {
        setError(locale === "tr" ? "Kaybetme nedeni gerekli." : "Lost reason is required.");
        return;
      }
      body.lostReason = lostReason.trim();
    }

    setError("");
    const response = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(parseApiError(data, locale === "tr" ? "Aşama güncellenemedi." : "Could not update stage."));
      return;
    }
    invalidateClientJson("/api/leads");
    await load(q);
  }

  async function createLead() {
    const title = newTitle.trim();
    const displayName = newContactName.trim();
    const firstStage = stages[0];
    if (!title || !displayName) {
      setError(locale === "tr" ? "Başlık ve kişi adı gerekli." : "Title and contact name are required.");
      return;
    }
    if (!firstStage) {
      setError(locale === "tr" ? "Pipeline aşaması yok." : "No pipeline stages configured.");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const contactRes = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      const contactData = await contactRes.json();
      if (!contactRes.ok) {
        setError(parseApiError(contactData, locale === "tr" ? "Kişi oluşturulamadı." : "Could not create contact."));
        return;
      }
      const leadRes = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contactData.contact.id,
          stageId: firstStage.id,
          title,
        }),
      });
      const leadData = await leadRes.json();
      if (!leadRes.ok) {
        setError(parseApiError(leadData, locale === "tr" ? "Lead oluşturulamadı." : "Could not create lead."));
        return;
      }
      setNewOpen(false);
      setNewTitle("");
      setNewContactName("");
      invalidateClientJson("/api/leads");
      await load(q);
    } finally {
      setCreating(false);
    }
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
          <button
            type="button"
            onClick={() => {
              setError("");
              setNewOpen(true);
            }}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"
          >
            {t(locale, "newLead")}
          </button>
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

      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      {newOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{t(locale, "newLead")}</h2>
              <button
                type="button"
                onClick={() => setNewOpen(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <label className="block text-sm">
                {locale === "tr" ? "Lead başlığı" : "Lead title"}
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                {locale === "tr" ? "Kişi adı" : "Contact name"}
                <input
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              {stages[0] ? (
                <p className="text-xs text-slate-500">
                  {locale === "tr" ? "Aşama:" : "Stage:"}{" "}
                  {locale === "tr" ? stages[0].nameTr : stages[0].name}
                </p>
              ) : null}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNewOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold"
              >
                {locale === "tr" ? "İptal" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={() => void createLead()}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {creating ? (locale === "tr" ? "Oluşturuluyor…" : "Creating…") : locale === "tr" ? "Oluştur" : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
                {(byStage.get(stage.id) || []).map((lead) => {
                  const valueLabel = formatLeadMoney(lead.expectedValue, dateLocale);
                  return (
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
                        {valueLabel ? (
                          <span className="font-semibold text-slate-700">{valueLabel}</span>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
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
                      onChange={(e) => void moveStage(l.id, e.target.value)}
                    >
                      {stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {locale === "tr" ? s.nameTr : s.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 font-bold text-blue-700">{l.score}</td>
                  <td className="px-4 py-3">{formatLeadMoney(l.expectedValue, dateLocale) || "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    {formatDate(l.nextFollowupAt, dateLocale)}
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
