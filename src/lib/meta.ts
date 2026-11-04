import { createHmac, timingSafeEqual } from "node:crypto";
import type { SendResult } from "./inbound";

/**
 * Meta adapter: Messenger, Instagram DMs, Page and Instagram comments, and Lead Ads, through one Meta app.
 * Go live with META_APP_SECRET, META_VERIFY_TOKEN and META_PAGE_ACCESS_TOKEN.
 * Docs: docs/META_INTEGRATION.md
 */

const GRAPH = "https://graph.facebook.com/v25.0";

export const META_CHANNELS = ["messenger", "instagram", "facebook_comment", "instagram_comment"] as const;
export type MetaChannel = (typeof META_CHANNELS)[number];
export const isMetaChannel = (channelType: string): channelType is MetaChannel => (META_CHANNELS as readonly string[]).includes(channelType);

export type MetaInbound = { channelType: MetaChannel; from: string; text: string; externalMessageId: string; contactName?: string };
export type MetaLeadEvent = { leadgenId: string; formId?: string; adId?: string };

/** X-Hub-Signature-256 is "sha256=" + hex HMAC-SHA256 of the raw body, keyed with the app secret. */
export function verifyMetaSignature(rawBody: string, signature: string | null) {
  const secret = process.env.META_APP_SECRET;
  // Fail closed: nothing is accepted until the app secret is configured.
  if (!secret || !signature) return false;
  const expected = Buffer.from(`sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`);
  const received = Buffer.from(signature.trim());
  return expected.length === received.length && timingSafeEqual(expected, received);
}

type Messaging = {
  sender?: { id?: string };
  timestamp?: number;
  message?: { mid?: string; text?: string; is_echo?: boolean; attachments?: { type?: string; payload?: { url?: string } }[] };
  postback?: { mid?: string; title?: string };
};
type Change = {
  field?: string;
  value?: {
    item?: string; verb?: string; comment_id?: string; message?: string; from?: { id?: string; name?: string; username?: string };
    id?: string; text?: string; leadgen_id?: string; form_id?: string; ad_id?: string;
  };
};

/** Splits a webhook delivery into customer messages and comments (to store) and lead-form submissions (to fetch). */
export function parseMetaWebhook(payload: unknown) {
  const body = payload as { object?: string; entry?: { id?: string; messaging?: Messaging[]; changes?: Change[] }[] } | null;
  const instagram = body?.object === "instagram";
  const messages: MetaInbound[] = [];
  const leads: MetaLeadEvent[] = [];
  if (body?.object !== "page" && !instagram) return { messages, leads };

  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      const from = event.sender?.id;
      // Echoes are the Page's own replies.
      if (!from || event.message?.is_echo) continue;
      const attachment = event.message?.attachments?.[0];
      const text = (event.message?.text || event.postback?.title || "").trim()
        || (attachment ? `[${(attachment.type || "file").toUpperCase()}]${attachment.payload?.url ? ` ${attachment.payload.url}` : ""}` : "");
      const id = event.message?.mid || event.postback?.mid || `${from}-${event.timestamp}`;
      if (text) messages.push({ channelType: instagram ? "instagram" : "messenger", from, text, externalMessageId: id });
    }
    for (const { field, value } of entry.changes || []) {
      if (!value) continue;
      if (field === "leadgen" && value.leadgen_id) {
        leads.push({ leadgenId: value.leadgen_id, formId: value.form_id, adId: value.ad_id });
        continue;
      }
      const from = value.from?.id;
      // Comments by the Page or the Instagram account itself (our replies) are skipped.
      if (!from || from === entry.id) continue;
      if (!instagram && field === "feed" && value.item === "comment" && value.verb === "add" && value.comment_id && value.message) {
        messages.push({ channelType: "facebook_comment", from, text: value.message, externalMessageId: value.comment_id, contactName: value.from?.name });
      }
      if (instagram && field === "comments" && value.id && value.text) {
        messages.push({ channelType: "instagram_comment", from, text: value.text, externalMessageId: value.id, contactName: value.from?.username });
      }
    }
  }
  return { messages, leads };
}

async function graph<T>(path: string, body?: object): Promise<{ ok: true; data: T } | { ok: false; error: string; demo?: boolean }> {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) return { ok: false, error: "META_PAGE_ACCESS_TOKEN is not set", demo: true };
  try {
    const res = await fetch(`${GRAPH}/${path}`, {
      method: body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { ok: false, error: await res.text() };
    return { ok: true, data: (await res.json()) as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Graph API request failed" };
  }
}

/**
 * Answers in the channel the customer used: a DM goes to the sender (24-hour window), a comment gets a public reply
 * under the comment it answers.
 */
export async function sendMetaReply(channelType: MetaChannel, params: { to: string; replyToId?: string; text: string }): Promise<SendResult> {
  if (!process.env.META_PAGE_ACCESS_TOKEN) {
    console.info("[Meta demo send]", channelType, params.to, params.text.slice(0, 80));
    return { ok: true, externalMessageId: `demo-meta-${Date.now()}`, demo: true };
  }
  const comment = channelType === "facebook_comment" || channelType === "instagram_comment";
  if (comment && !params.replyToId) return { ok: false, error: "No comment to reply to" };
  const res = comment
    ? await graph<{ id?: string }>(`${params.replyToId}/${channelType === "instagram_comment" ? "replies" : "comments"}`, { message: params.text })
    : await graph<{ message_id?: string }>("me/messages", { recipient: { id: params.to }, messaging_type: "RESPONSE", message: { text: params.text } });
  if (!res.ok) return { ok: false, error: res.error };
  const data = res.data as { id?: string; message_id?: string };
  return { ok: true, externalMessageId: data.message_id || data.id };
}

/** The sender's name for a new DM contact; webhooks carry only an id. */
export async function fetchMetaName(channelType: "messenger" | "instagram", id: string) {
  const res = await graph<{ name?: string; username?: string }>(`${id}?fields=${channelType === "instagram" ? "name,username" : "name"}`);
  return res.ok ? res.data.name || res.data.username : undefined;
}

/** A Lead Ads submission's answers, keyed by question name (full_name, phone_number, email, custom questions). */
export async function fetchMetaLead(leadgenId: string) {
  const res = await graph<{ field_data?: { name: string; values?: string[] }[]; platform?: string }>(`${leadgenId}?fields=field_data,platform`);
  if (!res.ok) {
    console.error("Meta lead fetch failed", leadgenId, res.error);
    return null;
  }
  const fields = Object.fromEntries((res.data.field_data || []).map((f) => [f.name, (f.values || []).join(", ")]));
  return { fields, platform: res.data.platform };
}
