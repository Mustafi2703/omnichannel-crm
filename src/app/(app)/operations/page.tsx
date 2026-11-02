"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, PhoneCall, PhoneOff, Save, SlidersHorizontal, Timer, UserX, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

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

  const slaFields: [keyof Operations["sla"], string, LucideIcon][] = [
    ["unassignedAfterMinutes", "Unassigned after (min)", UserX],
    ["firstCallAfterMinutes", "First call after (min)", PhoneCall],
    ["noCallAfterMinutes", "No call after (min)", PhoneOff],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={SlidersHorizontal}
        title="Operations settings"
        description="Set AI guardrails and who receives sales-response SLA escalations."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {slaFields.map(([field, label, Icon]) => (
          <div key={field} className="ea-card-pad">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-ea-50 text-ea-600">
                <Icon className="h-4 w-4" />
              </div>
              <span className="ea-label">{label}</span>
            </div>
            <div className="mt-3 text-3xl font-bold text-ea-950">{operations.sla[field] as number}</div>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <section className="ea-card-pad space-y-4">
          <div className="flex items-start gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ea-50 text-ea-600">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h2 className="ea-section-title">AI instructions</h2>
              <p className="ea-muted mt-1">These apply to the workspace AI assistant. Product claims must be factual and compliance-approved.</p>
            </div>
          </div>
          <textarea
            value={operations.aiInstructions}
            onChange={(event) => setOperations((current) => ({ ...current, aiInstructions: event.target.value }))}
            rows={12}
            maxLength={10_000}
            className="ea-input p-3"
            placeholder="e.g. Never quote prices. Keep responses short. For technical support, collect contact details and say an authorised colleague will respond during business hours."
          />
        </section>

        <section className="ea-card-pad space-y-5">
          <div className="flex items-start gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ea-50 text-ea-600">
              <Timer className="h-4 w-4" />
            </div>
            <div>
              <h2 className="ea-section-title">Sales-response SLA</h2>
              <p className="ea-muted mt-1">Escalations are created once per conversation and sent to the selected managers. If no manager is selected, active owners and admins receive them.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {slaFields.map(([field, label]) => (
              <label key={field} className="block">
                <span className="ea-label">{label}</span>
                <input
                  type="number"
                  min={field === "noCallAfterMinutes" ? 30 : 5}
                  value={operations.sla[field] as number}
                  onChange={(event) => updateSla(field, Number(event.target.value))}
                  className="ea-input mt-1.5"
                />
              </label>
            ))}
          </div>
          <div>
            <div className="ea-label">SLA managers</div>
            <div className="mt-2 grid max-h-[360px] gap-2 overflow-y-auto sm:grid-cols-2">
              {users.map((user) => {
                const checked = operations.sla.managerUserIds.includes(user.id);
                return (
                  <label
                    key={user.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm transition ${checked ? "border-ea-500/40 bg-ea-50/70" : "border-slate-200 hover:bg-ea-50/40"}`}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggleManager(user.id)} className="accent-ea-600" />
                    <span className="min-w-0 break-words">
                      {user.name} <span className="text-slate-400">({user.role})</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button disabled={saving} onClick={save} className="ea-btn-primary">
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save settings"}
        </button>
        {status ? <span className="text-sm text-slate-600">{status}</span> : null}
      </div>
    </div>
  );
}
