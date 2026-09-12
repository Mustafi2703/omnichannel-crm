"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/components/ClientProviders";
import { t } from "@/lib/i18n";
import { formatDate, cn } from "@/lib/utils";

type Convo = {
  id: string;
  channelType: string;
  status: string;
  aiMode: string;
  lastMessageAt: string;
  contact: { displayName: string; phone?: string | null };
  assignee?: { id: string; name: string } | null;
  messages: { bodyText: string }[];
};

type Thread = {
  id: string;
  channelType: string;
  aiMode: string;
  status: string;
  whatsappWindowOpen?: boolean;
  assignee?: { id: string; name: string } | null;
  contact: { displayName: string; automationPausedAt?: string | null; leads?: { title: string; stage: { name: string; nameTr: string } }[]; tasks?: { title: string; dueAt?: string | null }[] };
  attachments?: { id: string; filename: string; contentType: string; sizeBytes: number; storageKey: string }[];
  messages: {
    id: string;
    direction: string;
    senderType: string;
    bodyText: string;
    createdAt: string;
    aiMeta?: { model?: string; latencyMs?: number; sources?: { title: string }[] } | null;
    deliveryStatus?: string;
    deliveryError?: string | null;
  }[];
};
type WhatsappTemplate = { id: string; name: string; language: string; category: string; body: string };

export default function InboxPage() {
  const { locale } = useLocale();
  const [list, setList] = useState<Convo[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [text, setText] = useState("");
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [assignees, setAssignees] = useState<{ id: string; name: string }[]>([]);
  const [templates, setTemplates] = useState<WhatsappTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [composerError, setComposerError] = useState("");

  const loadList = useCallback(async () => {
    const params = new URLSearchParams();
    if (channel) params.set("channel", channel);
    if (status) params.set("status", status);
    if (query.trim()) params.set("q", query.trim());
    const res = await fetch(`/api/conversations?${params}`);
    const data = await res.json();
    setList(data.conversations || []);
    setActive((current) => current || data.conversations?.[0]?.id || null);
  }, [channel, query, status]);

  const loadThread = useCallback(async (id: string) => {
    const res = await fetch(`/api/conversations/${id}`);
    const data = await res.json();
    setThread(data.conversation);
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);
  useEffect(() => { fetch("/api/conversations/assignees").then((r) => r.json()).then((data) => setAssignees(data.users || [])); }, []);
  useEffect(() => { fetch("/api/whatsapp-templates").then((r) => r.json()).then((data) => setTemplates(data.templates || [])); }, []);

  useEffect(() => {
    if (active) loadThread(active);
  }, [active, loadThread]);

  useEffect(() => {
    const source = new EventSource("/api/realtime");
    source.addEventListener("summary", () => { void loadList(); if (active) void loadThread(active); });
    return () => source.close();
  }, [active, loadList, loadThread]);

  async function send(asBot = false) {
    const requiresTemplate = thread?.channelType === "whatsapp" && !thread.whatsappWindowOpen;
    if (!active || (!text.trim() && !templateId)) return;
    if (requiresTemplate && !templateId) { setComposerError(locale === "tr" ? "Onaylı bir WhatsApp şablonu seçin." : "Select an approved WhatsApp template."); return; }
    setComposerError("");
    const response = await fetch(`/api/conversations/${active}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, templateId: requiresTemplate ? templateId : undefined, asBot, triggerAi: asBot }),
    });
    if (!response.ok) { const data = await response.json().catch(() => ({})); setComposerError(data.error?.message || "Message could not be sent."); return; }
    setText("");
    setTemplateId("");
    await loadThread(active);
    await loadList();
  }

  async function uploadAttachment() { if (!active || !attachment) return; const form = new FormData(); form.set("file", attachment); setLoading(true); try { await fetch(`/api/conversations/${active}/attachments`, { method: "POST", body: form }); setAttachment(null); await loadThread(active); } finally { setLoading(false); } }

  async function handoff() {
    if (!active) return;
    await fetch(`/api/conversations/${active}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handoff: true }),
    });
    await loadThread(active);
  }

  async function logCall() {
    if (!active) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/conversations/${active}/call`, { method: "POST" });
      if (!response.ok) { const data = await response.json().catch(() => ({})); setComposerError(data.error?.message || "Call could not be logged."); return; }
      await loadThread(active);
    } finally {
      setLoading(false);
    }
  }

  async function updateConversation(data: Record<string, unknown>) {
    if (!active) return;
    setLoading(true);
    try {
      await fetch(`/api/conversations/${active}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      await Promise.all([loadThread(active), loadList()]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">{t(locale, "inbox")}</h1>
      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={locale === "tr" ? "Konuşma ara…" : "Search conversations…"} className="min-w-48 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <select value={channel} onChange={(e) => setChannel(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="">{locale === "tr" ? "Tüm kanallar" : "All channels"}</option><option value="website">Web</option><option value="whatsapp">WhatsApp</option></select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="">{locale === "tr" ? "Tüm durumlar" : "All statuses"}</option><option value="open">{locale === "tr" ? "Açık" : "Open"}</option><option value="pending">{locale === "tr" ? "Beklemede" : "Pending"}</option><option value="closed">{locale === "tr" ? "Kapalı" : "Closed"}</option></select>
      </div>
      <div className="grid h-[70vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-[320px_1fr]">
        <div className="overflow-y-auto border-r border-slate-100">
          {list.map((c) => (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className={cn(
                "w-full border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50",
                active === c.id && "bg-blue-50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-slate-900">{c.contact.displayName}</div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                  {c.channelType}
                </span>
              </div>
              <div className="mt-1 truncate text-xs text-slate-500">
                {c.messages[0]?.bodyText || "—"}
              </div>
              <div className="mt-1 text-[10px] font-medium uppercase text-slate-400">{c.status} · {c.assignee?.name || (locale === "tr" ? "Atanmamış" : "Unassigned")}</div>
            </button>
          ))}
        </div>
        <div className="flex min-h-0 flex-col">
          {thread ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <div className="font-bold">{thread.contact.displayName}</div>
                  <div className="text-xs text-slate-500">
                    {thread.channelType} · AI: {thread.aiMode} · {thread.status}
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <select value={thread.assignee?.id || ""} onChange={(e) => updateConversation({ assigneeId: e.target.value || null })} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"><option value="">{locale === "tr" ? "Temsilci seç" : "Assign agent"}</option>{assignees.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
                  <button disabled={loading} onClick={() => updateConversation({ assigneeId: "me" })} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold">{locale === "tr" ? "Bana ata" : "Assign to me"}</button>
                  <button disabled={loading} onClick={() => updateConversation({ assigneeId: null })} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold">{locale === "tr" ? "Atamayı kaldır" : "Unassign"}</button>
                  <button disabled={loading || !thread.assignee} onClick={logCall} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold">{locale === "tr" ? "Arama yapıldı" : "Log call"}</button>
                  <button disabled={loading} onClick={() => updateConversation({ status: thread.status === "closed" ? "open" : "closed" })} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold">{thread.status === "closed" ? (locale === "tr" ? "Yeniden aç" : "Reopen") : (locale === "tr" ? "Kapat" : "Close")}</button>
                  <button onClick={handoff} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold">{t(locale, "handoff")}</button>
                  <button disabled={loading} onClick={() => updateConversation({ automationPaused: !thread.contact.automationPausedAt })} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold">{thread.contact.automationPausedAt ? (locale === "tr" ? "Otomasyonu sürdür" : "Resume automation") : (locale === "tr" ? "Otomasyonu duraklat" : "Pause automation")}</button>
                </div>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600"><div className="font-bold text-slate-800">{locale === "tr" ? "CRM bağlamı" : "CRM context"}</div><div className="mt-1">{thread.contact.leads?.map((lead) => `${lead.title} · ${locale === "tr" ? lead.stage.nameTr : lead.stage.name}`).join(" | ") || (locale === "tr" ? "Bağlı lead yok" : "No linked lead")}</div><div className="mt-1">{thread.contact.tasks?.map((task) => task.title).join(" | ") || (locale === "tr" ? "Açık görev yok" : "No open tasks")}</div>{thread.attachments?.length ? <div className="mt-1">{locale === "tr" ? "Ekler: " : "Attachments: "}{thread.attachments.map((attachment) => <a key={attachment.id} className="mr-2 underline" href={`/uploads/${attachment.storageKey}`} target="_blank">{attachment.filename}</a>)}</div> : null}</div>
                {thread.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                      m.direction === "inbound"
                        ? "bg-slate-100 text-slate-800"
                        : "ml-auto bg-blue-600 text-white",
                    )}
                  >
                    <div className="mb-1 text-[10px] opacity-70">{m.senderType}</div>
                    {m.bodyText}
                    {m.aiMeta?.sources && m.aiMeta.sources.length > 0 ? (
                      <div className="mt-1 text-[10px] opacity-70">
                        {locale === "tr" ? "Kaynak: " : "Sources: "}
                        {m.aiMeta.sources.map((source) => source.title).join(", ")}
                      </div>
                    ) : null}
                    {m.aiMeta?.latencyMs ? (
                      <div className="mt-1 text-[10px] opacity-60">AI {m.aiMeta.model} · {m.aiMeta.latencyMs} ms</div>
                    ) : null}
                    {m.direction === "outbound" ? <div className="mt-1 text-[10px] opacity-60">{m.deliveryStatus === "failed" ? `${locale === "tr" ? "Gönderilemedi" : "Failed"}${m.deliveryError ? `: ${m.deliveryError}` : ""}` : locale === "tr" ? "Gönderildi" : "Sent"}</div> : null}
                    <div className="mt-1 text-[10px] opacity-60">{formatDate(m.createdAt, locale === "tr" ? "tr-TR" : "en-US")}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 p-3">
                {thread.channelType === "whatsapp" && !thread.whatsappWindowOpen ? <div className="mb-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800"><div className="font-semibold">{locale === "tr" ? "24 saatlik WhatsApp penceresi kapandı" : "The 24-hour WhatsApp service window has ended"}</div><div>{locale === "tr" ? "Serbest mesaj gönderemezsiniz. Devam etmek için onaylı bir şablon seçin." : "Free-form messages are blocked. Select an approved template to continue."}</div><select value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="mt-2 w-full rounded border border-amber-300 bg-white p-2 text-slate-800"><option value="">{locale === "tr" ? "Onaylı şablon seçin" : "Select approved template"}</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name} · {template.language}</option>)}</select>{templateId ? <div className="mt-1 text-slate-600">{templates.find((template) => template.id === templateId)?.body}</div> : null}</div> : null}
                {composerError ? <div className="mb-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">{composerError}</div> : null}
              <div className="flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send(false)}
                  disabled={thread.channelType === "whatsapp" && !thread.whatsappWindowOpen}
                  placeholder={thread.channelType === "whatsapp" && !thread.whatsappWindowOpen ? (locale === "tr" ? "Onaylı şablon gereklidir" : "An approved template is required") : (locale === "tr" ? "Mesaj yazın…" : "Type a message…")}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-600"
                />
                <button
                  disabled={thread.channelType === "whatsapp" && !thread.whatsappWindowOpen && !templateId}
                  onClick={() => void send(false)}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"
                >
                  {thread.channelType === "whatsapp" && !thread.whatsappWindowOpen ? (locale === "tr" ? "Şablon gönder" : "Send template") : t(locale, "send")}
                </button>
                <button
                  disabled={thread.channelType === "whatsapp" && !thread.whatsappWindowOpen}
                  onClick={() => void send(true)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                >
                  AI
                </button>
                <label className="cursor-pointer rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold">{locale === "tr" ? "Dosya" : "File"}<input className="hidden" type="file" accept="image/jpeg,image/png,image/webp,application/pdf,text/plain" onChange={(e) => setAttachment(e.target.files?.[0] || null)} /></label>
                {attachment ? <button disabled={loading} onClick={uploadAttachment} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold">{locale === "tr" ? "Yükle" : "Upload"}</button> : null}
              </div>
              </div>
            </>
          ) : (
            <div className="grid flex-1 place-items-center text-sm text-slate-400">
              {t(locale, "noData")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
