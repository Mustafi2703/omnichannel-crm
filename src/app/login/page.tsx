"use client";

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
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b1220] px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1d4edb55,_transparent_55%),radial-gradient(ellipse_at_bottom_right,_#0ea5e955,_transparent_40%)]" />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/95 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">EA Global Water</h1>
            <p className="mt-1 text-sm text-slate-500">
              {locale === "tr"
                ? "Su Arıtma CRM"
                : "Water Treatment CRM"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLocale(locale === "tr" ? "en" : "tr")}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600"
          >
            {locale === "tr" ? "EN" : "TR"}
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            {locale === "tr" ? "E-posta" : "Email"}
            <input
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            {locale === "tr" ? "Şifre" : "Password"}
            <input
              type="password"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading
              ? "..."
              : locale === "tr"
                ? "Giriş yap"
                : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
