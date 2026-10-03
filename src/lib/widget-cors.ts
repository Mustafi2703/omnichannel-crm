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

export function corsHeaders(origin: string | null, allowed: string[]) {
  if (!origin || !allowed.includes(origin)) return {} as Record<string, string>;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
  };
}
