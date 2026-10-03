"use client";

import { useEffect, useRef, useState } from "react";

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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">Widget settings</h1>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <div className="space-y-3 rounded-xl border bg-white p-4">
        <label className="block text-sm">
          Brand colour
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <input
              type="color"
              value={settings.brandColor || "#2563eb"}
              onChange={(e) => setSettings({ ...settings, brandColor: e.target.value })}
              className="h-10 w-14 cursor-pointer rounded border border-slate-200"
            />
            <input
              value={settings.brandColor || "#2563eb"}
              onChange={(e) => setSettings({ ...settings, brandColor: e.target.value })}
              placeholder="#rrggbb"
              className="min-w-[8rem] flex-1 rounded border p-2 font-mono text-sm"
            />
          </div>
        </label>
        <label className="block text-sm">
          Welcome copy (TR)
          <textarea
            value={settings.welcomeTr || ""}
            onChange={(e) => setSettings({ ...settings, welcomeTr: e.target.value })}
            className="mt-1 w-full rounded border p-2"
          />
        </label>
        <label className="block text-sm">
          Welcome copy (EN)
          <textarea
            value={settings.welcomeEn || ""}
            onChange={(e) => setSettings({ ...settings, welcomeEn: e.target.value })}
            className="mt-1 w-full rounded border p-2"
          />
        </label>
        <label className="block text-sm">
          Allowed origins (one per line)
          <textarea
            value={(settings.widgetAllowedOrigins || []).join("\n")}
            onChange={(e) =>
              setSettings({
                ...settings,
                widgetAllowedOrigins: e.target.value.split("\n").filter(Boolean),
              })
            }
            className="mt-1 w-full rounded border p-2"
          />
        </label>
        <button onClick={save} className="rounded bg-blue-600 px-4 py-2 text-white">
          Save
        </button>
        <button onClick={key} className="ml-2 rounded border px-4 py-2">
          Generate public key
        </button>
      </div>
      {settings.widgetPublicKey ? (
        <pre className="overflow-auto rounded bg-slate-950 p-4 text-xs text-white">{`<script src="${typeof location !== "undefined" ? location.origin : ""}/widget.js" data-tenant="${slug}" data-key="${settings.widgetPublicKey}" data-api="${typeof location !== "undefined" ? location.origin : ""}"></script>`}</pre>
      ) : null}
    </div>
  );
}
