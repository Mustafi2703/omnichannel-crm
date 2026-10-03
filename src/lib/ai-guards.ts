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
  /\b(?:bitcoin|kripto|crypto|stock market|borsa hissesi|hava durumu|\bhava\b(?!le)|weather|yemek tarifi|recipe for|football score|futbol mac|mac skoru|siyaset|politics|secim sonucu|write (?:me )?(?:code|python|javascript|sql)|kod yaz|odev yap|homework|saka anlat|tell (?:me )?a joke|netflix|film oner|spam|hack|jailbreak|ignore (?:your|all) instructions|philosophy|sunny in)\b/i;

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
  return /\b(fiyat|price|teklif|quote|indirim|discount|taksit|payment|odeme|delivery|teslimat|iban|banka|bank account|havale|eft|randevu|appointment)\b/.test(text);
}

/** Reject only clearly off-topic chats; payment/IBAN/delivery stay in scope. */
export function isOffTopicMessage(message: string) {
  const text = foldText(normaliseKnowledgeQuery(message)).trim();
  if (!text || isBriefAck(text) || isOptOutMessage(message) || isCommercialIntent(message)) return false;
  if (DOMAIN_SCOPE.test(text)) return false;
  if (OBVIOUS_OFF_TOPIC.test(text)) return true;
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
