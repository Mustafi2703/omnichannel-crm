import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./prisma", () => ({ prisma: {} }));
const { parseAisensyNotification, sendAisensyText, verifyAisensySignature } = await import("./aisensy");

// Shape from AiSensy's Project Webhook docs (topic message.sender.user).
const notification = (message: Record<string, unknown>, topic = "message.sender.user") => ({
  id: "ntf-1",
  created_at: 1793700000000,
  topic,
  delivery_attempt: 1,
  project_id: "proj-1",
  data: { message: { type: "message", id: "msg-1", phone_number: "905551112233", sender: "USER", messageId: "wamid.ABC", user_name: "Ayşe", ...message } },
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("verifyAisensySignature", () => {
  const sign = (body: string) => createHmac("sha256", "shh").update(body).digest("hex");

  it("accepts the HMAC of the raw body and of AiSensy's re-serialised body", () => {
    vi.stubEnv("AISENSY_WEBHOOK_SECRET", "shh");
    const raw = JSON.stringify(notification({ message_type: "TEXT", message_content: { text: "Merhaba" } }));
    expect(verifyAisensySignature(raw, sign(raw))).toBe(true);
    expect(verifyAisensySignature(JSON.stringify(JSON.parse(raw), null, 2), sign(raw))).toBe(true);
  });

  it("rejects a wrong or missing signature, and everything when no secret is set", () => {
    vi.stubEnv("AISENSY_WEBHOOK_SECRET", "shh");
    expect(verifyAisensySignature("{}", sign("{ }x"))).toBe(false);
    expect(verifyAisensySignature("{}", null)).toBe(false);
    vi.stubEnv("AISENSY_WEBHOOK_SECRET", "");
    expect(verifyAisensySignature("{}", sign("{}"))).toBe(false);
  });
});

describe("parseAisensyNotification", () => {
  it("reads a customer's text message", () => {
    expect(parseAisensyNotification(notification({ message_type: "TEXT", message_content: { text: " Merhaba " } }))).toEqual({
      externalMessageId: "wamid.ABC",
      from: "905551112233",
      text: "Merhaba",
      contactName: "Ayşe",
    });
  });

  it("uses button titles and shows media without a caption by type and link", () => {
    expect(parseAisensyNotification(notification({ message_type: "BUTTON_REPLY", message_content: { title: "Evet" } }))?.text).toBe("Evet");
    expect(parseAisensyNotification(notification({ message_type: "IMAGE", message_content: { url: "https://x/y.jpg" } }))?.text).toBe("[IMAGE] https://x/y.jpg");
  });

  it("ignores other topics", () => {
    expect(parseAisensyNotification(notification({ message_content: { text: "hi" } }, "message.status.updated"))).toBeNull();
    expect(parseAisensyNotification({})).toBeNull();
  });
});

describe("sendAisensyText", () => {
  it("posts to the Project API messages endpoint with the app password", async () => {
    vi.stubEnv("AISENSY_PROJECT_ID", "proj-1");
    vi.stubEnv("AISENSY_PROJECT_API_PWD", "pwd");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: "wamid.OUT" }] })));
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendAisensyText({ to: "+90 555 111 22 33", text: "Merhaba" })).resolves.toEqual({ ok: true, externalMessageId: "wamid.OUT" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://apis.aisensy.com/project-apis/v1/project/proj-1/messages");
    expect(init.headers["X-AiSensy-Project-API-Pwd"]).toBe("pwd");
    expect(JSON.parse(init.body)).toEqual({ to: "905551112233", recipient_type: "individual", type: "text", text: { body: "Merhaba" } });
  });

  it("stays in demo mode without credentials", async () => {
    vi.stubEnv("AISENSY_PROJECT_ID", "");
    vi.stubGlobal("fetch", vi.fn());
    await expect(sendAisensyText({ to: "905551112233", text: "x" })).resolves.toMatchObject({ ok: true, demo: true });
    expect(fetch).not.toHaveBeenCalled();
  });
});
