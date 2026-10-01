"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocale } from "@/components/ClientProviders";
import { t } from "@/lib/i18n";
import { formatDate, cn } from "@/lib/utils";

type TaskRow = {
  id: string;
  title: string;
  body?: string | null;
  status: string;
  dueAt?: string | null;
  lead?: {
    title?: string | null;
    contact?: { displayName?: string | null } | null;
  } | null;
  assignee?: { id: string; name: string } | null;
};

export default function TasksPage() {
  const { locale } = useLocale();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [filter, setFilter] = useState<"open" | "done" | "all">("open");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const statusQuery = filter === "all" ? "" : `&status=${filter}`;
    const res = await fetch(`/api/tasks?pageSize=100${statusQuery}`);
    const data = await res.json();
    setTasks(data.tasks || []);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function complete(id: string) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    await load();
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim() || null,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        }),
      });
      if (!response.ok) throw new Error((await response.json()).error?.message || "Could not create task");
      setTitle("");
      setBody("");
      setDueAt("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create task");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">{t(locale, "tasks")}</h1>
        <p className="text-sm text-slate-500">
          {locale === "tr"
            ? "Takip görevlerini oluşturun, filtreleyin ve tamamlayın."
            : "Create, filter, and complete follow-up tasks."}
        </p>
      </div>

      <form onSubmit={create} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold">{locale === "tr" ? "Yeni görev" : "New task"}</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={locale === "tr" ? "Görev başlığı" : "Task title"}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          required
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={locale === "tr" ? "Detay / yorum (isteğe bağlı)" : "Details / comments (optional)"}
          rows={3}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {busy ? "…" : locale === "tr" ? "Ekle" : "Add task"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      <div className="flex gap-2">
        {(["open", "done", "all"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-bold capitalize",
              filter === key ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600",
            )}
          >
            {key}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {tasks.map((task) => {
          const overdue = task.status === "open" && task.dueAt && new Date(task.dueAt) < new Date();
          return (
            <div
              key={task.id}
              className={cn(
                "flex items-center justify-between gap-4 rounded-2xl border bg-white p-4 shadow-sm",
                overdue ? "border-red-200" : "border-slate-200",
              )}
            >
              <div>
                <div className="font-semibold">{task.title}</div>
                {task.body && <p className="mt-1 text-sm text-slate-600">{task.body}</p>}
                <div className="mt-1 text-xs text-slate-500">
                  {task.lead?.contact?.displayName || task.assignee?.name || "—"} ·{" "}
                  {formatDate(task.dueAt, locale === "tr" ? "tr-TR" : "en-US")}
                  {overdue ? (locale === "tr" ? " · GECİKMİŞ" : " · OVERDUE") : ""}
                </div>
              </div>
              {task.status === "open" ? (
                <button
                  onClick={() => complete(task.id)}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"
                >
                  Done
                </button>
              ) : (
                <span className="text-xs font-bold uppercase text-emerald-600">Done</span>
              )}
            </div>
          );
        })}
        {!tasks.length && (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            {locale === "tr" ? "Gösterilecek görev yok." : "No tasks to show."}
          </p>
        )}
      </div>
    </div>
  );
}
