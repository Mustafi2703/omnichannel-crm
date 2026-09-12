import { prisma } from "./prisma";
import { isAisensyTemplateDeliveryConfigured, logWhatsappUsage, sendAisensyTemplate } from "./aisensy";

const BATCH_SIZE = 25;
const MAX_ATTEMPTS = 3;

type CampaignRecipientForDelivery = {
  id: string;
  tenantId: string;
  campaignId: string;
  attempts: number;
  contact: { phone: string | null; consentWhatsappMarketing: boolean; automationPausedAt: Date | null };
  campaign: { template: { name: string; language: string; providerTemplateId: string | null; variables: unknown; status: string } };
};

function hasTemplateVariables(value: unknown) {
  return Array.isArray(value) && value.length > 0;
}

async function finishCampaignIfDrained(campaignId: string) {
  const outstanding = await prisma.campaignRecipient.count({
    where: { campaignId, status: { in: ["queued", "retry", "sending"] } },
  });
  if (!outstanding) {
    await prisma.campaign.updateMany({
      where: { id: campaignId, status: { in: ["scheduled", "running"] } },
      data: { status: "completed", completedAt: new Date() },
    });
  }
}

async function deliverRecipient(recipient: CampaignRecipientForDelivery, now: Date) {
  if (!recipient.contact.consentWhatsappMarketing || recipient.contact.automationPausedAt) {
    await prisma.campaignRecipient.update({ where: { id: recipient.id }, data: { status: "suppressed", error: "Marketing consent unavailable", sendingAt: null } });
    return;
  }
  if (!recipient.contact.phone) {
    await prisma.campaignRecipient.update({ where: { id: recipient.id }, data: { status: "failed", error: "Contact has no WhatsApp phone number", sendingAt: null } });
    return;
  }
  if (recipient.campaign.template.status !== "approved") {
    await prisma.campaignRecipient.update({ where: { id: recipient.id }, data: { status: "suppressed", error: "Campaign template is no longer approved", sendingAt: null } });
    return;
  }
  if (hasTemplateVariables(recipient.campaign.template.variables)) {
    await prisma.campaignRecipient.update({ where: { id: recipient.id }, data: { status: "failed", error: "Template variables require a provider-approved mapping", sendingAt: null } });
    return;
  }
  if (!isAisensyTemplateDeliveryConfigured()) {
    await prisma.campaignRecipient.update({ where: { id: recipient.id }, data: { status: "failed", error: "AiSensy template delivery is not configured", sendingAt: null } });
    return;
  }

  const sent = await sendAisensyTemplate({
    to: recipient.contact.phone,
    name: recipient.campaign.template.name,
    language: recipient.campaign.template.language,
    providerTemplateId: recipient.campaign.template.providerTemplateId,
  });
  if (sent.ok) {
    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: { status: "sent", externalMessageId: sent.externalMessageId, sentAt: now, error: null, sendingAt: null, nextAttemptAt: null },
    });
    await logWhatsappUsage(recipient.tenantId, 1, { eventType: "campaign_outbound", meta: { campaignId: recipient.campaignId } });
    return;
  }

  const nextAttempts = recipient.attempts + 1;
  const retryable = nextAttempts < MAX_ATTEMPTS;
  await prisma.campaignRecipient.update({
    where: { id: recipient.id },
    data: {
      status: retryable ? "retry" : "failed",
      error: (sent.error || "WhatsApp campaign delivery failed").slice(0, 500),
      sendingAt: null,
      nextAttemptAt: retryable ? new Date(now.getTime() + 2 ** nextAttempts * 60_000) : null,
    },
  });
}

export async function processDueCampaigns() {
  const now = new Date();
  await prisma.campaignRecipient.updateMany({
    where: { status: "sending", sendingAt: { lte: new Date(now.getTime() - 10 * 60_000) } },
    data: { status: "retry", sendingAt: null, nextAttemptAt: now, error: "Delivery worker restarted before completion" },
  });
  const due = await prisma.campaign.findMany({
    where: { status: { in: ["scheduled", "running"] }, OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }] },
    select: { id: true, status: true },
    take: 20,
    orderBy: { scheduledAt: "asc" },
  });

  for (const campaign of due) {
    if (campaign.status === "scheduled") {
      await prisma.campaign.updateMany({ where: { id: campaign.id, status: "scheduled" }, data: { status: "running", startedAt: now } });
    }
    const candidates = await prisma.campaignRecipient.findMany({
      where: { campaignId: campaign.id, OR: [{ status: "queued" }, { status: "retry", nextAttemptAt: { lte: now } }] },
      include: { contact: { select: { phone: true, consentWhatsappMarketing: true, automationPausedAt: true } }, campaign: { include: { template: { select: { name: true, language: true, providerTemplateId: true, variables: true, status: true } } } } },
      take: BATCH_SIZE,
      orderBy: { createdAt: "asc" },
    });
    for (const recipient of candidates) {
      const claimed = await prisma.campaignRecipient.updateMany({
        where: { id: recipient.id, status: { in: ["queued", "retry"] } },
        data: { status: "sending", sendingAt: now, attempts: { increment: 1 } },
      });
      if (!claimed.count) continue;
      await deliverRecipient(recipient, now);
    }
    await finishCampaignIfDrained(campaign.id);
  }
}
