import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fromApiError, idSchema } from "@/lib/api";
import { audit } from "@/lib/audit";

const input = z.object({ name: z.string().trim().min(1).max(160), templateId: idSchema, scheduledAt: z.coerce.date().nullable().optional(), contactIds: z.array(idSchema).min(1).max(500) });

function totals(statuses: { status: string }[]) {
  return statuses.reduce<Record<string, number>>((result, recipient) => {
    result[recipient.status] = (result[recipient.status] || 0) + 1;
    return result;
  }, {});
}

export async function GET() {
  try {
    const session = await requireRole("OWNER", "ADMIN");
    const campaigns = await prisma.campaign.findMany({
      where: { tenantId: session.tenantId },
      include: { template: true, _count: { select: { recipients: true } }, recipients: { select: { status: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ campaigns: campaigns.map(({ recipients, ...campaign }) => ({ ...campaign, recipientTotals: totals(recipients) })) });
  } catch (error) { return fromApiError(error); }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole("OWNER", "ADMIN");
    const data = input.parse(await req.json());
    const template = await prisma.whatsappTemplate.findFirst({ where: { id: data.templateId, tenantId: session.tenantId, status: "approved" } });
    if (!template) return NextResponse.json({ error: { code: "TEMPLATE_NOT_APPROVED", message: "Choose an approved template" } }, { status: 400 });
    if (Array.isArray(template.variables) && template.variables.length) return NextResponse.json({ error: { code: "VARIABLE_MAPPING_REQUIRED", message: "This template has variables. Configure a provider-approved mapping before creating a campaign." } }, { status: 400 });
    const contacts = await prisma.contact.findMany({ where: { tenantId: session.tenantId, id: { in: data.contactIds }, consentWhatsappMarketing: true, automationPausedAt: null }, select: { id: true } });
    if (!contacts.length) return NextResponse.json({ error: { code: "NO_ELIGIBLE_CONTACTS", message: "No selected contacts have active WhatsApp marketing consent." } }, { status: 400 });
    const campaign = await prisma.campaign.create({
      data: { tenantId: session.tenantId, name: data.name, templateId: template.id, status: data.scheduledAt ? "scheduled" : "draft", scheduledAt: data.scheduledAt, createdById: session.id, recipients: { create: contacts.map((contact) => ({ tenantId: session.tenantId, contactId: contact.id })) } },
      include: { _count: { select: { recipients: true } } },
    });
    await audit({ tenantId: session.tenantId, actorUserId: session.id, action: "create", entityType: "campaign", entityId: campaign.id, after: { name: campaign.name, templateId: campaign.templateId, recipientCount: contacts.length, scheduledAt: campaign.scheduledAt?.toISOString() || null } });
    return NextResponse.json({ campaign, eligibleContacts: contacts.length }, { status: 201 });
  } catch (error) { return fromApiError(error); }
}
