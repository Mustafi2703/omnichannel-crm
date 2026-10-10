"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { AppShell } from "./AppShell";
import type { Locale } from "@/lib/i18n";

const LocaleCtx = createContext<{ locale: Locale; setLocale: (l: Locale) => void }>({
  locale: "tr",
  setLocale: () => {},
});

export function useLocale() {
  return useContext(LocaleCtx);
}

export function ClientProviders({
  children,
  userName,
  mustChangePassword = false,
}: {
  children: React.ReactNode;
  userName?: string;
  mustChangePassword?: boolean;
}) {
  const [locale, setLocale] = useState<Locale>("tr");
  useEffect(() => {
    const saved = localStorage.getItem("omni_locale") as Locale | null;
    if (saved === "tr" || saved === "en") setLocale(saved);
  }, []);
  function change(l: Locale) {
    setLocale(l);
    localStorage.setItem("omni_locale", l);
  }
  return (
    <LocaleCtx.Provider value={{ locale, setLocale: change }}>
      <AppShell locale={locale} onLocale={change} userName={userName} mustChangePassword={mustChangePassword}>
        {children}
      </AppShell>
    </LocaleCtx.Provider>
  );
}
