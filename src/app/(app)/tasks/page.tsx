"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  Circle,
  ListChecks,
  Plus,
  UserRound,
} from "lucide-react";
import { useLocale } from "@/components/ClientProviders";
import { PageHeader, EmptyState } from "@/components/PageHeader";
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
      <PageHeader
        icon={ListChecks}
        title={t(locale, "tasks")}
        description={
          locale === "tr"
            ? "Takip görevlerini oluşturun, filtreleyin ve tamamlayın."
            : "Create, filter, and complete follow-up tasks."
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <form onSubmit={create} className="ea-card-pad space-y-4 lg:sticky lg:top-24">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-ea-50 text-ea-600">
              <Plus className="h-4 w-4" />
            </div>
            <h2 className="ea-section-title">{locale === "tr" ? "Yeni görev" : "New task"}</h2>
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={locale === "tr" ? "Görev başlığı" : "Task title"}
            className="ea-input"
            required
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={locale === "tr" ? "Detay / yorum (isteğe bağlı)" : "Details / comments (optional)"}
            rows={3}
            className="ea-input resize-y"
          />
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="ea-input sm:flex-1 lg:flex-none"
            />
            <button disabled={busy} className="ea-btn-primary">
              <Plus className="h-4 w-4" />
              {busy ? "…" : locale === "tr" ? "Ekle" : "Add task"}
            </button>
          </div>
          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          )}
        </form>

        <div className="min-w-0 space-y-4">
          <div className="ea-seg">
            {(["open", "done", "all"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn("ea-seg-item capitalize", filter === key && "ea-seg-item-active")}
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
                    "ea-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
                    overdue && "border-rose-200 bg-rose-50/30",
                  )}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                        task.status === "open"
                          ? overdue
                            ? "bg-rose-50 text-rose-600"
                            : "bg-ea-50 text-ea-600"
                          : "bg-emerald-50 text-emerald-600",
                      )}
                    >
                      {task.status === "open" ? (
                        overdue ? <AlertTriangle className="h-4 w-4" /> : <Circle className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div
                        className={cn(
                          "break-words font-semibold text-ea-950",
                          task.status !== "open" && "text-slate-500 line-through decoration-slate-300",
                        )}
                      >
                        {task.title}
                      </div>
                      {task.body && <p className="mt-1 break-words text-sm text-slate-600">{task.body}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-slate-500">
                        <UserRound className="h-3.5 w-3.5 text-slate-400" />
                        <span>{task.lead?.contact?.displayName || task.assignee?.name || "—"} ·</span>
                        <CalendarClock className="ml-0.5 h-3.5 w-3.5 text-slate-400" />
                        <span>{formatDate(task.dueAt, locale === "tr" ? "tr-TR" : "en-US")}</span>
                        {overdue ? (
                          <span className="whitespace-pre font-bold text-rose-600">
                            {locale === "tr" ? " · GECİKMİŞ" : " · OVERDUE"}
                          </span>
                        ) : (
                          ""
                        )}
                      </div>
                    </div>
                  </div>
                  {task.status === "open" ? (
                    <button onClick={() => complete(task.id)} className="ea-btn-sm shrink-0 self-start sm:self-auto">
                      <Check className="h-3.5 w-3.5" />
                      Done
                    </button>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 self-start rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase text-emerald-700 ring-1 ring-inset ring-emerald-600/15 sm:self-auto">
                      <Check className="h-3 w-3" />
                      Done
                    </span>
                  )}
                </div>
              );
            })}
            {!tasks.length && (
              <div className="ea-card border-dashed">
                <EmptyState
                  icon={ListChecks}
                  title={locale === "tr" ? "Gösterilecek görev yok." : "No tasks to show."}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
