/** Client visual Knowledge Base groups (mapped to CORE / FUNDAMENTAL / PRODUCT / FAQ roles). */
export const KNOWLEDGE_CATEGORIES = [
  {
    id: "custom_instructions",
    role: "CORE",
    labelEn: "Custom Instructions",
    labelTr: "Özel Talimatlar",
    descriptionEn: "Core AI commands — what to do and how to do it.",
    descriptionTr: "AI çekirdek komutları — ne yapılacağı ve nasıl yapılacağı.",
  },
  {
    id: "general_information",
    role: "FUNDAMENTAL",
    labelEn: "General Information",
    labelTr: "Genel Bilgiler",
    descriptionEn: "Name, company details, key benefits and promotions.",
    descriptionTr: "İsim, şirket bilgileri, temel avantajlar ve kampanyalar.",
  },
  {
    id: "catalog_database",
    role: "PRODUCT",
    labelEn: "Catalog Database",
    labelTr: "Katalog Veritabanı",
    descriptionEn: "Products the AI recommends (specs, lifespan, contents).",
    descriptionTr: "AI’nin önereceği ürünler (özellikler, ömür, içerik).",
  },
  {
    id: "question_answer_archive",
    role: "FAQ",
    labelEn: "Question–Answer Archive",
    labelTr: "Soru–Cevap Arşivi",
    descriptionEn: "Standard Q&A grounded on Core and Fundamental information.",
    descriptionTr: "Çekirdek ve temel bilgilere dayanan standart soru–cevaplar.",
  },
  {
    id: "channel_controls",
    role: "OPS",
    labelEn: "Channel Controls",
    labelTr: "Kanal Kontrolleri",
    descriptionEn: "Channel enablement and routing notes for agents and AI.",
    descriptionTr: "Kanallar ve yönlendirme notları.",
  },
  {
    id: "automation_settings",
    role: "OPS",
    labelEn: "Automation Settings",
    labelTr: "Otomasyon Ayarları",
    descriptionEn: "Rules and flow notes used by automations.",
    descriptionTr: "Otomasyon kuralları ve akış notları.",
  },
  {
    id: "iban_information",
    role: "OPS",
    labelEn: "IBAN Information",
    labelTr: "IBAN Bilgileri",
    descriptionEn: "Payment / IBAN details for verified replies only.",
    descriptionTr: "Doğrulanmış yanıtlar için ödeme / IBAN bilgileri.",
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

/** Prefer FAQ + product + fundamental + core when retrieving for chat. */
export const CHAT_RETRIEVAL_CATEGORIES: KnowledgeCategoryId[] = [
  "question_answer_archive",
  "catalog_database",
  "general_information",
  "custom_instructions",
  "iban_information",
];
