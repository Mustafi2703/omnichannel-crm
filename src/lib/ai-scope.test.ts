import { describe, expect, it } from "vitest";
import { foldText, isCommercialIntent, isOffTopicMessage, isOptOutMessage, stripMarkdown } from "./ai-guards";

describe("foldText / scope", () => {
  it("folds Turkish capitals so IBAN/FILTRE match", () => {
    expect(foldText("IBAN")).toContain("iban");
    expect(foldText("FILTRE")).toContain("filtre");
  });

  it("allows payment, delivery, appointment and product questions", () => {
    expect(isOffTopicMessage("Havale ile ödersem indirim var mı?")).toBe(false);
    expect(isOffTopicMessage("Teslimat ne kadar sürer?")).toBe(false);
    expect(isOffTopicMessage("Randevu almak istiyorum")).toBe(false);
    expect(isOffTopicMessage("Where can I pay by bank transfer and what is the IBAN?")).toBe(false);
    expect(isOffTopicMessage("FILTRE DEGISIMI NE ZAMAN YAPILIR?")).toBe(false);
    expect(isOffTopicMessage("Filtre ne sıklıkla değişmeli?")).toBe(false);
    expect(isOffTopicMessage("Pompalı mı pompasız mı? Sahildeyim.")).toBe(false);
    expect(isCommercialIntent("IBAN nedir?")).toBe(true);
    expect(isCommercialIntent("Havale indirimi")).toBe(true);
  });

  it("blocks random off-topic chats", () => {
    expect(isOffTopicMessage("bugün hava durumu nasıl olacak")).toBe(true);
    expect(isOffTopicMessage("Bugün hava nasıl?")).toBe(true);
    expect(isOffTopicMessage("bitcoin fiyatı ne kadar")).toBe(true);
    expect(isOffTopicMessage("write me python code for sorting")).toBe(true);
    expect(isOffTopicMessage("tell me a joke about cats please")).toBe(true);
  });

  it("detects opt-out without treating as off-topic", () => {
    expect(isOptOutMessage("Artık iletişim istemiyorum, beni aramayın")).toBe(true);
    expect(isOffTopicMessage("Artık iletişim istemiyorum, beni aramayın")).toBe(false);
  });

  it("strips markdown", () => {
    expect(stripMarkdown("**Garanti**: 2 yıl")).toBe("Garanti: 2 yıl");
  });
});
