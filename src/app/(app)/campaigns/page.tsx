"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

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

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-black">Campaigns</h1><p className="mt-1 text-sm text-slate-500">Send only approved WhatsApp templates to contacts with active marketing consent. Live sends require AiSensy template delivery to be configured.</p></div>
    {notice ? <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{notice}</p> : null}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-bold">Create campaign</h2>
      <form onSubmit={createCampaign} className="mt-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-medium">Name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={160} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="September follow-up" /></label>
          <label className="text-sm font-medium">Approved template<select value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2"><option value="">Choose a template</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name} · {template.language}</option>)}</select></label>
          <label className="text-sm font-medium">Schedule (optional)<input type="datetime-local" min={localDateTimeValue(new Date())} value={schedule} onChange={(event) => setSchedule(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" /></label>
          <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600"><b>{selected.length}</b> eligible contact{selected.length === 1 ? "" : "s"} selected. Contacts without a phone number, consent, or active automation are not shown.</div>
        </div>
        {templateHasVariables ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">This template includes variables and cannot be used until its provider-approved variable mapping is configured.</p> : null}
        <div className="max-h-64 overflow-auto rounded-xl border border-slate-200"><div className="flex items-center justify-between border-b border-slate-200 p-3"><b className="text-sm">Eligible contacts</b><button type="button" onClick={() => setSelected(selected.length === eligibleContacts.length ? [] : eligibleContacts.map((contact) => contact.id))} className="text-sm font-semibold text-blue-700">{selected.length === eligibleContacts.length ? "Clear all" : "Select all"}</button></div>{eligibleContacts.length ? eligibleContacts.map((contact) => <label key={contact.id} className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2 text-sm last:border-0"><input type="checkbox" checked={selected.includes(contact.id)} onChange={() => toggleContact(contact.id)} /><span className="flex-1">{contact.displayName}</span><span className="text-slate-500">{contact.phone}</span></label>) : <p className="p-3 text-sm text-slate-500">No contacts are eligible for WhatsApp marketing.</p>}</div>
        <button disabled={saving || templateHasVariables} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "Creating…" : schedule ? "Schedule campaign" : "Create draft"}</button>
      </form>
    </section>
    <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-bold">Campaign history</h2><button onClick={() => void load()} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold">Refresh</button></div>{campaigns.length ? campaigns.map((campaign) => <article key={campaign.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{campaign.name}</h3><p className="mt-1 text-sm text-slate-500">{campaign.template.name} · {campaign._count.recipients} recipients{campaign.scheduledAt ? ` · scheduled ${new Date(campaign.scheduledAt).toLocaleString()}` : ""}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase text-slate-700">{campaign.status}</span></div><div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-7">{states.map((state) => <div key={state} className="rounded-lg bg-slate-50 p-2 text-center"><div className="text-[10px] font-semibold uppercase text-slate-500">{state}</div><div className="font-bold">{campaign.recipientTotals[state] || 0}</div></div>)}</div><div className="mt-4 flex flex-wrap gap-2">{["draft", "paused"].includes(campaign.status) ? <button onClick={() => void changeCampaign(campaign.id, "start")} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-bold text-white">Start now</button> : null}{["scheduled", "running"].includes(campaign.status) ? <button onClick={() => void changeCampaign(campaign.id, "pause")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold">Pause</button> : null}{campaign.status === "paused" ? <button onClick={() => void changeCampaign(campaign.id, "resume")} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-bold text-white">Resume</button> : null}{!["completed", "cancelled"].includes(campaign.status) ? <button onClick={() => void changeCampaign(campaign.id, "cancel")} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700">Cancel</button> : null}</div></article>) : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">No campaigns yet.</div>}</section>
  </div>;
}
