"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/ClientProviders";

export default function AccountPage() {
  const { locale } = useLocale();
  const router = useRouter();
  const tr = locale === "tr";
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      const code = data.error?.code;
      if (code === "INVALID_PASSWORD") setError(tr ? "Mevcut şifre yanlış." : "Current password is incorrect.");
      else if (code === "PASSWORD_REUSED") setError(tr ? "Yeni şifre eskisiyle aynı olamaz." : "The new password must be different.");
      else if (code === "VALIDATION_ERROR") setError(tr ? "Yeni şifre en az 12 karakter olmalı." : "The new password must be at least 12 characters.");
      else setError(tr ? "Şifre değiştirilemedi." : "The password could not be changed.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-black tracking-tight">{tr ? "Hesap" : "Account"}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {tr
          ? "Devam etmeden önce geçici şifrenizi değiştirin. Yeni şifre en az 12 karakter olmalı ve eskisinden farklı olmalıdır."
          : "Change your temporary password before continuing. The new password must be at least 12 characters and different from the current one."}
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <label className="block text-sm font-semibold text-slate-700">
          {tr ? "Mevcut şifre" : "Current password"}
          <input
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-600"
          />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          {tr ? "Yeni şifre" : "New password"}
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-600"
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "..." : tr ? "Şifreyi değiştir" : "Change password"}
        </button>
      </form>
    </div>
  );
}
