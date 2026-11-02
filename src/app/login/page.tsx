"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ShieldCheck } from "lucide-react";

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

  const highlights = locale === "tr"
    ? ["Web sohbeti ve yapay zeka asistanı", "Satış hattı, randevu ve görevler", "SLA uyarıları ve ekip yönetimi"]
    : ["Web chat and AI assistant", "Sales pipeline, appointments and tasks", "SLA alerts and team management"];

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.15fr_0.85fr]">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-ea-950 via-[#123468] to-ea-800 px-16 py-14 text-white lg:flex lg:flex-col">
        <div className="absolute -left-24 top-24 h-96 w-96 rounded-full bg-aqua-500/20 blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-[28rem] w-[28rem] rounded-full bg-ea-500/30 blur-3xl" />
        <Image
          src="/brand/ea-drop.png"
          alt=""
          width={167}
          height={256}
          aria-hidden
          className="pointer-events-none absolute -right-16 top-1/2 h-[560px] w-auto -translate-y-1/2 opacity-[0.08]"
        />

        <div className="relative flex flex-1 flex-col justify-center">
          <Image
            src="/brand/ea-global-white.png"
            alt="EA Global Water Systems"
            width={900}
            height={209}
            priority
            className="h-auto w-full max-w-[30rem] drop-shadow-[0_12px_40px_rgba(0,173,239,0.25)]"
          />
          <div className="mt-6 h-1 w-24 rounded-full bg-gradient-to-r from-aqua-400 to-ea-400" />
          <h1 className="mt-8 max-w-xl text-4xl font-semibold leading-tight xl:text-5xl">
            {locale === "tr" ? "Müşteri görüşmeleri, tek ekranda." : "Customer conversations, on one screen."}
          </h1>
          <ul className="mt-8 space-y-3 text-base text-ea-100/90">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-aqua-500/20 text-aqua-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mt-10 border-t border-white/10 pt-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-aqua-300/70">
            {locale === "tr" ? "EA Global grup markaları" : "EA Global group brands"}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3">
            {brands.map((brand) => (
              <Image key={brand.alt} src={`${brand.src}-white.png`} alt={brand.alt} width={brand.width} height={brand.height} className="h-auto w-32 opacity-70" />
            ))}
            <span className="ml-auto text-sm text-ea-200/60">eacrm.net</span>
          </div>
        </div>
      </section>

      <section className="flex flex-col bg-gradient-to-b from-white to-ea-50/60 px-6 py-8 sm:px-10">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setLocale(locale === "tr" ? "en" : "tr")}
            className="rounded-full border border-ea-900/15 bg-white px-3 py-1 text-xs font-semibold text-ea-800 shadow-sm hover:bg-ea-50"
          >
            {locale === "tr" ? "EN" : "TR"}
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <Image src="/brand/ea-global.png" alt="EA Global Water Systems" width={900} height={209} priority className="mx-auto h-auto w-72" />
            </div>
            <div className="mb-6 flex items-center gap-4">
              <div className="hidden h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-ea-600 to-aqua-500 shadow-lg shadow-ea-600/25 lg:grid">
                <Image src="/brand/ea-drop.png" alt="" width={167} height={256} aria-hidden className="h-8 w-auto brightness-0 invert" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-ea-950">{locale === "tr" ? "Hoş geldiniz" : "Welcome back"}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {locale === "tr" ? "EA Global CRM hesabınızla giriş yapın." : "Sign in with your EA Global CRM account."}
                </p>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-ea-900/10 bg-white p-6 shadow-[0_24px_60px_-28px_rgba(13,35,71,0.45)] sm:p-7">
              <label className="block text-sm font-semibold text-slate-700">
                {locale === "tr" ? "E-posta" : "Email"}
                <span className="relative mt-1.5 block">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    placeholder="ad.soyad@eaglobalwater.com"
                  />
                </span>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                {locale === "tr" ? "Şifre" : "Password"}
                <span className="relative mt-1.5 block">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </span>
              </label>
              {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
              <button
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-ea-600 to-aqua-500 py-3 text-sm font-bold text-white shadow-lg shadow-ea-600/25 transition hover:brightness-105 disabled:opacity-60"
              >
                {loading ? "..." : locale === "tr" ? "Giriş yap" : "Sign in"}
              </button>
            </form>
          </div>
        </div>

        <div className="pt-4">
          <div className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 lg:hidden">
            {locale === "tr" ? "EA Global grup markaları" : "EA Global group brands"}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 lg:hidden">
            {brands.map((brand) => (
              <Image key={brand.alt} src={`${brand.src}.png`} alt={brand.alt} width={brand.width} height={brand.height} className="h-auto w-28 opacity-80" />
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-slate-400">© {new Date().getFullYear()} EA Global Water Systems</p>
        </div>
      </section>
    </div>
  );
}
