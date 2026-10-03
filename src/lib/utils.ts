import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(n: number, locale: string = "tr-TR", currency: string = "USD") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatTryMoney(n: number, locale: string = "tr-TR") {
  return formatMoney(n, locale, "TRY");
}

/** TRY formatting for lead values; returns null when empty or zero. */
export function formatLeadMoney(
  value: number | null | undefined,
  locale: string = "tr-TR",
): string | null {
  if (value == null || value <= 0) return null;
  return formatTryMoney(value, locale);
}

export function formatDate(d: Date | string | null | undefined, locale: string = "tr-TR") {
  if (!d) return "—";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(d));
}
