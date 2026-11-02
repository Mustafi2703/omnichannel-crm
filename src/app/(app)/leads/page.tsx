"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Kanban, Plus, Search, Table2, Target, User, X } from "lucide-react";
import { useLocale } from "@/components/ClientProviders";
import { PageHeader } from "@/components/PageHeader";
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
      <PageHeader
        title={t(locale, "leads")}
        description={locale === "tr" ? "Kanban pipeline + tablo görünümü" : "Kanban pipeline + table view"}
        icon={Target}
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load(q)}
                placeholder={t(locale, "search")}
                className="ea-input w-56 max-w-full pl-9"
              />
            </div>
            <div className="ea-seg">
              <button
                onClick={() => setView("kanban")}
                className={`ea-seg-item ${view === "kanban" ? "ea-seg-item-active" : ""}`}
              >
                <Kanban className="h-3.5 w-3.5" /> Kanban
              </button>
              <button
                onClick={() => setView("table")}
                className={`ea-seg-item ${view === "table" ? "ea-seg-item-active" : ""}`}
              >
                <Table2 className="h-3.5 w-3.5" /> Table
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setError("");
                setNewOpen(true);
              }}
              className="ea-btn-primary"
            >
              <Plus className="h-4 w-4" />
              {t(locale, "newLead")}
            </button>
          </>
        }
      />

      {error ? <p className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      {newOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ea-950/40 p-4 backdrop-blur-sm">
          <div className="ea-card max-h-[90dvh] w-full max-w-md overflow-y-auto p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ea-950">{t(locale, "newLead")}</h2>
              <button
                type="button"
                onClick={() => setNewOpen(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-ea-50 hover:text-ea-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <label className="ea-label">
                {locale === "tr" ? "Lead başlığı" : "Lead title"}
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="ea-input mt-1.5 font-normal normal-case tracking-normal"
                />
              </label>
              <label className="ea-label">
                {locale === "tr" ? "Kişi adı" : "Contact name"}
                <input
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="ea-input mt-1.5 font-normal normal-case tracking-normal"
                />
              </label>
              {stages[0] ? (
                <p className="flex items-center gap-2 text-xs text-slate-500">
                  {locale === "tr" ? "Aşama:" : "Stage:"}{" "}
                  <span className="ea-chip">{locale === "tr" ? stages[0].nameTr : stages[0].name}</span>
                </p>
              ) : null}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNewOpen(false)}
                className="ea-btn"
              >
                {locale === "tr" ? "İptal" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={() => void createLead()}
                className="ea-btn-primary"
              >
                {creating ? (locale === "tr" ? "Oluşturuluyor…" : "Creating…") : locale === "tr" ? "Oluştur" : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {view === "kanban" ? (
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-3 md:-mx-1 md:px-1">
          {stages.map((stage, index) => {
            const stageLeads = byStage.get(stage.id) || [];
            return (
              <section
                key={stage.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggingId) void moveStage(draggingId, stage.id);
                  setDraggingId(null);
                }}
                className="flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-ea-900/[0.08] bg-slate-50/80 shadow-[0_1px_2px_rgba(13,35,71,0.04)]"
              >
                <div className={`h-1 shrink-0 ${stageAccent(stage, index)}`} />
                <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3">
                  <h2 className="truncate text-sm font-bold text-ea-950">{locale === "tr" ? stage.nameTr : stage.name}</h2>
                  <span className="ea-chip shrink-0">{stageLeads.length}</span>
                </div>
                <div className="max-h-[calc(100dvh-16rem)] min-h-24 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
                  {stageLeads.map((lead) => {
                    const valueLabel = formatLeadMoney(lead.expectedValue, dateLocale);
                    return (
                      <article
                        key={lead.id}
                        draggable
                        onDragStart={() => setDraggingId(lead.id)}
                        onDragEnd={() => setDraggingId(null)}
                        className={`cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-ea-300 hover:shadow-md hover:ring-2 hover:ring-ea-500/10 active:cursor-grabbing ${draggingId === lead.id ? "opacity-60" : ""}`}
                      >
                        <div className="break-words font-bold text-ea-950">{lead.title}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <User className="h-3 w-3 shrink-0" />
                          <span className="truncate">{lead.contact?.displayName || "—"}</span>
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="ea-chip">
                            {lead.score}
                          </span>
                          <span className="capitalize text-slate-500">{lead.source}</span>
                          {valueLabel ? (
                            <span className="ml-auto font-semibold text-ea-900">{valueLabel}</span>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="ea-table-wrap">
          <table className="ea-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>{t(locale, "source")}</th>
                <th>{t(locale, "stage")}</th>
                <th>Score</th>
                <th>Value</th>
                <th>{t(locale, "followUp")}</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td>
                    <div className="font-semibold text-ea-950">{l.title}</div>
                    <div className="text-xs text-slate-500">{l.contact?.displayName}</div>
                  </td>
                  <td className="capitalize text-slate-600">{l.source}</td>
                  <td>
                    <select
                      className="ea-input w-auto py-1.5 text-xs"
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
                  <td><span className="ea-chip">{l.score}</span></td>
                  <td className="whitespace-nowrap font-medium text-ea-900">{formatLeadMoney(l.expectedValue, dateLocale) || "—"}</td>
                  <td className="whitespace-nowrap text-xs text-slate-600">
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

const STAGE_ACCENTS = ["bg-ea-400", "bg-ea-600", "bg-aqua-500", "bg-indigo-500", "bg-sky-600", "bg-ea-800"];

function stageAccent(stage: Stage, index: number) {
  if (stage.isWon) return "bg-emerald-500";
  if (stage.isLost) return "bg-rose-500";
  return STAGE_ACCENTS[index % STAGE_ACCENTS.length];
}
