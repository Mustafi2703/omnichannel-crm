import { describe, expect, it } from "vitest";
import {
  ALWAYS_INJECT_CATEGORIES,
  CHAT_RETRIEVAL_CATEGORIES,
  HUMAN_ONLY_CATEGORIES,
  isKnowledgeCategory,
  KNOWLEDGE_CATEGORIES,
} from "@/lib/knowledge-categories";

describe("knowledge categories (plan Phase 2)", () => {
  it("maps client UI groups onto CORE/FUNDAMENTAL/PRODUCT/FAQ sections", () => {
    expect(new Set(KNOWLEDGE_CATEGORIES.map((c) => c.section))).toEqual(
      new Set(["CORE", "FUNDAMENTAL", "PRODUCT", "FAQ"]),
    );
  });

  it("never includes IBAN in chat retrieval or always-inject lists", () => {
    expect(HUMAN_ONLY_CATEGORIES).toContain("iban_information");
    expect(CHAT_RETRIEVAL_CATEGORIES).not.toContain("iban_information");
    expect(ALWAYS_INJECT_CATEGORIES).not.toContain("iban_information");
  });

  it("keeps Automation Settings out of the KB schema (Phase 5 config, not content)", () => {
    expect(isKnowledgeCategory("automation_settings")).toBe(false);
  });

  it("routes PRODUCT/FAQ through RAG and CORE/FUNDAMENTAL through always-inject", () => {
    expect(CHAT_RETRIEVAL_CATEGORIES).toEqual(["catalog_database", "question_answer_archive"]);
    expect(ALWAYS_INJECT_CATEGORIES).toEqual([
      "custom_instructions",
      "channel_controls",
      "general_information",
    ]);
  });
});
