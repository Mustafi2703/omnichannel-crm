import { describe, expect, it } from "vitest";
import { isOffTopicMessage } from "./ai";

describe("isOffTopicMessage", () => {
  it("allows product and greeting messages", () => {
    expect(isOffTopicMessage("Filtre ne sıklıkla değişmeli?")).toBe(false);
    expect(isOffTopicMessage("Pompalı mı pompasız mı? Sahildeyim.")).toBe(false);
    expect(isOffTopicMessage("What is the warranty on Biohidrogen?")).toBe(false);
    expect(isOffTopicMessage("merhaba")).toBe(false);
    expect(isOffTopicMessage("bilgi alabilir miyim")).toBe(false);
  });

  it("blocks random off-topic chats", () => {
    expect(isOffTopicMessage("bugün hava durumu nasıl olacak")).toBe(true);
    expect(isOffTopicMessage("Bugün hava nasıl?")).toBe(true);
    expect(isOffTopicMessage("bitcoin fiyatı ne kadar")).toBe(true);
    expect(isOffTopicMessage("write me python code for sorting")).toBe(true);
    expect(isOffTopicMessage("tell me a joke about cats please")).toBe(true);
  });
});
