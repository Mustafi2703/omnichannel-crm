"use client";

import { useEffect, useRef, useState } from "react";
import { Code2, KeyRound, MessageCircle, MessageSquareCode, Save } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export default function WidgetSettingsPage() {
  const [settings, setSettings] = useState<{
    brandColor?: string;
    welcomeTr?: string;
    welcomeEn?: string;
    widgetAllowedOrigins?: string[];
    widgetPublicKey?: string;
  }>({});
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    const controller = new AbortController();
    fetch("/api/admin/widget", { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        setSettings(data.tenant?.settings || {});
        setSlug(data.tenant?.slug || "");
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setError("Could not load widget settings.");
      });
    return () => controller.abort();
  }, []);

  const save = async () => {
    setError("");
    const r = await fetch("/api/admin/widget", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await r.json();
    if (!r.ok) {
      setError(typeof data.error === "string" ? data.error : data.error?.message || "Save failed");
      return;
    }
    setSettings(data.settings || settings);
  };

  const key = async () => {
    setError("");
    const r = await fetch("/api/admin/widget", { method: "POST" });
    const data = await r.json();
    if (!r.ok) {
      setError(typeof data.error === "string" ? data.error : data.error?.message || "Could not generate key");
      return;
    }
    setSettings(data.settings || settings);
  };

  const previewColor = settings.brandColor || "#3871c1";

  return (
    <div className="space-y-6">
      <PageHeader icon={MessageSquareCode} title="Widget settings" />
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="ea-card-pad space-y-5">
          <label className="block">
            <span className="ea-label">Brand colour</span>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <input
                type="color"
                value={settings.brandColor || "#3871c1"}
                onChange={(e) => setSettings({ ...settings, brandColor: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
              />
              <input
                value={settings.brandColor || "#3871c1"}
                onChange={(e) => setSettings({ ...settings, brandColor: e.target.value })}
                placeholder="#rrggbb"
                className="ea-input min-w-[8rem] flex-1 font-mono"
              />
            </div>
          </label>
          <label className="block">
            <span className="ea-label">Welcome copy (TR)</span>
            <textarea
              value={settings.welcomeTr || ""}
              onChange={(e) => setSettings({ ...settings, welcomeTr: e.target.value })}
              rows={3}
              className="ea-input mt-1.5"
            />
          </label>
          <label className="block">
            <span className="ea-label">Welcome copy (EN)</span>
            <textarea
              value={settings.welcomeEn || ""}
              onChange={(e) => setSettings({ ...settings, welcomeEn: e.target.value })}
              rows={3}
              className="ea-input mt-1.5"
            />
          </label>
          <label className="block">
            <span className="ea-label">Allowed origins (one per line)</span>
            <textarea
              value={(settings.widgetAllowedOrigins || []).join("\n")}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  widgetAllowedOrigins: e.target.value.split("\n").filter(Boolean),
                })
              }
              rows={4}
              className="ea-input mt-1.5 font-mono text-xs"
            />
          </label>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <button onClick={save} className="ea-btn-primary">
              <Save className="h-4 w-4" />
              Save
            </button>
            <button onClick={key} className="ea-btn">
              <KeyRound className="h-4 w-4" />
              Generate public key
            </button>
          </div>
        </div>

        <div className="min-w-0 space-y-6">
          <div className="ea-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-white" style={{ backgroundColor: previewColor }}>
              <MessageCircle className="h-4 w-4" />
              <span className="truncate">{slug}</span>
            </div>
            <div className="space-y-2 bg-slate-50/70 p-4">
              {[settings.welcomeEn, settings.welcomeTr].filter(Boolean).map((copy, index) => (
                <div key={index} className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-sm text-slate-700 shadow-sm ring-1 ring-slate-100">
                  {copy}
                </div>
              ))}
              <div className="ml-auto h-8 w-2/5 rounded-2xl rounded-tr-sm opacity-90" style={{ backgroundColor: previewColor }} />
            </div>
          </div>

          {settings.widgetPublicKey ? (
            <div className="ea-card-pad space-y-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-ea-50 text-ea-600">
                <Code2 className="h-4 w-4" />
              </div>
              <pre className="overflow-x-auto rounded-xl bg-ea-950 p-4 text-xs leading-relaxed text-ea-50">{`<script src="${typeof location !== "undefined" ? location.origin : ""}/widget.js" data-tenant="${slug}" data-key="${settings.widgetPublicKey}" data-api="${typeof location !== "undefined" ? location.origin : ""}"></script>`}</pre>
              <p className="break-words text-xs text-slate-500">
                Optional: add <code className="rounded bg-ea-50 px-1 py-0.5 text-ea-800">{'data-privacy="https://www.biohidrogen.com/kvkk"'}</code> to show a KVKK notice link above the message box.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
