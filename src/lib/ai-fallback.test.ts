import { describe, expect, it, vi } from "vitest";

vi.mock("./prisma", () => ({ prisma: {} }));

import { applyReplySafety } from "./ai";

const genericFallback = "Merhaba! Size ürünlerimiz hakkında bilgi verebilirim. Daha önce su arıtma cihazı kullandınız mı?";

describe("applyReplySafety on the rule fallback", () => {
  it("tells the visitor about the handoff instead of the generic question", () => {
    const safe = applyReplySafety({ message: "IBAN numaranız nedir?", locale: "tr", reply: genericFallback, handoff: false, hasSources: true, cannedReply: true });
    expect(safe.handoff).toBe(true);
    expect(safe.reply).toContain("müşteri danışmanımıza aktarıyorum");
    expect(safe.reply).not.toContain("Daha önce");
  });

  it("keeps a model reply that already answers, even when the handoff is forced", () => {
    const safe = applyReplySafety({ message: "Pompalı model var mı?", locale: "tr", reply: "Evet, pompalı modelimiz var.", handoff: false, hasSources: true });
    expect(safe.handoff).toBe(true);
    expect(safe.reply).toBe("Evet, pompalı modelimiz var.");
  });
});
