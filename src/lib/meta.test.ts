import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchMetaLead, parseMetaWebhook, sendMetaReply, verifyMetaSignature } from "./meta";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("verifyMetaSignature", () => {
  it("accepts sha256=<HMAC of the raw body with the app secret> and nothing else", () => {
    vi.stubEnv("META_APP_SECRET", "app-secret");
    const raw = '{"object":"page","entry":[]}';
    const good = `sha256=${createHmac("sha256", "app-secret").update(raw).digest("hex")}`;
    expect(verifyMetaSignature(raw, good)).toBe(true);
    expect(verifyMetaSignature(raw + " ", good)).toBe(false);
    expect(verifyMetaSignature(raw, null)).toBe(false);
    vi.stubEnv("META_APP_SECRET", "");
    expect(verifyMetaSignature(raw, good)).toBe(false);
  });
});

describe("parseMetaWebhook", () => {
  it("reads Messenger messages and postbacks but skips the Page's own echoes", () => {
    const { messages } = parseMetaWebhook({
      object: "page",
      entry: [{ id: "PAGE", messaging: [
        { sender: { id: "PSID1" }, timestamp: 1, message: { mid: "m.1", text: "Fiyat nedir?" } },
        { sender: { id: "PAGE" }, timestamp: 2, message: { mid: "m.2", text: "Merhaba", is_echo: true } },
        { sender: { id: "PSID1" }, timestamp: 3, postback: { mid: "m.3", title: "Başlayın" } },
        { sender: { id: "PSID1" }, timestamp: 4, message: { mid: "m.4", attachments: [{ type: "image", payload: { url: "https://x/y.jpg" } }] } },
      ] }],
    });
    expect(messages).toEqual([
      { channelType: "messenger", from: "PSID1", text: "Fiyat nedir?", externalMessageId: "m.1" },
      { channelType: "messenger", from: "PSID1", text: "Başlayın", externalMessageId: "m.3" },
      { channelType: "messenger", from: "PSID1", text: "[IMAGE] https://x/y.jpg", externalMessageId: "m.4" },
    ]);
  });

  it("reads Instagram DMs and comments, and Page comments, skipping our own comments", () => {
    const ig = parseMetaWebhook({
      object: "instagram",
      entry: [{ id: "IGACC", messaging: [{ sender: { id: "IGSID" }, message: { mid: "ig.1", text: "Merhaba" } }], changes: [
        { field: "comments", value: { id: "c1", text: "Fiyat?", from: { id: "IGUSER", username: "ayse" } } },
        { field: "comments", value: { id: "c2", text: "DM attık", from: { id: "IGACC", username: "biohidrogen" } } },
      ] }],
    });
    expect(ig.messages).toEqual([
      { channelType: "instagram", from: "IGSID", text: "Merhaba", externalMessageId: "ig.1" },
      { channelType: "instagram_comment", from: "IGUSER", text: "Fiyat?", externalMessageId: "c1", contactName: "ayse" },
    ]);

    const page = parseMetaWebhook({
      object: "page",
      entry: [{ id: "PAGE", changes: [
        { field: "feed", value: { item: "comment", verb: "add", comment_id: "p_c1", message: "Bilgi alabilir miyim?", from: { id: "U1", name: "Ali Veli" } } },
        { field: "feed", value: { item: "comment", verb: "edited", comment_id: "p_c1", message: "x", from: { id: "U1" } } },
        { field: "feed", value: { item: "comment", verb: "add", comment_id: "p_c2", message: "Teşekkürler", from: { id: "PAGE" } } },
      ] }],
    });
    expect(page.messages).toEqual([
      { channelType: "facebook_comment", from: "U1", text: "Bilgi alabilir miyim?", externalMessageId: "p_c1", contactName: "Ali Veli" },
    ]);
  });

  it("collects Lead Ads submissions and ignores other objects", () => {
    expect(parseMetaWebhook({ object: "page", entry: [{ id: "PAGE", changes: [{ field: "leadgen", value: { leadgen_id: "L1", form_id: "F1", ad_id: "A1" } }] }] }).leads)
      .toEqual([{ leadgenId: "L1", formId: "F1", adId: "A1" }]);
    expect(parseMetaWebhook({ object: "user", entry: [] })).toEqual({ messages: [], leads: [] });
  });
});

describe("Graph API calls", () => {
  const graphReturns = (data: object) => {
    vi.stubEnv("META_PAGE_ACCESS_TOKEN", "page-token");
    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify(data)));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  };

  it("sends a DM through me/messages and comment replies under the comment", async () => {
    const fetchMock = graphReturns({ message_id: "mid.OUT", id: "c.OUT" });
    await expect(sendMetaReply("messenger", { to: "PSID1", text: "Merhaba" })).resolves.toEqual({ ok: true, externalMessageId: "mid.OUT" });
    await sendMetaReply("facebook_comment", { to: "U1", replyToId: "p_c1", text: "DM'den yazdık" });
    await sendMetaReply("instagram_comment", { to: "IGUSER", replyToId: "c1", text: "DM'den yazdık" });

    const calls = fetchMock.mock.calls.map(([url, init]) => [url, JSON.parse(init.body), init.headers.Authorization]);
    expect(calls).toEqual([
      ["https://graph.facebook.com/v25.0/me/messages", { recipient: { id: "PSID1" }, messaging_type: "RESPONSE", message: { text: "Merhaba" } }, "Bearer page-token"],
      ["https://graph.facebook.com/v25.0/p_c1/comments", { message: "DM'den yazdık" }, "Bearer page-token"],
      ["https://graph.facebook.com/v25.0/c1/replies", { message: "DM'den yazdık" }, "Bearer page-token"],
    ]);
  });

  it("stays in demo mode without a Page token", async () => {
    vi.stubEnv("META_PAGE_ACCESS_TOKEN", "");
    vi.stubGlobal("fetch", vi.fn());
    await expect(sendMetaReply("messenger", { to: "PSID1", text: "x" })).resolves.toMatchObject({ ok: true, demo: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("flattens a lead's answers by question name", async () => {
    graphReturns({ platform: "ig", field_data: [{ name: "full_name", values: ["Ayşe Yılmaz"] }, { name: "phone_number", values: ["+905551112233"] }] });
    await expect(fetchMetaLead("L1")).resolves.toEqual({ platform: "ig", fields: { full_name: "Ayşe Yılmaz", phone_number: "+905551112233" } });
  });
});
