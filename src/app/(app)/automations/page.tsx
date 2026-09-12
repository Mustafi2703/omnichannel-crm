"use client";

import { useEffect, useState } from "react";

type Run = { id: string; status: string; createdAt: string };
type Rule = { id: string; name: string; trigger: string; action: string; isActive: boolean; runs: Run[] };
type WorkerStatus = {
  available: boolean;
  reason?: string;
  counts?: Record<string, number>;
  failed?: { id: string; name: string; attemptsMade: number; failedReason: string; finishedOn: number | null }[];
};

export default function AutomationsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [worker, setWorker] = useState<WorkerStatus | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const [rulesResponse, workerResponse] = await Promise.all([fetch("/api/admin/automations"), fetch("/api/admin/worker")]);
    const rulesData = await rulesResponse.json();
    const workerData = await workerResponse.json();
    setRules(rulesData.rules || []);
    setWorker(workerData);
  };

  useEffect(() => { void load().catch(() => setError("Could not load automation status.")); }, []);

  const create = async () => {
    if (!name) return;
    setError("");
    const response = await fetch("/api/admin/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, trigger: "conversation_unassigned", action: "notify", config: {} }),
    });
    if (!response.ok) { setError("Could not create the automation rule."); return; }
    setName("");
    void load();
  };

  const retry = async (jobId: string) => {
    setError("");
    const response = await fetch("/api/admin/worker", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId }) });
    if (!response.ok) { setError("Could not retry that worker job."); return; }
    void load();
  };

  return <div className="space-y-5">
    <div><h1 className="text-2xl font-black">Automations</h1><p className="mt-1 text-sm text-slate-500">Rules, execution history, and Redis worker recovery.</p></div>
    {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    <div className="flex gap-2 rounded-xl border bg-white p-4"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Rule name" className="flex-1 rounded-lg border p-2"/><button onClick={create} className="rounded-lg bg-blue-600 px-4 text-sm font-bold text-white">Create rule</button></div>
    <section className="rounded-xl border bg-white p-4"><div className="flex items-center justify-between"><h2 className="font-bold">Worker status</h2><button onClick={() => void load()} className="rounded border px-3 py-1 text-sm">Refresh</button></div>{worker?.available ? <><div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">{Object.entries(worker.counts || {}).map(([status, count]) => <div key={status} className="rounded-lg bg-slate-50 p-2"><span className="block text-xs uppercase text-slate-500">{status}</span><b>{count}</b></div>)}</div><div className="mt-4 space-y-2">{worker.failed?.length ? worker.failed.map((job) => <div key={job.id} className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><b>{job.name}</b><button onClick={() => void retry(job.id)} className="rounded border border-red-300 bg-white px-2 py-1 text-xs font-semibold text-red-700">Retry</button></div><p className="mt-1 break-words text-red-700">{job.failedReason}</p><p className="mt-1 text-xs text-slate-500">Attempts: {job.attemptsMade}</p></div>) : <p className="mt-3 text-sm text-slate-500">No dead-letter jobs.</p>}</div></> : <p className="mt-3 text-sm text-amber-700">Worker visibility is unavailable: {worker?.reason || "loading"}.</p>}</section>
    <section className="space-y-3">{rules.map((rule) => <div key={rule.id} className="rounded-xl border bg-white p-4"><div className="flex justify-between"><b>{rule.name}</b><span className="text-xs uppercase">{rule.isActive ? "Active" : "Paused"}</span></div><div className="mt-1 text-sm text-slate-500">{rule.trigger} → {rule.action}</div><div className="mt-3 text-xs text-slate-500">Recent executions: {rule.runs.length ? rule.runs.map((run) => `${run.status} · ${new Date(run.createdAt).toLocaleString()}`).join(" | ") : "none"}</div></div>)}</section>
  </div>;
}
