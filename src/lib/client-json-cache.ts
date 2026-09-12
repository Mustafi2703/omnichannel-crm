"use client";

type Entry =
  | { data: unknown; expiresAt: number }
  | { pending: Promise<unknown> };

const entries = new Map<string, Entry>();
const DEFAULT_TTL_MS = 15_000;

export async function getClientJson<T>(url: string, ttlMs = DEFAULT_TTL_MS): Promise<T> {
  const current = entries.get(url);
  if (current && "data" in current && current.expiresAt > Date.now()) {
    return current.data as T;
  }
  if (current && "pending" in current) return current.pending as Promise<T>;

  const pending = fetch(url, { credentials: "same-origin" })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      const data = await response.json();
      entries.set(url, { data, expiresAt: Date.now() + ttlMs });
      return data;
    })
    .catch((error) => {
      entries.delete(url);
      throw error;
    });
  entries.set(url, { pending });
  return pending as Promise<T>;
}

export function prefetchClientJson(url: string) {
  void getClientJson(url).catch(() => {});
}

export function invalidateClientJson(urlPrefix: string) {
  for (const key of entries.keys()) {
    if (key.startsWith(urlPrefix)) entries.delete(key);
  }
}

export function clearClientJsonCache() {
  entries.clear();
}
