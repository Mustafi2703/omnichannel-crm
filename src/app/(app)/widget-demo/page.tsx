"use client";

import { useEffect, useMemo, useState } from "react";
import { Droplets, MessageCircle, SendHorizontal } from "lucide-react";
import { useLocale } from "@/components/ClientProviders";
import { PageHeader } from "@/components/PageHeader";

export default function WidgetDemoPage() {
  const { locale } = useLocale();
  const visitorId = useMemo(() => {
    if (typeof window === "undefined") return "ssr";
    const key = "omni_visitor_id";
    let id = localStorage.getItem(key);
    if (!id) {
      id = `web-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(key, id);
    }
    return id;
  }, []);
  const [messages, setMessages] = useState<{ role: string; text: string; sources?: { title: string }[] }[]>([
    {
      role: "bot",
      text:
        locale === "tr"
          ? "EA Global Water'a hoş geldiniz. Su arıtma ihtiyaçlarınızda nasıl yardımcı olabiliriz?"
          : "Welcome to EA Global Water. How can we help with your water-treatment needs?",
    },
  ]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [widgetConfig, setWidgetConfig] = useState<{ slug: string; publicKey: string | null } | null>(null);

  useEffect(() => {
    fetch("/api/widget/demo-config")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load widget configuration");
        return response.json() as Promise<{ slug: string; publicKey: string | null }>;
      })
      .then(setWidgetConfig)
      .catch(() => {
        setMessages((current) => [
          ...current,
          { role: "bot", text: locale === "tr" ? "Widget yapılandırması yüklenemedi. Lütfen sayfayı yenileyin." : "Widget configuration could not load. Please refresh the page." },
        ]);
      });
  }, [locale]);

  async function send() {
    if (!text.trim() || busy || !widgetConfig) return;
    const userText = text.trim();
    setText("");
    setMessages((m) => [...m, { role: "user", text: userText }]);
    setBusy(true);
    try {
      const res = await fetch("/api/widget/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug: widgetConfig.slug,
          publicKey: widgetConfig.publicKey || undefined,
          text: userText,
          visitorId,
          locale,
          name: locale === "tr" ? "Web Ziyaretçi" : "Web Visitor",
          utm: { utm_source: "widget-demo", utm_campaign: "dev-demo" },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.error || "Widget message failed");
      setMessages((m) => [...m, { role: "bot", text: data.reply || "…", sources: data.sources || [] }]);
    } catch {
      setMessages((m) => [...m, { role: "bot", text: locale === "tr" ? "Mesaj şu anda gönderilemedi. Lütfen tekrar deneyin." : "The message could not be sent right now. Please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={MessageCircle}
        title={locale === "tr" ? "Web sohbet widget demosu" : "Web chat widget demo"}
        description={
          locale === "tr"
            ? "Bu akış kişi + sohbet + lead oluşturur ve AI yanıtlar."
            : "This flow creates contact + conversation + lead and AI replies."
        }
      />
      <div className="relative overflow-hidden rounded-3xl border border-ea-900/[0.08] bg-gradient-to-br from-ea-50 via-white to-aqua-50 p-4 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-aqua-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-ea-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-lg overflow-hidden rounded-2xl border border-ea-900/[0.08] bg-white shadow-[0_24px_60px_-30px_rgba(13,35,71,0.45)]">
          <div className="flex items-center gap-2.5 bg-gradient-to-r from-ea-700 to-ea-500 px-4 py-3 text-sm font-semibold text-white">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-white/15">
              <Droplets className="h-4 w-4" />
            </div>
            EA Global Water Chat
          </div>
          <div className="h-[22rem] space-y-2 overflow-y-auto bg-slate-50/60 p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-auto rounded-br-sm bg-ea-600 text-white"
                    : "rounded-bl-sm bg-white text-slate-800 shadow-sm ring-1 ring-slate-100"
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t border-slate-100 p-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              className="ea-input min-w-0 flex-1"
              placeholder={locale === "tr" ? "Mesaj…" : "Message…"}
            />
            <button onClick={send} disabled={busy || !widgetConfig} className="ea-btn-primary">
              <SendHorizontal className="h-4 w-4" />
              {busy ? "…" : locale === "tr" ? "Gönder" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
