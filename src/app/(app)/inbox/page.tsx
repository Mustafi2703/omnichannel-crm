"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Clock,
  CreditCard,
  Hand,
  Inbox as InboxIcon,
  Info,
  ListTodo,
  MessagesSquare,
  Paperclip,
  Pause,
  Phone,
  Play,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Target,
  Upload,
  UserCheck,
  UserMinus,
} from "lucide-react";
import { useLocale } from "@/components/ClientProviders";
import { PageHeader, EmptyState } from "@/components/PageHeader";
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

  const windowClosed = thread?.channelType === "whatsapp" && !thread.whatsappWindowOpen;

  const crmContext = thread ? (
    <div className="space-y-3 text-xs text-slate-600">
      <div className="font-bold text-ea-950">{locale === "tr" ? "CRM bağlamı" : "CRM context"}</div>
      <div className="flex items-start gap-2">
        <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ea-600" />
        <div className="min-w-0 break-words">{thread.contact.leads?.map((lead) => `${lead.title} · ${locale === "tr" ? lead.stage.nameTr : lead.stage.name}`).join(" | ") || (locale === "tr" ? "Bağlı lead yok" : "No linked lead")}</div>
      </div>
      <div className="flex items-start gap-2">
        <ListTodo className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ea-600" />
        <div className="min-w-0 break-words">{thread.contact.tasks?.map((task) => task.title).join(" | ") || (locale === "tr" ? "Açık görev yok" : "No open tasks")}</div>
      </div>
      {thread.attachments?.length ? (
        <div className="flex items-start gap-2">
          <Paperclip className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ea-600" />
          <div className="min-w-0 break-words">{locale === "tr" ? "Ekler: " : "Attachments: "}{thread.attachments.map((attachment) => <a key={attachment.id} className="mr-2 font-medium text-ea-700 underline decoration-ea-300 underline-offset-2 hover:text-ea-900" href={`/uploads/${attachment.storageKey}`} target="_blank">{attachment.filename}</a>)}</div>
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t(locale, "inbox")} icon={InboxIcon} />
      <div className="ea-card grid grid-cols-1 overflow-hidden md:h-[calc(100dvh-11rem)] md:min-h-[520px] md:grid-cols-[300px_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_280px]">
        <aside className="flex max-h-[45dvh] min-h-0 flex-col border-b border-slate-100 md:max-h-none md:border-b-0 md:border-r">
          <div className="shrink-0 space-y-2 border-b border-slate-100 bg-white p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={locale === "tr" ? "Konuşma ara…" : "Search conversations…"} className="ea-input pl-9" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={channel} onChange={(e) => setChannel(e.target.value)} className="ea-input py-1.5 text-xs"><option value="">{locale === "tr" ? "Tüm kanallar" : "All channels"}</option><option value="website">Web</option><option value="whatsapp">WhatsApp</option></select>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="ea-input py-1.5 text-xs"><option value="">{locale === "tr" ? "Tüm durumlar" : "All statuses"}</option><option value="open">{locale === "tr" ? "Açık" : "Open"}</option><option value="pending">{locale === "tr" ? "Beklemede" : "Pending"}</option><option value="closed">{locale === "tr" ? "Kapalı" : "Closed"}</option></select>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {list.map((c) => (
              <button
                key={c.id}
                onClick={() => setActive(c.id)}
                className={cn(
                  "flex w-full gap-3 border-b border-l-[3px] border-b-slate-100 border-l-transparent px-3 py-3 text-left transition hover:bg-slate-50",
                  active === c.id && "border-l-ea-600 bg-ea-50 hover:bg-ea-50",
                )}
              >
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold uppercase", active === c.id ? "bg-ea-600 text-white" : "bg-ea-100 text-ea-700")}>
                  {c.contact.displayName?.trim().charAt(0) || "?"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-ea-950">{c.contact.displayName}</span>
                    <span className={cn("shrink-0 uppercase", c.channelType === "whatsapp" ? "ea-chip bg-emerald-50 text-emerald-700 ring-emerald-600/15" : "ea-chip")}>
                      {c.channelType}
                    </span>
                  </span>
                  <span className="mt-1 block truncate text-xs text-slate-500">
                    {c.messages[0]?.bodyText || "—"}
                  </span>
                  <span className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">{c.status} · {c.assignee?.name || (locale === "tr" ? "Atanmamış" : "Unassigned")}</span>
                    <span className="shrink-0 text-[10px] text-slate-400">{formatDate(c.lastMessageAt, locale === "tr" ? "tr-TR" : "en-US")}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </aside>
        <section className="flex h-[78dvh] min-h-[480px] min-w-0 flex-col md:h-auto md:min-h-0">
          {thread ? (
            <>
              <div className="shrink-0 space-y-3 border-b border-slate-100 bg-white px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-ea-600 to-aqua-500 text-sm font-bold uppercase text-white">
                    {thread.contact.displayName?.trim().charAt(0) || "?"}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-bold text-ea-950">{thread.contact.displayName}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                      <span className="ea-chip uppercase">{thread.channelType}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-aqua-50 px-2 py-0.5 text-[11px] font-semibold text-aqua-700"><Bot className="h-3 w-3" />AI: {thread.aiMode}</span>
                      <span className="ea-chip-neutral">{thread.status}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <select value={thread.assignee?.id || ""} onChange={(e) => updateConversation({ assigneeId: e.target.value || null })} className="ea-input w-auto max-w-full py-1.5 text-xs"><option value="">{locale === "tr" ? "Temsilci seç" : "Assign agent"}</option>{assignees.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
                  <button disabled={loading} onClick={() => updateConversation({ assigneeId: "me" })} className="ea-btn-sm"><UserCheck className="h-3.5 w-3.5" />{locale === "tr" ? "Bana ata" : "Assign to me"}</button>
                  <button disabled={loading} onClick={() => updateConversation({ assigneeId: null })} className="ea-btn-sm"><UserMinus className="h-3.5 w-3.5" />{locale === "tr" ? "Atamayı kaldır" : "Unassign"}</button>
                  <button disabled={loading || !thread.assignee} onClick={logCall} className="ea-btn-sm"><Phone className="h-3.5 w-3.5" />{locale === "tr" ? "Arama yapıldı" : "Log call"}</button>
                  <button disabled={loading} onClick={() => updateConversation({ status: thread.status === "closed" ? "open" : "closed" })} className="ea-btn-sm">{thread.status === "closed" ? <RotateCcw className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}{thread.status === "closed" ? (locale === "tr" ? "Yeniden aç" : "Reopen") : (locale === "tr" ? "Kapat" : "Close")}</button>
                  <button onClick={handoff} className="ea-btn-sm"><Hand className="h-3.5 w-3.5" />{t(locale, "handoff")}</button>
                  <button disabled={loading} onClick={() => updateConversation({ automationPaused: !thread.contact.automationPausedAt })} className="ea-btn-sm">{thread.contact.automationPausedAt ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}{thread.contact.automationPausedAt ? (locale === "tr" ? "Otomasyonu sürdür" : "Resume automation") : (locale === "tr" ? "Otomasyonu duraklat" : "Pause automation")}</button>
                </div>
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-4">
                <div className="rounded-xl border border-slate-200 bg-white p-3 xl:hidden">{crmContext}</div>
                {thread.messages.map((m) => (
                  <div key={m.id} className={cn("flex", messageAlign(m))}>
                    <div className={cn("max-w-[85%] break-words rounded-2xl px-3.5 py-2.5 text-sm shadow-sm sm:max-w-[75%]", messageTone(m))}>
                      <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">
                        {m.senderType === "bot" ? <Bot className="h-3 w-3" /> : m.senderType === "system" ? <Info className="h-3 w-3" /> : null}
                        {m.senderType}
                      </div>
                      <div className="whitespace-pre-wrap">{m.bodyText}</div>
                      {m.aiMeta?.latencyMs ? (
                        <div className="mt-1 text-[10px] opacity-60">AI {m.aiMeta.model} · {m.aiMeta.latencyMs} ms</div>
                      ) : null}
                      <div className="mt-1.5 flex flex-wrap items-center justify-end gap-x-2 text-[10px] opacity-60">
                        {m.direction === "outbound" ? <span className={cn(m.deliveryStatus === "failed" && "font-semibold")}>{m.deliveryStatus === "failed" ? `${locale === "tr" ? "Gönderilemedi" : "Failed"}${m.deliveryError ? `: ${m.deliveryError}` : ""}` : locale === "tr" ? "Gönderildi" : "Sent"}</span> : null}
                        <span>{formatDate(m.createdAt, locale === "tr" ? "tr-TR" : "en-US")}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="shrink-0 border-t border-slate-100 bg-white p-3">
                {windowClosed ? <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"><div className="flex items-center gap-1.5 font-semibold"><Clock className="h-3.5 w-3.5" />{locale === "tr" ? "24 saatlik WhatsApp penceresi kapandı" : "The 24-hour WhatsApp service window has ended"}</div><div className="mt-0.5">{locale === "tr" ? "Serbest mesaj gönderemezsiniz. Devam etmek için onaylı bir şablon seçin." : "Free-form messages are blocked. Select an approved template to continue."}</div><select value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="ea-input mt-2 border-amber-300"><option value="">{locale === "tr" ? "Onaylı şablon seçin" : "Select approved template"}</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name} · {template.language}</option>)}</select>{templateId ? <div className="mt-1 text-slate-600">{templates.find((template) => template.id === templateId)?.body}</div> : null}</div> : null}
                {composerError ? <div className="mb-2 rounded-xl border border-red-100 bg-red-50 p-2 text-xs text-red-700">{composerError}</div> : null}
                <div className="rounded-2xl border border-slate-200 bg-white p-2 focus-within:border-ea-500 focus-within:ring-2 focus-within:ring-ea-500/15">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send(false)}
                    disabled={thread.channelType === "whatsapp" && !thread.whatsappWindowOpen}
                    placeholder={thread.channelType === "whatsapp" && !thread.whatsappWindowOpen ? (locale === "tr" ? "Onaylı şablon gereklidir" : "An approved template is required") : (locale === "tr" ? "Mesaj yazın…" : "Type a message…")}
                    className="w-full bg-transparent px-2 py-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
                  />
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <button
                      disabled={thread.channelType === "whatsapp" && !thread.whatsappWindowOpen}
                      onClick={() => void send(true)}
                      className="ea-btn-sm border-aqua-200 bg-aqua-50 text-aqua-800 hover:bg-aqua-100"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      AI
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const response = await fetch("/api/knowledge/payment-details");
                        const data = await response.json().catch(() => ({}));
                        if (!response.ok || !data.text) {
                          setComposerError(locale === "tr" ? "Ödeme bilgisi henüz yok." : "Payment details are not available yet.");
                          return;
                        }
                        setComposerError("");
                        setText((current) => (current ? `${current}\n${data.text}` : data.text));
                      }}
                      className="ea-btn-sm"
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      {locale === "tr" ? "Ödeme bilgisi" : "Payment details"}
                    </button>
                    <label className="ea-btn-sm cursor-pointer"><Paperclip className="h-3.5 w-3.5" />{locale === "tr" ? "Dosya" : "File"}<input className="hidden" type="file" accept="image/jpeg,image/png,image/webp,application/pdf,text/plain" onChange={(e) => setAttachment(e.target.files?.[0] || null)} /></label>
                    {attachment ? <button disabled={loading} onClick={uploadAttachment} className="ea-btn-sm"><Upload className="h-3.5 w-3.5" />{locale === "tr" ? "Yükle" : "Upload"}</button> : null}
                    <button
                      disabled={thread.channelType === "whatsapp" && !thread.whatsappWindowOpen && !templateId}
                      onClick={() => void send(false)}
                      className="ea-btn-primary ml-auto px-3.5 py-1.5"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {thread.channelType === "whatsapp" && !thread.whatsappWindowOpen ? (locale === "tr" ? "Şablon gönder" : "Send template") : t(locale, "send")}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="grid flex-1 place-items-center">
              <EmptyState icon={MessagesSquare} title={t(locale, "noData")} />
            </div>
          )}
        </section>
        <aside className="hidden min-h-0 flex-col border-l border-slate-100 xl:flex">
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {crmContext}
          </div>
        </aside>
      </div>
    </div>
  );
}

type ThreadMessage = Thread["messages"][number];

function messageAlign(m: ThreadMessage) {
  if (m.senderType === "system") return "justify-center";
  return m.direction === "inbound" ? "justify-start" : "justify-end";
}

function messageTone(m: ThreadMessage) {
  if (m.senderType === "system") return "border border-amber-200 bg-amber-50 text-amber-900 shadow-none";
  if (m.senderType === "bot") return "rounded-br-md border border-aqua-200 bg-aqua-50 text-ea-950";
  if (m.direction === "inbound") return "rounded-bl-md border border-slate-200 bg-white text-slate-800";
  return "rounded-br-md bg-ea-600 text-white";
}
