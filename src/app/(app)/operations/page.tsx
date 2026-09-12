"use client";

import { useCallback, useEffect, useState } from "react";

type User = { id: string; name: string; email: string; role: string };
type Operations = {
  aiInstructions: string;
  sla: { managerUserIds: string[]; unassignedAfterMinutes: number; firstCallAfterMinutes: number; noCallAfterMinutes: number };
};

const empty: Operations = {
  aiInstructions: "",
  sla: { managerUserIds: [], unassignedAfterMinutes: 15, firstCallAfterMinutes: 30, noCallAfterMinutes: 180 },
};

export default function OperationsPage() {
  const [operations, setOperations] = useState<Operations>(empty);
  const [users, setUsers] = useState<User[]>([]);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/operations");
    const data = await response.json();
    if (!response.ok) { setStatus(data.error?.message || "Settings could not be loaded."); return; }
    setOperations(data.operations || empty);
    setUsers(data.users || []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  function updateSla(field: keyof Operations["sla"], value: number | string[]) {
    setOperations((current) => ({ ...current, sla: { ...current.sla, [field]: value } }));
  }
  function toggleManager(id: string) {
    const selected = operations.sla.managerUserIds.includes(id);
    updateSla("managerUserIds", selected ? operations.sla.managerUserIds.filter((item) => item !== id) : [...operations.sla.managerUserIds, id]);
  }
  async function save() {
    setSaving(true); setStatus("");
    const response = await fetch("/api/admin/operations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(operations) });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) { setStatus(data.error?.message || "Settings could not be saved."); return; }
    setOperations(data.operations); setStatus("Saved.");
  }

  return <div className="max-w-4xl space-y-6">
    <div><h1 className="text-2xl font-black">Operations settings</h1><p className="mt-1 text-sm text-slate-500">Set AI guardrails and who receives sales-response SLA escalations.</p></div>
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div><h2 className="font-bold">AI instructions</h2><p className="mt-1 text-sm text-slate-500">These apply to the workspace AI assistant. Product claims must be factual and compliance-approved.</p></div>
      <textarea value={operations.aiInstructions} onChange={(event) => setOperations((current) => ({ ...current, aiInstructions: event.target.value }))} rows={12} maxLength={10_000} className="w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="e.g. Never quote prices. Keep responses short. For technical support, collect contact details and say an authorised colleague will respond during business hours." />
    </section>
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div><h2 className="font-bold">Sales-response SLA</h2><p className="mt-1 text-sm text-slate-500">Escalations are created once per conversation and sent to the selected managers. If no manager is selected, active owners and admins receive them.</p></div>
      <div className="grid gap-3 md:grid-cols-3">
        {[['unassignedAfterMinutes', 'Unassigned after (min)'], ['firstCallAfterMinutes', 'First call after (min)'], ['noCallAfterMinutes', 'No call after (min)']].map(([field, label]) => <label key={field} className="text-sm font-medium">{label}<input type="number" min={field === 'noCallAfterMinutes' ? 30 : 5} value={operations.sla[field as keyof Operations['sla']] as number} onChange={(event) => updateSla(field as keyof Operations['sla'], Number(event.target.value))} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" /></label>)}
      </div>
      <div><div className="text-sm font-medium">SLA managers</div><div className="mt-2 grid gap-2 sm:grid-cols-2">{users.map((user) => <label key={user.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm"><input type="checkbox" checked={operations.sla.managerUserIds.includes(user.id)} onChange={() => toggleManager(user.id)} /><span>{user.name} <span className="text-slate-400">({user.role})</span></span></label>)}</div></div>
    </section>
    <div className="flex items-center gap-3"><button disabled={saving} onClick={save} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save settings"}</button>{status ? <span className="text-sm text-slate-600">{status}</span> : null}</div>
  </div>;
}
