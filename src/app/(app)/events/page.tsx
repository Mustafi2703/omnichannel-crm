"use client";

import { useEffect, useState } from "react";
import { CalendarClock, CalendarDays, Plus, Save } from "lucide-react";
import { useLocale } from "@/components/ClientProviders";
import { PageHeader } from "@/components/PageHeader";
import { formatDate, cn } from "@/lib/utils";

type EventRow = {
  id: string;
  title: string;
  startsAt: string;
  description?: string | null;
  status: string;
  comments?: string | null;
  contact?: { displayName: string } | null;
  owner?: { name: string } | null;
};

const STATUSES = ["scheduled", "confirmed", "completed", "cancelled", "no_show"] as const;

export default function EventsPage() {
  const { locale } = useLocale();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draftComments, setDraftComments] = useState<Record<string, string>>({});

  const load = async () => {
    const r = await fetch("/api/events");
    const data = await r.json();
    setEvents(data.events || []);
    const next: Record<string, string> = {};
    for (const event of data.events || []) next[event.id] = event.comments || "";
    setDraftComments(next);
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    if (!title || !startsAt) return;
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, startsAt: new Date(startsAt).toISOString() }),
    });
    setTitle("");
    setStartsAt("");
    void load();
  };

  const update = async (id: string, patch: { status?: string; comments?: string }) => {
    setBusyId(id);
    await fetch(`/api/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setBusyId(null);
    void load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarDays}
        title={locale === "tr" ? "Takvim ve görüşmeler" : "Calendar and meetings"}
        description={
          locale === "tr"
            ? "Oluşturduktan sonra durum ve yorum ekleyebilirsiniz."
            : "Add status and comments after creating an entry."
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="ea-card-pad space-y-3 border-t-4 border-t-ea-600 lg:sticky lg:top-24">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={locale === "tr" ? "Görüşme başlığı" : "Meeting title"}
            className="ea-input"
          />
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="ea-input sm:flex-1 lg:flex-none"
            />
            <button onClick={create} className="ea-btn-primary">
              <Plus className="h-4 w-4" />
              {locale === "tr" ? "Ekle" : "Add"}
            </button>
          </div>
        </div>

        <div className="min-w-0 space-y-3">
          {events.map((event) => (
            <div key={event.id} className="ea-card p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-ea-50 to-aqua-50 text-ea-600 ring-1 ring-inset ring-ea-600/10">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="break-words font-bold text-ea-950">{event.title}</div>
                    <div className="mt-0.5 text-sm text-slate-500">
                      {formatDate(event.startsAt, locale === "tr" ? "tr-TR" : "en-US")} ·{" "}
                      {event.contact?.displayName || event.owner?.name || "—"}
                    </div>
                  </div>
                </div>
                <select
                  disabled={busyId === event.id}
                  value={event.status || "scheduled"}
                  onChange={(e) => update(event.id, { status: e.target.value })}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide disabled:opacity-60",
                    {
                      "border-ea-200 bg-ea-50 text-ea-700": !event.status || event.status === "scheduled",
                      "border-emerald-200 bg-emerald-50 text-emerald-700": event.status === "completed",
                      "border-amber-200 bg-amber-50 text-amber-700": event.status === "confirmed",
                      "border-red-200 bg-red-50 text-red-700": event.status === "cancelled" || event.status === "no_show",
                    },
                  )}
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                <label className="ea-label">{locale === "tr" ? "Yorumlar" : "Comments"}</label>
                <textarea
                  value={draftComments[event.id] || ""}
                  onChange={(e) => setDraftComments((prev) => ({ ...prev, [event.id]: e.target.value }))}
                  rows={2}
                  className="ea-input resize-y"
                  placeholder={locale === "tr" ? "Görüşme sonrası not…" : "Post-meeting note…"}
                />
                <div className="flex justify-end">
                  <button
                    disabled={busyId === event.id}
                    onClick={() => update(event.id, { comments: draftComments[event.id] || "" })}
                    className="ea-btn-sm"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {locale === "tr" ? "Yorumu kaydet" : "Save comment"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
