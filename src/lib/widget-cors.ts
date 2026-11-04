import { appBaseUrl } from "./app-url";

/** Normalise an origin URL to scheme://host[:port] for exact Origin matching. */
export function normaliseOrigin(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin.toLowerCase();
  } catch {
    return null;
  }
}

export function normaliseOriginList(values: string[] | undefined | null): string[] {
  const out: string[] = [];
  for (const value of values || []) {
    const origin = normaliseOrigin(value);
    if (origin && !out.includes(origin)) out.push(origin);
  }
  return out;
}

/**
 * Tenant origins plus WIDGET_ALLOWED_ORIGINS. Once any are set, the CRM's own
 * origin is added so the in-app Widget demo keeps working. Empty = any origin.
 */
export function resolveAllowedOrigins(tenantSettings: { widgetAllowedOrigins?: string[] } = {}) {
  const allowed = normaliseOriginList([
    ...(tenantSettings.widgetAllowedOrigins || []),
    ...(process.env.WIDGET_ALLOWED_ORIGINS || "").split(","),
  ]);
  return allowed.length ? normaliseOriginList([...allowed, appBaseUrl()]) : allowed;
}

export function corsHeaders(origin: string | null, allowed: string[]) {
  if (!origin || !allowed.includes(origin)) return {} as Record<string, string>;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
  };
}
