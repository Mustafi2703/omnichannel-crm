/** ASCII-fold Turkish/English so IBAN/FILTRE/havale match reliably. */
export function foldText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ş/gi, "s")
    .replace(/ğ/gi, "g")
    .replace(/ü/gi, "u")
    .replace(/ö/gi, "o")
    .replace(/ç/gi, "c")
    .toLowerCase();
}

const DOMAIN_SCOPE =
  /\b(?:su|water|arit|purif|filter|filtre|biohidrogen|bio.?hidrogen|ea global|alkali|orp|hidrojen|hydrogen|pompa|pump|garanti|warranty|kurulum|install|cihaz|device|mineral|cinko|bakir|zinc|copper|b12|iade|refund|fiyat|price|iban|nsf|sgs|katalog|catalog|urun|product|tezgah|baby|canli|olu su|seramik|zeolit|turmalin|maifan|atik|taksit|havale|kargo|orijinal|bayilik|franchise|kampanya|memnuniyet|danisman|musteri|servis|service|filtreleme|ph\b|antioksidan|antioxidant|sahil|coastal|deprem|earthquake|teslimat|delivery|odeme|payment|randevu|appointment|siparis|magaza|calisma)/i;

const OBVIOUS_OFF_TOPIC =
  /\b(?:bitcoin|kripto|crypto|stock market|borsa hissesi|hava durumu|\bhava\b(?!le)|weather|yemek tarifi|recipe for|football score|futbol mac|mac skoru|siyaset|politics|secim sonucu|write (?:me )?(?:code|python|javascript|sql|a poem|poem)|kod yaz|siir yaz|odev yap|homework|saka anlat|tell (?:me )?a joke|netflix|film oner|spam|hack|jailbreak|ignore (?:your|all)(?:\s+\w+){0,3}\s+instructions|system prompt|capital of|baskent|philosophy|sunny in)\b/i;

const DISEASE_CLAIM =
  /\b(?:diyabet|diabetes|migren|migraine|tedavi|hastalik|disease|sifa|cure)\b/i;

const OPT_OUT =
  /\b(?:iletisim istemiyorum|beni aramayin|beni arama|do not (?:call|contact|message)|don't (?:call|contact|message)|stop (?:contacting|messaging)|unsubscribe|opt[- ]?out|kara liste|blacklist)\b/i;

export function normaliseKnowledgeQuery(value: string) {
  let normalised = value
    .replace(/\bfıltre\b/gi, "filtre")
    .replace(/\bdegısım\b/gi, "değişim")
    .replace(/\bzamnı\b/gi, "zamanı")
    .replace(/\binstalation\b/gi, "installation")
    .replace(/\btomorow\b/gi, "tomorrow");
  if (/\b(pump|pompa)/i.test(normalised)) {
    normalised += " pump pompa second floor ikinci kat coastal kıyı earthquake deprem";
  }
  return normalised;
}

function isBriefAck(message: string) {
  return /^(?:yes|no|evet|hayır|hayir|merhaba|selam|hello|hi|hey|teşekkür(?:ler)?|tesekkur(?:ler)?|thanks|thank you|rica ederim|ok|tamam|günaydın|gunaydin|iyi akşamlar|iyi aksamlar)$/i.test(
    message.trim(),
  );
}

export function isOptOutMessage(message: string) {
  return OPT_OUT.test(foldText(message));
}

export function isCommercialIntent(message: string) {
  const text = foldText(message);
  return /\b(fiyat\w*|price|teklif\w*|quote|indirim\w*|discount|taksit\w*|ucret\w*|payment|odeme\w*|delivery|teslimat\w*|iban|banka\w*|bank account|havale|eft|randevu\w*|appointment)\b/.test(text);
}

export function isProductSignal(message: string) {
  return DOMAIN_SCOPE.test(foldText(normaliseKnowledgeQuery(message)));
}

export function isDiseaseClaim(message: string) {
  return DISEASE_CLAIM.test(foldText(message));
}

export function scopeReply(locale: "tr" | "en") {
  return locale === "tr"
    ? "Ben yalnızca Biohidrogen / EA Global su arıtma ürünleri ve hizmetleri hakkında yardımcı olabilirim. Cihaz, filtre, kurulum veya canlı su hakkında sorabilirsiniz."
    : "I can only help with Biohidrogen / EA Global water-treatment products and services. Please ask about devices, filters, installation, or living water.";
}

function isHelpRequest(message: string) {
  const text = foldText(message);
  return /\b(bilgi|info|yardim|help|destek|support)\b/.test(text) && text.split(/\s+/).length <= 12;
}

/** Opening turn with nothing in the KB and no product or payment signal stays in scope-guard. */
export function isUngroundedOpening(message: string, opts: { userTurns: number; hasSources: boolean }) {
  if (opts.userTurns !== 1 || opts.hasSources) return false;
  if (!message.trim() || isBriefAck(message) || isOptOutMessage(message) || isDiseaseClaim(message)) return false;
  if (isOffTopicMessage(message)) return true;
  if (isCommercialIntent(message) || isProductSignal(message) || isHelpRequest(message)) return false;
  return true;
}

/** Only product or payment questions should become an adviser handoff when retrieval is empty. */
export function requiresConfirmedAnswer(message: string) {
  return isCommercialIntent(message) || isProductSignal(message);
}

/** Reject only clearly off-topic chats; payment/IBAN/delivery stay in scope. */
export function isOffTopicMessage(message: string) {
  const text = foldText(normaliseKnowledgeQuery(message)).trim();
  if (!text || isBriefAck(text) || isOptOutMessage(message)) return false;
  // Crypto/weather/etc. win over a bare "fiyat/price" commercial match (e.g. "bitcoin fiyatı").
  if (OBVIOUS_OFF_TOPIC.test(text)) return true;
  if (isCommercialIntent(message) || DOMAIN_SCOPE.test(text)) return false;
  if (/\b(bilgi|info|yardim|help|destek|support|urun|product|cihaz)\b/.test(text) && text.split(/\s+/).length <= 12) {
    return false;
  }
  return false;
}

export function stripMarkdown(value: string) {
  return value
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

export { isBriefAck };
