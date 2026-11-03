"use client";

import { FormEvent, useState } from "react";

export function TryChat({ slug, publicKey }: { slug: string; publicKey: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [started, setStarted] = useState<{ name: string; phone: string; visitorId: string } | null>(null);
  const [error, setError] = useState("");

  function mountWidget(next: { name: string; phone: string; visitorId: string }) {
    document.getElementById("omni-widget-root")?.remove();
    document.getElementById("omni-try-script")?.remove();
    const script = document.createElement("script");
    script.id = "omni-try-script";
    script.src = `/widget.js?v=${encodeURIComponent(next.visitorId)}`;
    script.async = true;
    script.dataset.tenant = slug;
    script.dataset.key = publicKey;
    script.dataset.api = window.location.origin;
    script.dataset.visitor = next.visitorId;
    script.dataset.name = next.name;
    script.dataset.phone = next.phone;
    script.dataset.capture = "required";
    script.dataset.open = "true";
    script.dataset.privacy = "https://www.biohidrogen.com/kvkk";
    document.body.appendChild(script);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const nextName = name.trim();
    const nextPhone = phone.trim();
    if (nextName.length < 2 || nextPhone.replace(/\D/g, "").length < 8) {
      setError("Enter a name and a phone number with at least 8 digits.");
      return;
    }
    setError("");
    const next = { name: nextName, phone: nextPhone, visitorId: `try-${crypto.randomUUID()}` };
    setStarted(next);
    mountWidget(next);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ea-600">EA Global test link</p>
      <h1 className="mt-2 text-3xl font-semibold text-ea-950">Start a new visitor</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        Each start creates a separate contact. Ask a product question in the chat, then open Inbox and assign that person to an agent. This page is for testing before the widget is added to the shop site.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-3xl border border-ea-900/10 bg-white p-6 shadow-sm">
        <label className="block text-sm font-semibold text-slate-700">
          Name
          <input className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Phone
          <input className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" placeholder="05xx xxx xx xx" />
        </label>
        {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        <button className="w-full rounded-xl bg-ea-600 py-3 text-sm font-bold text-white">{started ? "Start as another person" : "Open the chat"}</button>
      </form>
      {started ? (
        <p className="mt-4 text-sm text-slate-600">
          Chat opened for <b className="text-ea-950">{started.name}</b>, {started.phone}. The button stays at the bottom right. In Inbox this contact can be assigned to an agent.
        </p>
      ) : null}
    </main>
  );
}
