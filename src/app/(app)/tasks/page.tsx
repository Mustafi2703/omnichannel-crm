"use client";

import { useEffect, useState } from "react";
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
};

export default function TasksPage() {
  const { locale } = useLocale();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  async function load() {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(data.tasks || []);
  }
  useEffect(() => {
    load();
  }, []);

  async function complete(id: string) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "done" }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">{t(locale, "tasks")}</h1>
      <div className="space-y-3">
        {tasks.map((task) => {
          const overdue =
            task.status === "open" && task.dueAt && new Date(task.dueAt) < new Date();
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
                <div className="text-xs text-slate-500">
                  {task.lead?.contact?.displayName} ·{" "}
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
      </div>
    </div>
  );
}
