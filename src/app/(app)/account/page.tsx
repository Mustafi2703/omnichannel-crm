"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldAlert, UserCog } from "lucide-react";
import { useLocale } from "@/components/ClientProviders";
import { PageHeader } from "@/components/PageHeader";

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
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <PageHeader icon={UserCog} title={tr ? "Hesap" : "Account"} />

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <p className="pt-1 leading-relaxed">
          {tr
            ? "Devam etmeden önce geçici şifrenizi değiştirin. Yeni şifre en az 12 karakter olmalı ve eskisinden farklı olmalıdır."
            : "Change your temporary password before continuing. The new password must be at least 12 characters and different from the current one."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="ea-card-pad space-y-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-ea-50 text-ea-600">
            <KeyRound className="h-4 w-4" />
          </div>
          <h2 className="ea-section-title text-base">{tr ? "Şifreyi değiştir" : "Change password"}</h2>
        </div>
        <label className="ea-label">
          {tr ? "Mevcut şifre" : "Current password"}
          <input
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="ea-input mt-1.5 py-2.5 normal-case tracking-normal"
          />
        </label>
        <label className="ea-label">
          {tr ? "Yeni şifre" : "New password"}
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="ea-input mt-1.5 py-2.5 normal-case tracking-normal"
          />
        </label>
        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}
        <button disabled={loading} className="ea-btn-primary w-full py-2.5">
          {loading ? "..." : tr ? "Şifreyi değiştir" : "Change password"}
        </button>
      </form>
    </div>
  );
}
