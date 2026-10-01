/** Client visual Knowledge Base groups mapped to plan sections CORE/FUNDAMENTAL/PRODUCT/FAQ. */
export const KNOWLEDGE_CATEGORIES = [
  {
    id: "custom_instructions",
    section: "CORE",
    role: "CORE",
    labelEn: "Custom Instructions",
    labelTr: "Özel Talimatlar",
    descriptionEn: "Core AI commands — what to do and how to do it.",
    descriptionTr: "AI çekirdek komutları — ne yapılacağı ve nasıl yapılacağı.",
    aiHandling: "always_inject" as const,
  },
  {
    id: "channel_controls",
    section: "CORE",
    role: "CORE",
    labelEn: "Channel Controls",
    labelTr: "Kanal Kontrolleri",
    descriptionEn: "Channel enablement and routing notes for agents and AI.",
    descriptionTr: "Kanallar ve yönlendirme notları.",
    aiHandling: "always_inject" as const,
  },
  {
    id: "general_information",
    section: "FUNDAMENTAL",
    role: "FUNDAMENTAL",
    labelEn: "General Information",
    labelTr: "Genel Bilgiler",
    descriptionEn: "Name, company details, key benefits and promotions.",
    descriptionTr: "İsim, şirket bilgileri, temel avantajlar ve kampanyalar.",
    aiHandling: "always_inject" as const,
  },
  {
    id: "iban_information",
    section: "FUNDAMENTAL",
    role: "FUNDAMENTAL",
    labelEn: "IBAN Information",
    labelTr: "IBAN Bilgileri",
    descriptionEn: "Payment / IBAN details — human agents only; never sent to the AI.",
    descriptionTr: "Ödeme / IBAN bilgileri — yalnızca insan ajanlar; AI’ye gönderilmez.",
    aiHandling: "human_only" as const,
  },
  {
    id: "catalog_database",
    section: "PRODUCT",
    role: "PRODUCT",
    labelEn: "Catalog Database",
    labelTr: "Katalog Veritabanı",
    descriptionEn: "Products the AI recommends (specs, lifespan, contents).",
    descriptionTr: "AI’nin önereceği ürünler (özellikler, ömür, içerik).",
    aiHandling: "rag" as const,
  },
  {
    id: "question_answer_archive",
    section: "FAQ",
    role: "FAQ",
    labelEn: "Question–Answer Archive",
    labelTr: "Soru–Cevap Arşivi",
    descriptionEn: "Standard Q&A grounded on Core and Fundamental information.",
    descriptionTr: "Çekirdek ve temel bilgilere dayanan standart soru–cevaplar.",
    aiHandling: "rag" as const,
  },
] as const;

export type KnowledgeCategoryId = (typeof KNOWLEDGE_CATEGORIES)[number]["id"];

export const KNOWLEDGE_CATEGORY_IDS = KNOWLEDGE_CATEGORIES.map((c) => c.id);

export function isKnowledgeCategory(value: string): value is KnowledgeCategoryId {
  return (KNOWLEDGE_CATEGORY_IDS as readonly string[]).includes(value);
}

export function knowledgeCategoryLabel(id: string, locale: "tr" | "en") {
  const row = KNOWLEDGE_CATEGORIES.find((c) => c.id === id);
  if (!row) return id;
  return locale === "tr" ? row.labelTr : row.labelEn;
}

export function knowledgeCategoryMeta(id: string) {
  return KNOWLEDGE_CATEGORIES.find((c) => c.id === id);
}

/** PRODUCT + FAQ only — CORE/FUNDAMENTAL are always-injected; IBAN is human-only. */
export const CHAT_RETRIEVAL_CATEGORIES: KnowledgeCategoryId[] = KNOWLEDGE_CATEGORIES.filter(
  (c) => c.aiHandling === "rag",
).map((c) => c.id);

export const ALWAYS_INJECT_CATEGORIES: KnowledgeCategoryId[] = KNOWLEDGE_CATEGORIES.filter(
  (c) => c.aiHandling === "always_inject",
).map((c) => c.id);

export const HUMAN_ONLY_CATEGORIES: KnowledgeCategoryId[] = KNOWLEDGE_CATEGORIES.filter(
  (c) => c.aiHandling === "human_only",
).map((c) => c.id);
