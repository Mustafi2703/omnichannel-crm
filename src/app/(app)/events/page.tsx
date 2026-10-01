"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/ClientProviders";
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
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black">{locale === "tr" ? "Takvim ve görüşmeler" : "Calendar and meetings"}</h1>
        <p className="text-sm text-slate-500">
          {locale === "tr"
            ? "Oluşturduktan sonra durum ve yorum ekleyebilirsiniz."
            : "Add status and comments after creating an entry."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border bg-white p-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={locale === "tr" ? "Görüşme başlığı" : "Meeting title"}
          className="flex-1 rounded-lg border p-2"
        />
        <input
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          className="rounded-lg border p-2"
        />
        <button onClick={create} className="rounded-lg bg-blue-600 px-4 text-sm font-bold text-white">
          {locale === "tr" ? "Ekle" : "Add"}
        </button>
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <div key={event.id} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-bold">{event.title}</div>
                <div className="text-sm text-slate-500">
                  {formatDate(event.startsAt, locale === "tr" ? "tr-TR" : "en-US")} ·{" "}
                  {event.contact?.displayName || event.owner?.name || "—"}
                </div>
              </div>
              <select
                disabled={busyId === event.id}
                value={event.status || "scheduled"}
                onChange={(e) => update(event.id, { status: e.target.value })}
                className={cn("rounded-lg border px-2 py-1 text-xs font-semibold uppercase", {
                  "border-emerald-200 bg-emerald-50 text-emerald-700": event.status === "completed",
                  "border-amber-200 bg-amber-50 text-amber-700": event.status === "confirmed",
                  "border-red-200 bg-red-50 text-red-700": event.status === "cancelled" || event.status === "no_show",
                })}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3 space-y-2">
              <label className="block text-xs font-bold uppercase text-slate-500">
                {locale === "tr" ? "Yorumlar" : "Comments"}
              </label>
              <textarea
                value={draftComments[event.id] || ""}
                onChange={(e) => setDraftComments((prev) => ({ ...prev, [event.id]: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder={locale === "tr" ? "Görüşme sonrası not…" : "Post-meeting note…"}
              />
              <button
                disabled={busyId === event.id}
                onClick={() => update(event.id, { comments: draftComments[event.id] || "" })}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold"
              >
                {locale === "tr" ? "Yorumu kaydet" : "Save comment"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
