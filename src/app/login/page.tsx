"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locale, setLocale] = useState<"tr" | "en">("tr");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(locale === "tr" ? "Geçersiz giriş" : "Invalid credentials");
      return;
    }
    const data = await res.json().catch(() => ({}));
    router.push(data.user?.mustChangePassword ? "/account" : "/dashboard");
    router.refresh();
  }

  const brands = [
    { src: "/brand/biohidrogen", alt: "Biohidrogen", width: 900, height: 189 },
    { src: "/brand/hidrotek", alt: "Hidrotek EA Water", width: 900, height: 167 },
  ];

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-ea-950 via-[#123468] to-ea-800 px-14 py-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-aqua-500/20 blur-3xl" />
        <div className="absolute -bottom-20 right-0 h-96 w-96 rounded-full bg-ea-500/30 blur-3xl" />
        <Image
          src="/brand/ea-drop.png"
          alt=""
          width={167}
          height={256}
          aria-hidden
          className="pointer-events-none absolute -right-10 top-1/2 h-[420px] w-auto -translate-y-1/2 opacity-[0.07]"
        />
        <Image src="/brand/ea-global-white.png" alt="EA Global Water Systems" width={900} height={209} priority className="relative h-auto w-64" />
        <div className="relative max-w-lg">
          <h1 className="text-5xl font-semibold leading-tight">
            {locale === "tr" ? "Müşteri görüşmeleri, tek ekranda." : "Customer conversations, on one screen."}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-ea-100/85">
            {locale === "tr"
              ? "Gelen kutusu, pipeline, randevu ve yapay zeka aynı çalışma alanında."
              : "Inbox, pipeline, appointments, and the assistant share one workspace."}
          </p>
        </div>
        <div className="relative">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-aqua-300/80">{locale === "tr" ? "Markalarımız" : "Our brands"}</div>
          <div className="mt-4 flex flex-wrap items-center gap-x-10 gap-y-4">
            {brands.map((brand) => (
              <Image key={brand.alt} src={`${brand.src}-white.png`} alt={brand.alt} width={brand.width} height={brand.height} className="h-auto w-44 opacity-90" />
            ))}
          </div>
          <div className="mt-8 text-sm text-ea-200/60">eacrm.net</div>
        </div>
      </section>
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-start justify-between gap-3">
            <div>
              <Image src="/brand/ea-global.png" alt="EA Global Water Systems" width={900} height={209} priority className="h-auto w-56" />
              <p className="mt-3 text-sm font-medium text-slate-500">{locale === "tr" ? "Su Arıtma CRM" : "Water Treatment CRM"}</p>
            </div>
            <button
              type="button"
              onClick={() => setLocale(locale === "tr" ? "en" : "tr")}
              className="rounded-full border border-ea-900/15 bg-white px-3 py-1 text-xs font-semibold text-ea-800"
            >
              {locale === "tr" ? "EN" : "TR"}
            </button>
          </div>
          <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-ea-900/10 bg-white p-6 shadow-[0_24px_60px_-28px_rgba(13,35,71,0.45)]">
            <label className="block text-sm font-semibold text-slate-700">
              {locale === "tr" ? "E-posta" : "Email"}
              <input
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              {locale === "tr" ? "Şifre" : "Password"}
              <input
                type="password"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-ea-600 to-aqua-500 py-2.5 text-sm font-bold text-white shadow-lg shadow-ea-600/25 transition hover:brightness-105 disabled:opacity-60"
            >
              {loading ? "..." : locale === "tr" ? "Giriş yap" : "Sign in"}
            </button>
          </form>
          <div className="mt-10 lg:hidden">
            <div className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{locale === "tr" ? "Markalarımız" : "Our brands"}</div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              {brands.map((brand) => (
                <Image key={brand.alt} src={`${brand.src}.png`} alt={brand.alt} width={brand.width} height={brand.height} className="h-auto w-32" />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
