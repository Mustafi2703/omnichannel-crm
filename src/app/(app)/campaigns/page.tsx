"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Megaphone, Pause, Play, RefreshCw, Send, Users, XCircle } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/PageHeader";

type Template = { id: string; name: string; language: string; category: string; body: string; status: string; variables: unknown };
type Contact = { id: string; displayName: string; phone: string | null; consentWhatsappMarketing: boolean; automationPausedAt: string | null };
type Campaign = {
  id: string;
  name: string;
  status: string;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  template: Template;
  _count: { recipients: number };
  recipientTotals: Record<string, number>;
};

const states = ["queued", "sending", "retry", "sent", "failed", "suppressed", "cancelled"];

function localDateTimeValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [schedule, setSchedule] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const eligibleContacts = useMemo(() => contacts.filter((contact) => contact.consentWhatsappMarketing && !contact.automationPausedAt && Boolean(contact.phone)), [contacts]);
  const chosenTemplate = templates.find((template) => template.id === templateId);
  const templateHasVariables = Array.isArray(chosenTemplate?.variables) && chosenTemplate.variables.length > 0;

  const load = useCallback(async () => {
    const [campaignResponse, templateResponse, contactResponse] = await Promise.all([
      fetch("/api/admin/campaigns"),
      fetch("/api/admin/whatsapp-templates"),
      fetch("/api/contacts?pageSize=100"),
    ]);
    const [campaignData, templateData, contactData] = await Promise.all([campaignResponse.json(), templateResponse.json(), contactResponse.json()]);
    if (!campaignResponse.ok) { setNotice(campaignData.error?.message || "Campaigns could not be loaded."); return; }
    setCampaigns(campaignData.campaigns || []);
    setTemplates((templateData.templates || []).filter((template: Template) => template.status === "approved"));
    setContacts(contactData.contacts || []);
  }, []);

  useEffect(() => { void load(); }, [load]);

  function toggleContact(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function createCampaign(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !templateId || !selected.length) { setNotice("Enter a name, choose an approved template, and select at least one eligible contact."); return; }
    setSaving(true); setNotice("");
    const response = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, templateId, contactIds: selected, scheduledAt: schedule ? new Date(schedule).toISOString() : null }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) { setNotice(data.error?.message || "Campaign could not be created."); return; }
    setName(""); setSelected([]); setSchedule(""); setNotice(`Campaign created for ${data.eligibleContacts} consented contact${data.eligibleContacts === 1 ? "" : "s"}.`); void load();
  }

  async function changeCampaign(campaignId: string, action: "start" | "pause" | "resume" | "cancel") {
    setNotice("");
    const response = await fetch(`/api/admin/campaigns/${campaignId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const data = await response.json();
    if (!response.ok) { setNotice(data.error?.message || "Campaign could not be updated."); return; }
    const label = { start: "started", pause: "paused", resume: "resumed", cancel: "cancelled" }[action];
    setNotice(`Campaign ${label}.`); void load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Megaphone}
        title="Campaigns"
        description="Send only approved WhatsApp templates to contacts with active marketing consent. Live sends require AiSensy template delivery to be configured."
      />
      {notice ? <p className="rounded-xl border border-ea-100 bg-ea-50/70 p-3 text-sm text-ea-900">{notice}</p> : null}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
        <section className="ea-card-pad">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-ea-50 text-ea-600">
              <Send className="h-4 w-4" />
            </div>
            <h2 className="ea-section-title">Create campaign</h2>
          </div>
          <form onSubmit={createCampaign} className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="ea-label">Name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={160} className="ea-input mt-1.5" placeholder="September follow-up" />
              </label>
              <label className="block">
                <span className="ea-label">Approved template</span>
                <select value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="ea-input mt-1.5">
                  <option value="">Choose a template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} · {template.language}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="ea-label">Schedule (optional)</span>
                <input type="datetime-local" min={localDateTimeValue(new Date())} value={schedule} onChange={(event) => setSchedule(event.target.value)} className="ea-input mt-1.5" />
              </label>
              <div className="flex items-start gap-2 rounded-xl border border-ea-100 bg-ea-50/60 p-3 text-sm text-slate-600">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-ea-600" />
                <span>
                  <b className="text-ea-950">{selected.length}</b> eligible contact{selected.length === 1 ? "" : "s"} selected. Contacts without a phone number, consent, or active automation are not shown.
                </span>
              </div>
            </div>
            {templateHasVariables ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                This template includes variables and cannot be used until its provider-approved variable mapping is configured.
              </p>
            ) : null}
            <div className="max-h-64 overflow-auto rounded-xl border border-slate-200">
              <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-ea-50/90 p-3 backdrop-blur">
                <b className="text-sm text-ea-950">Eligible contacts</b>
                <button
                  type="button"
                  onClick={() => setSelected(selected.length === eligibleContacts.length ? [] : eligibleContacts.map((contact) => contact.id))}
                  className="text-sm font-semibold text-ea-700 hover:text-ea-900"
                >
                  {selected.length === eligibleContacts.length ? "Clear all" : "Select all"}
                </button>
              </div>
              {eligibleContacts.length ? (
                eligibleContacts.map((contact) => (
                  <label key={contact.id} className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2 text-sm transition last:border-0 hover:bg-ea-50/40">
                    <input type="checkbox" checked={selected.includes(contact.id)} onChange={() => toggleContact(contact.id)} className="accent-ea-600" />
                    <span className="min-w-0 flex-1 truncate">{contact.displayName}</span>
                    <span className="shrink-0 text-slate-500">{contact.phone}</span>
                  </label>
                ))
              ) : (
                <p className="p-3 text-sm text-slate-500">No contacts are eligible for WhatsApp marketing.</p>
              )}
            </div>
            <button disabled={saving || templateHasVariables} className="ea-btn-primary">
              <Send className="h-4 w-4" />
              {saving ? "Creating…" : schedule ? "Schedule campaign" : "Create draft"}
            </button>
          </form>
        </section>

        <section className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="ea-section-title">Campaign history</h2>
            <button onClick={() => void load()} className="ea-btn-sm">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
          {campaigns.length ? (
            campaigns.map((campaign) => (
              <article key={campaign.id} className="ea-card-pad">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold text-ea-950">{campaign.name}</h3>
                    <p className="mt-1 break-words text-sm text-slate-500">
                      {campaign.template.name} · {campaign._count.recipients} recipients
                      {campaign.scheduledAt ? ` · scheduled ${new Date(campaign.scheduledAt).toLocaleString()}` : ""}
                    </p>
                  </div>
                  <span className={`${campaignStatusClass(campaign.status)} uppercase`}>{campaign.status}</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {states.map((state) => (
                    <div key={state} className="rounded-xl border border-ea-900/[0.06] bg-ea-50/50 p-2 text-center">
                      <div className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500">{state}</div>
                      <div className="font-bold text-ea-950">{campaign.recipientTotals[state] || 0}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["draft", "paused"].includes(campaign.status) ? (
                    <button onClick={() => void changeCampaign(campaign.id, "start")} className="ea-btn-primary rounded-lg px-3 py-1.5">
                      <Play className="h-3.5 w-3.5" />
                      Start now
                    </button>
                  ) : null}
                  {["scheduled", "running"].includes(campaign.status) ? (
                    <button onClick={() => void changeCampaign(campaign.id, "pause")} className="ea-btn rounded-lg px-3 py-1.5">
                      <Pause className="h-3.5 w-3.5" />
                      Pause
                    </button>
                  ) : null}
                  {campaign.status === "paused" ? (
                    <button onClick={() => void changeCampaign(campaign.id, "resume")} className="ea-btn-primary rounded-lg px-3 py-1.5">
                      <Play className="h-3.5 w-3.5" />
                      Resume
                    </button>
                  ) : null}
                  {!["completed", "cancelled"].includes(campaign.status) ? (
                    <button onClick={() => void changeCampaign(campaign.id, "cancel")} className="ea-btn-danger rounded-lg px-3 py-1.5">
                      <XCircle className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <div className="ea-card">
              <EmptyState icon={Megaphone} title="No campaigns yet." />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function campaignStatusClass(status: string) {
  if (["running", "completed"].includes(status))
    return "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/15";
  if (["scheduled", "draft"].includes(status)) return "ea-chip px-2.5 py-1";
  if (status === "paused")
    return "inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/15";
  if (status === "cancelled")
    return "inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/15";
  return "ea-chip-neutral px-2.5 py-1";
}
