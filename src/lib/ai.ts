import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import { prisma } from "./prisma";
import { loadAlwaysInjectKnowledge, retrieveKnowledge, type KnowledgeSource } from "./knowledge";
import { CHAT_RETRIEVAL_CATEGORIES } from "./knowledge-categories";
import { getChatClient } from "./llm";
import { getOperationsSettings } from "./tenant-settings";

export type AiReplyResult = {
  reply: string;
  handoff: boolean;
  qualification?: Record<string, string>;
  scoreDelta?: number;
  usedModel: string;
  tokensIn?: number;
  tokensOut?: number;
  latencyMs?: number;
  sources?: KnowledgeSource[];
};

type ReplySafety = {
  forceHandoff: boolean;
  suppressHandoff?: boolean;
  replacement?: string;
  appendPolicyQualifier?: boolean;
  appendInstallationQualifier?: boolean;
  offTopic?: boolean;
};

const DOMAIN_SCOPE =
  /\b(?:su|water|arıt|arit|purif|filter|filtre|biohidrogen|bio.?hidrogen|ea global|alkali|orp|hidrojen|hydrogen|pompa|pump|garanti|warranty|kurulum|install|cihaz|device|mineral|çinko|cinko|bakır|bakir|zinc|copper|b12|iade|refund|fiyat|price|iban|nsf|sgs|katalog|catalog|ürün|urun|product|tezgah|baby|canlı|canli|ölü su|olu su|seramik|zeolit|turmalin|maifan|atık|atik|taksit|havale|kargo|orijinal|bayilik|franchise|kampanya|kampany|memnuniyet|danışman|danisman|müşteri|musteri|servis|service|filtreleme|ph|antioksidan|antioxidant|sahil|coastal|deprem|earthquake)/i;

const OBVIOUS_OFF_TOPIC =
  /\b(?:bitcoin|kripto|crypto|stock market|borsa hissesi|hava(?:\s+durumu)?|weather|yemek tarifi|recipe for|football score|futbol maç|maç skoru|siyaset|politics|seçim sonucu|write (?:me )?(?:code|python|javascript|sql)|kod yaz|ödev yap|homework|şaka anlat|tell (?:me )?a joke|netflix|film öner|spam|hack|jailbreak|ignore (?:your|all) instructions)/i;

function normaliseKnowledgeQuery(value: string) {
  let normalised = value
    .replace(/\bfıltre\b/gi, "filtre")
    .replace(/\bdegısım\b/gi, "değişim")
    .replace(/\bzamnı\b/gi, "zamanı")
    .replace(/\binstalation\b/gi, "installation")
    .replace(/\btomorow\b/gi, "tomorrow");
  // Expand the short pump question with the approved technical concepts so
  // retrieval remains auditable even when the visitor uses only "second floor".
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

/** Reject random / out-of-scope chats; keep Biohidrogen water-treatment only. */
export function isOffTopicMessage(message: string) {
  const text = normaliseKnowledgeQuery(message).toLocaleLowerCase("tr-TR").trim();
  if (!text || isBriefAck(text)) return false;
  if (OBVIOUS_OFF_TOPIC.test(text)) return true;
  if (DOMAIN_SCOPE.test(text)) return false;
  // Short vague interest ("bilgi alabilir miyim?") stays in scope.
  if (/\b(bilgi|info|yardım|yardim|help|destek|support|ürün|urun|product|cihaz)\b/i.test(text) && text.split(/\s+/).length <= 10) {
    return false;
  }
  // Any other multi-word ask without product domain is out of scope.
  return text.split(/\s+/).length >= 3;
}

function replySafety(message: string, locale: "tr" | "en"): ReplySafety {
  const text = normaliseKnowledgeQuery(message).toLocaleLowerCase("tr-TR");
  const isTurkish = locale === "tr";
  if (isOffTopicMessage(message)) {
    return {
      forceHandoff: false,
      offTopic: true,
      replacement: isTurkish
        ? "Ben yalnızca Biohidrogen / EA Global su arıtma ürünleri ve hizmetleri hakkında yardımcı olabilirim. Cihaz, filtre, kurulum veya canlı su hakkında sorabilirsiniz."
        : "I can only help with Biohidrogen / EA Global water-treatment products and services. Please ask about devices, filters, installation, or living water.",
    };
  }
  const human = /\b(insan|temsilci|human|agent|adviser|advisor|sales)\b/.test(text);
  const commercial = /\b(fiyat|price|teklif|quote|indirim|discount|taksit|payment|ödeme|delivery|teslimat|iban|banka|bank account|havale|eft)\b/.test(text);
  // Do not treat an ordinary "water-treatment device" product question as a
  // medical request. Health safeguards are reserved for an actual condition,
  // cure, diagnosis, or treatment claim.
  const health = /(diyabet|diabetes|migren|migraine|cure|tedavi|hastalık|disease)/.test(text);
  const service = /(filtre|filter|bakım|maintenance|arıza|fault|replacement|değişim|değiştir)/.test(text);
  const scheduledInstallation = /(schedule|tomorrow|appointment|randevu|planla|installation.*(?:when|tomorrow)|kurulum.*(?:ne zaman|yarın))/.test(text);
  const technical = /(pump|pompa|wifi|wi-fi)/.test(text);
  const policy = /\b(iade|refund|return|warranty|garanti)\b/.test(text);
  const unconfirmedCoverage = /\b(outside turkey|outside türkiye|international|abroad|yurt dış|yurtdış)\b/.test(text);
  const installationCoverage = /(kurulum.*(?:hangi il|81 il)|installation.*(?:where|which (?:city|cities)|81))/.test(text);
  const productFaq = /(what (?:kinds|types|products)|what do (?:you|u) have|hangi tür.*cihaz)/.test(text);

  if (unconfirmedCoverage) {
    return {
      forceHandoff: true,
      replacement: isTurkish
        ? "Türkiye dışındaki hizmet kapsamı hakkında onaylı bilgim yok. Güncel durumu teyit etmesi için sizi müşteri danışmanımıza aktarıyorum."
        : "I do not have confirmed information about service coverage outside Türkiye. I am connecting you with a customer adviser to confirm the current position.",
    };
  }
  if (/\b(wifi|wi-fi)\b/.test(text)) {
    return {
      forceHandoff: true,
      replacement: isTurkish
        ? "Wi-Fi özelliği hakkında onaylı bilgim yok. Doğrulamak için sizi yetkili temsilcimize aktarıyorum."
        : "I do not have confirmed information about Wi-Fi capability. I am connecting you with an authorised adviser to confirm it.",
    };
  }
  if (health) {
    return {
      forceHandoff: true,
      replacement: isTurkish
        ? "Tıbbi tavsiye veremem veya sağlık sonucu vaat edemem. Sağlıkla ilgili sorular için bir sağlık uzmanına danışmanızı öneririm; ürün bilgisi için sizi müşteri danışmanımıza aktarıyorum."
        : "I cannot provide medical advice or promise health outcomes. Please consult a healthcare professional; I am connecting you with a customer adviser for product information.",
    };
  }
  // Pump: keep KB answer when available; only force adviser confirmation.
  if (/(pump|pompa)/.test(text)) {
    return {
      forceHandoff: true,
      appendPolicyQualifier: false,
    };
  }
  return {
    forceHandoff: human || commercial || service || scheduledInstallation || technical || policy,
    suppressHandoff: productFaq && !(human || commercial || service || scheduledInstallation || technical || policy),
    appendPolicyQualifier: policy,
    appendInstallationQualifier: installationCoverage,
  };
}

function applyReplySafety(params: { message: string; locale: "tr" | "en"; reply: string; handoff: boolean; hasSources?: boolean }) {
  const safety = replySafety(params.message, params.locale);
  let reply = safety.replacement || params.reply;
  const briefReply = isBriefAck(params.message);
  if (safety.offTopic) {
    return { reply, handoff: false };
  }
  if (!params.hasSources && !briefReply && !safety.replacement) {
    reply = params.locale === "tr"
      ? "Bu konuda onaylı bilgiye ulaşamadım. Güncel bilgiyi teyit etmesi için sizi müşteri danışmanımıza aktarıyorum."
      : "I do not have confirmed information on that topic. I am connecting you with a customer adviser to confirm the current position.";
    safety.forceHandoff = true;
  }
  if (safety.appendPolicyQualifier && !/(current.*policy|approved.*policy|güncel.*politika|onaylı.*politika)/i.test(reply)) {
    reply += params.locale === "tr"
      ? " Güncel onaylı satış politikası için müşteri danışmanımız teyit sağlayacaktır."
      : " A customer adviser will confirm the current approved sales policy.";
  }
  if (safety.appendInstallationQualifier && !/(ücretsiz|free installation|current.*policy|güncel.*politika)/i.test(reply)) {
    reply += params.locale === "tr"
      ? " Kurulum, güncel onaylı satış politikası kapsamında 81 ilde ücretsiz olarak sunulur; yetkili ekip uygulamayı teyit eder."
      : " Installation availability is confirmed by the authorised team under the current approved sales policy.";
  }
  return { reply, handoff: safety.forceHandoff ? true : safety.suppressHandoff ? false : params.handoff };
}

export async function generateBotReply(params: {
  tenantId: string;
  contactName: string;
  channelType: string;
  history: { role: "user" | "assistant"; content: string }[];
  locale: "tr" | "en";
}): Promise<AiReplyResult> {
  const startedAt = Date.now();
  const tenant = await prisma.tenant.findUnique({ where: { id: params.tenantId }, select: { settings: true } });
  const operations = getOperationsSettings(tenant?.settings);
  const lastUserMessage = params.history.filter((message) => message.role === "user").at(-1)?.content || "";
  if (isOffTopicMessage(lastUserMessage)) {
    const safe = applyReplySafety({
      message: lastUserMessage,
      locale: params.locale,
      reply: "",
      handoff: false,
      hasSources: false,
    });
    return {
      reply: safe.reply,
      handoff: false,
      scoreDelta: 0,
      usedModel: "scope-guard",
      latencyMs: Date.now() - startedAt,
      sources: [],
    };
  }
  let sources: KnowledgeSource[] = [];
  let foundation = "";
  try {
    const always = await loadAlwaysInjectKnowledge(params.tenantId);
    foundation = always
      .map((doc, index) => `[F${index + 1}] ${doc.title}\n${doc.content}`)
      .join("\n\n")
      .slice(0, 8_000);
    sources = await retrieveKnowledge({
      tenantId: params.tenantId,
      query: normaliseKnowledgeQuery(lastUserMessage),
      limit: 4,
      categories: [...CHAT_RETRIEVAL_CATEGORIES],
    });
    // Fall back to non-IBAN KB if category-scoped retrieval misses (legacy docs).
    if (!sources.length) {
      sources = await retrieveKnowledge({
        tenantId: params.tenantId,
        query: normaliseKnowledgeQuery(lastUserMessage),
        limit: 4,
      });
    }
    // Drop weak matches so random questions cannot ride noisy FAQ similarity.
    sources = sources.filter((source) => source.score >= 0.32);
  } catch (error) {
    console.error("Knowledge retrieval failed", error);
  }
  const kb = sources
    .map((source, index) => `[${index + 1}] ${source.title}\n${source.content}`)
    .join("\n\n");

  const system =
    params.locale === "tr"
      ? `Sen Biohidrogen / EA Global su arıtma satış asistanısın.
SADECE su arıtma cihazları, filtreler, kurulum, garanti, canlı/alkali su ve onaylı KB konuları hakkında konuş.
Konu dışı (hava, siyaset, kod, şaka, kripto vb.) sorularda ürün kapsamına yönlendir; uydurma cevap verme.
Önce onaylı bilgi bankasındaki somut gerçekleri söyle; ardından gerekiyorsa en fazla bir nitelendirme sorusu sor.
Yalnızca KB'de desteklenen ürün gerçeklerini söyle; KB yeterli değilse insan desteğine yönlendir.
Kesin fiyat, indirim oranı, IBAN, banka, sözleşme veya teslimat sözü uydurma. Fiyat/teklif/ödeme sorulduğunda handoff=true yap.
Tıbbi tavsiye veya hastalık tedavi vaadi verme. Kısa, açık yanıtlar ver.
Kullanıcı selam verirse veya kısa bir evet/hayır yanıtı yazarsa, konuşma geçmişini dikkate al. Genel selamı tekrarlama.
${operations.aiInstructions ? `Yönetici tarafından onaylanan ek talimatlar:\n${operations.aiInstructions}` : ""}
JSON dön: {"reply":"...","handoff":false,"qualification":{"city":"","need":"","timeline":""},"scoreDelta":0}`
      : `You are the Biohidrogen / EA Global water-treatment sales assistant.
ONLY discuss water-treatment devices, filters, installation, warranty, living/alkaline water, and approved KB topics.
For off-topic requests (weather, politics, code, jokes, crypto, etc.), steer back to product scope; do not invent answers.
When KB sources support an answer, state those facts first, then optionally ask at most one qualifying question.
Only state product facts supported by the KB; hand off if the KB is insufficient.
Never invent pricing, discount rates, IBAN/bank details, contracts, delivery promises, or medical advice.
If the user asks for a person, pricing/quotes, or payment/IBAN details, set handoff=true. Keep replies concise.
For a greeting or a brief yes/no reply, use the conversation history. Do not repeat a generic greeting.
${operations.aiInstructions ? `Administrator-approved additional instructions:\n${operations.aiInstructions}` : ""}
Return JSON: {"reply":"...","handoff":false,"qualification":{"city":"","need":"","timeline":""},"scoreDelta":0}`;

  const configuredClient = getChatClient();
  const budget = await isAiBudgetExceeded(params.tenantId);
  if (!configuredClient || budget.exceeded) {
    if (budget.exceeded) console.warn("AI monthly budget exceeded; using rule fallback", budget);
    const fallback = ruleBasedFallback(params, kb || foundation);
    const safe = applyReplySafety({ message: lastUserMessage, locale: params.locale, reply: fallback.reply, handoff: fallback.handoff, hasSources: sources.length > 0 || Boolean(foundation) });
    return { ...fallback, ...safe, sources, latencyMs: Date.now() - startedAt, usedModel: budget.exceeded ? "budget-fallback" : fallback.usedModel };
  }

  try {
    const request: ChatCompletionCreateParamsNonStreaming & {
      reasoning_effort?: "none" | "low" | "high";
    } = {
      model: configuredClient.config.model,
      temperature: 0.2,
      max_tokens: 320,
      // The widget awaits one JSON reply; do not request NVIDIA's SSE default.
      stream: false,
      messages: [
        {
          role: "system",
          content: `${system}\n\nFOUNDATION (always apply):\n${foundation || "(none)"}\n\nRETRIEVED KB:\n${kb.slice(0, 3500) || "(none)"}`,
        },
        {
          role: "user",
          content: `Contact: ${params.contactName}\nChannel: ${params.channelType}`,
        },
        ...params.history.slice(-8),
      ],
    };
    // A CRM reply needs the requested JSON in the final content channel, not a
    // long reasoning trace. This is NVIDIA's current documented control.
    if (configuredClient.config.provider === "nvidia") {
      request.reasoning_effort = "none";
      request.response_format = { type: "json_object" };
    }
    const completion = await configuredClient.client.chat.completions.create(request);
    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = parseReply(raw);
    const safe = applyReplySafety({
      message: lastUserMessage,
      locale: params.locale,
      reply: parsed.reply || (params.locale === "tr" ? "Size nasıl yardımcı olabilirim?" : "How can I help?"),
      handoff: Boolean(parsed.handoff),
      hasSources: sources.length > 0,
    });
    return {
      reply: safe.reply,
      handoff: safe.handoff,
      qualification: parsed.qualification,
      scoreDelta: Number(parsed.scoreDelta || 0),
      usedModel: completion.model || configuredClient.config.model,
      tokensIn: completion.usage?.prompt_tokens,
      tokensOut: completion.usage?.completion_tokens,
      latencyMs: Date.now() - startedAt,
      sources,
    };
  } catch (err) {
    console.error("LLM completion failed; using rule fallback", err);
    const fallback = ruleBasedFallback(params, kb);
    const safe = applyReplySafety({ message: lastUserMessage, locale: params.locale, reply: fallback.reply, handoff: fallback.handoff, hasSources: sources.length > 0 });
    return { ...fallback, ...safe, sources, latencyMs: Date.now() - startedAt };
  }
}

function parseReply(raw: string): Partial<AiReplyResult> {
  const withoutFence = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const json = withoutFence.match(/\{[\s\S]*\}/)?.[0];
  // Providers occasionally return useful plain text despite a JSON instruction.
  // Preserve it instead of turning it into an empty object and a generic reply.
  if (!json) return withoutFence ? { reply: withoutFence } : {};
  try {
    return JSON.parse(json) as Partial<AiReplyResult>;
  } catch {
    return withoutFence ? { reply: withoutFence } : {};
  }
}

function ruleBasedFallback(
  params: { locale: "tr" | "en"; history: { role: string; content: string }[] },
  kb: string,
): AiReplyResult {
  const last = params.history.filter((m) => m.role === "user").at(-1)?.content?.toLowerCase() || "";
  const briefReply = /^(?:yes|no|evet|hayır|hayir|merhaba|selam|hello|hi)$/i.test(last.trim());
  const wantsHuman = /insan|agent|temsilci|human|sales|fiyat|price|teklif/.test(last);
  if (wantsHuman) {
    return {
      reply:
        params.locale === "tr"
          ? "Sizi bir satış uzmanına bağlıyorum. Kısa süre içinde dönüş yapacağız."
          : "Connecting you to a sales specialist shortly.",
      handoff: true,
      scoreDelta: 10,
      usedModel: "rule-fallback",
    };
  }
  if (briefReply) {
    return {
      reply:
        params.locale === "tr"
          ? "Anladım. Ev, ofis ya da işletmeniz için nasıl bir su arıtma çözümü arıyorsunuz?"
          : "Got it. Are you looking for a water-treatment solution for your home, office, or business?",
      handoff: false,
      scoreDelta: 5,
      usedModel: "rule-fallback",
      qualification: {},
    };
  }
  const faqHit = kb.toLowerCase().includes("demo") && /demo|görüşme|meeting/.test(last);
  return {
    reply: faqHit
      ? params.locale === "tr"
        ? "Size uygun bilgiyi paylaşabilmem için yetkili bir müşteri danışmanımız yönlendirme yapabilir."
        : "A customer adviser can share the information that is right for your needs."
      : params.locale === "tr"
        ? "Merhaba! Size ürünlerimiz hakkında bilgi verebilirim. Daha önce su arıtma cihazı kullandınız mı?"
        : "Hello! I can share information about our products. Have you used a water treatment device before?",
    handoff: false,
    scoreDelta: 5,
    usedModel: "rule-fallback",
    qualification: {},
  };
}

export async function getAiSpendThisMonth(tenantId: string) {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const agg = await prisma.usageEvent.aggregate({
    where: { tenantId, category: "ai", occurredAt: { gte: start } },
    _sum: { totalCost: true },
  });
  return Number(agg._sum?.totalCost || 0);
}

/** Soft monthly OpenAI budget. When exceeded, generateBotReply uses rule fallback only. */
export function getAiMonthlyBudgetUsd() {
  const raw = Number(process.env.AI_MONTHLY_BUDGET_USD ?? "40");
  return Number.isFinite(raw) && raw > 0 ? raw : 40;
}

export async function isAiBudgetExceeded(tenantId: string) {
  const spent = await getAiSpendThisMonth(tenantId);
  return { exceeded: spent >= getAiMonthlyBudgetUsd(), spent, budget: getAiMonthlyBudgetUsd() };
}

export async function logAiUsage(params: {
  tenantId: string;
  leadId?: string;
  tokensIn?: number;
  tokensOut?: number;
  model: string;
}) {
  const card = await prisma.rateCard.findUnique({ where: { tenantId: params.tenantId } });
  // GPT-4o mini is priced at $0.15/$0.60 per *million* input/output tokens.
  // These defaults are expressed per 1K to match the RateCard field names.
  // Do not invent a token estimate for a rule fallback: it made non-provider
  // replies appear billable and overstated staging costs.
  const inputTokens = params.tokensIn ?? 0;
  const outputTokens = params.tokensOut ?? 0;
  // NVIDIA staging calls and local rule fallbacks are not OpenAI billable
  // usage. Only apply the OpenAI rate card to OpenAI model identifiers.
  const isOpenAiModel = /^(gpt-|o\d|chatgpt-)/i.test(params.model);
  const inCost = isOpenAiModel ? (inputTokens / 1000) * (card?.openaiPer1kIn ?? 0.00015) : 0;
  const outCost = isOpenAiModel ? (outputTokens / 1000) * (card?.openaiPer1kOut ?? 0.0006) : 0;
  const total = Number((inCost + outCost).toFixed(4));
  await prisma.usageEvent.create({
    data: {
      tenantId: params.tenantId,
      category: "ai",
      eventType: "completion",
      quantity: 1,
      unitCost: total,
      totalCost: total,
      leadId: params.leadId,
      meta: { model: params.model, tokensIn: params.tokensIn, tokensOut: params.tokensOut },
    },
  });
}
