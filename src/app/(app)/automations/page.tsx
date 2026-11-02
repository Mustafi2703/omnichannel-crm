"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, History, Plus, RefreshCw, RotateCcw, Server, Workflow, Zap } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

type Run = { id: string; status: string; createdAt: string };
type Rule = { id: string; name: string; trigger: string; action: string; isActive: boolean; config?: Record<string, unknown>; runs: Run[] };
type WorkerStatus = {
  available: boolean;
  reason?: string;
  counts?: Record<string, number>;
  failed?: { id: string; name: string; attemptsMade: number; failedReason: string; finishedOn: number | null }[];
};

const TRIGGERS = [
  { id: "conversation_unassigned", label: "Conversation unassigned" },
  { id: "lead_qualified", label: "Lead qualified" },
  { id: "task_overdue", label: "Task overdue" },
  { id: "sla_no_reply", label: "SLA no-reply" },
] as const;

const ACTIONS = [
  { id: "notify", label: "Notify assignee/user" },
  { id: "assign_user", label: "Assign conversation user" },
  { id: "add_tag", label: "Add lead tag" },
] as const;

export default function AutomationsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [worker, setWorker] = useState<WorkerStatus | null>(null);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<(typeof TRIGGERS)[number]["id"]>("conversation_unassigned");
  const [action, setAction] = useState<(typeof ACTIONS)[number]["id"]>("notify");
  const [tag, setTag] = useState("");
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const [rulesResponse, workerResponse] = await Promise.all([
      fetch("/api/admin/automations"),
      fetch("/api/admin/worker"),
    ]);
    const rulesData = await rulesResponse.json();
    const workerData = await workerResponse.json();
    setRules(rulesData.rules || []);
    setWorker(workerData);
  };

  useEffect(() => {
    void load().catch(() => setError("Could not load automation status."));
  }, []);

  const create = async () => {
    if (!name) return;
    setError("");
    const config: Record<string, string> = {};
    if (tag) config.tag = tag;
    if (userId) config.userId = userId;
    const response = await fetch("/api/admin/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, trigger, action, config, isActive: true }),
    });
    if (!response.ok) {
      setError("Could not create the automation rule.");
      return;
    }
    setName("");
    setTag("");
    setUserId("");
    void load();
  };

  const retry = async (jobId: string) => {
    setError("");
    const response = await fetch("/api/admin/worker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    if (!response.ok) {
      setError("Could not retry that worker job.");
      return;
    }
    void load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Workflow}
        title="Automations"
        description="Detailed trigger → action flows, execution history, and Redis worker recovery."
      />
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="ea-card-pad space-y-4">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-ea-50 text-ea-600">
              <Zap className="h-4 w-4" />
            </div>
            <h2 className="ea-section-title">Create flow</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Rule name"
              className="ea-input sm:col-span-2"
            />
            <select value={trigger} onChange={(e) => setTrigger(e.target.value as typeof trigger)} className="ea-input">
              {TRIGGERS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <select value={action} onChange={(e) => setAction(e.target.value as typeof action)} className="ea-input">
              {ACTIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            {(action === "notify" || action === "assign_user") && (
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="User ID (optional for notify)"
                className="ea-input sm:col-span-2"
              />
            )}
            {action === "add_tag" && (
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Tag to add"
                className="ea-input sm:col-span-2"
              />
            )}
          </div>
          <button onClick={create} className="ea-btn-primary">
            <Plus className="h-4 w-4" />
            Create flow
          </button>
        </div>

        <section className="ea-card-pad">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-ea-50 text-ea-600">
                <Server className="h-4 w-4" />
              </div>
              <h2 className="ea-section-title">Worker status</h2>
            </div>
            <button onClick={() => void load()} className="ea-btn-sm">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
          {worker?.available ? (
            <>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 xl:grid-cols-5">
                {Object.entries(worker.counts || {}).map(([status, count]) => (
                  <div key={status} className="rounded-xl border border-ea-900/[0.06] bg-ea-50/50 p-3">
                    <span className="block truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500">{status}</span>
                    <b className="mt-1 block text-lg text-ea-950">{count}</b>
                  </div>
                ))}
              </div>
              <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto">
                {worker.failed?.length ? (
                  worker.failed.map((job) => (
                    <div key={job.id} className="rounded-xl border border-rose-100 bg-rose-50/70 p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <b className="flex min-w-0 items-center gap-1.5 break-all text-rose-900">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          {job.name}
                        </b>
                        <button onClick={() => void retry(job.id)} className="ea-btn-danger rounded-lg px-2.5 py-1 text-xs">
                          <RotateCcw className="h-3.5 w-3.5" />
                          Retry
                        </button>
                      </div>
                      <p className="mt-1 break-words text-rose-700">{job.failedReason}</p>
                      <p className="mt-1 text-xs text-slate-500">Attempts: {job.attemptsMade}</p>
                    </div>
                  ))
                ) : (
                  <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-500">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    No dead-letter jobs.
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Worker visibility is unavailable: {worker?.reason || "loading"}
            </p>
          )}
        </section>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        {rules.map((rule) => (
          <div key={rule.id} className="ea-card-pad">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <b className="min-w-0 break-words text-ea-950">{rule.name}</b>
              <span
                className={
                  rule.isActive
                    ? "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase text-emerald-700 ring-1 ring-inset ring-emerald-600/15"
                    : "ea-chip-neutral uppercase"
                }
              >
                {rule.isActive ? "Active" : "Paused"}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="ea-chip">
                <Zap className="h-3 w-3" />
                {rule.trigger}
              </span>
              <span className="text-slate-400">→</span>
              <span className="ea-chip-neutral">{rule.action}</span>
            </div>
            <div className="mt-4 break-words border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                <History className="h-3.5 w-3.5" />
                Recent executions:
              </span>{" "}
              {rule.runs.length
                ? rule.runs.map((run) => `${run.status} · ${new Date(run.createdAt).toLocaleString()}`).join(" | ")
                : "none"}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
