import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { contactInputSchema, fromApiError, idSchema } from "@/lib/api";

type Context = { params: Promise<{ id: string }> };
export async function GET(req: Request, ctx: Context) {
  try { const session = await requireSession(); const id = idSchema.parse((await ctx.params).id); const contact = await prisma.contact.findFirst({ where: { id, tenantId: session.tenantId }, include: { identities: true, leads: { include: { stage: true } }, conversations: true, tasks: true, owner: { select: { id: true, name: true } } } }); if (!contact) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Contact not found" } }, { status: 404 }); if (new URL(req.url).searchParams.get("export") === "kvkk") { await audit({ tenantId: session.tenantId, actorUserId: session.id, action: "export", entityType: "contact", entityId: id }); return NextResponse.json({ export: contact }, { headers: { "Content-Disposition": `attachment; filename=contact-${id}.json` } }); } return NextResponse.json({ contact }); } catch (error) { return fromApiError(error); }
}
export async function PATCH(req: Request, ctx: Context) {
  try {
    const session = await requireSession();
    const id = idSchema.parse((await ctx.params).id);
    const input = contactInputSchema.partial().parse(await req.json());
    const before = await prisma.contact.findFirst({ where: { id, tenantId: session.tenantId } });
    if (!before) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Contact not found" } }, { status: 404 });

    const consentWithdrawn = input.consentWhatsappMarketing === false && before.consentWhatsappMarketing;
    const { contact, suppressedCount } = await prisma.$transaction(async (tx) => {
      const contact = await tx.contact.update({ where: { id }, data: input });
      const suppressed = consentWithdrawn
        ? await tx.campaignRecipient.updateMany({
            where: { tenantId: session.tenantId, contactId: id, status: { in: ["queued", "retry"] } },
            data: { status: "suppressed", error: "Marketing consent withdrawn" },
          })
        : { count: 0 };
      return { contact, suppressedCount: suppressed.count };
    });

    const consentChanged = input.consentWhatsappMarketing !== undefined
      && input.consentWhatsappMarketing !== before.consentWhatsappMarketing;
    await audit({
      tenantId: session.tenantId,
      actorUserId: session.id,
      action: consentChanged ? (input.consentWhatsappMarketing ? "marketing_consent_granted" : "marketing_consent_withdrawn") : "update",
      entityType: "contact",
      entityId: id,
      before: { displayName: before.displayName, consentWhatsappMarketing: before.consentWhatsappMarketing },
      after: { displayName: contact.displayName, consentWhatsappMarketing: contact.consentWhatsappMarketing, suppressedCampaignRecipients: suppressedCount },
    });
    return NextResponse.json({ contact, suppressedCampaignRecipients: suppressedCount });
  } catch (error) { return fromApiError(error); }
}
export async function DELETE(req: Request, ctx: Context) {
  try { const session = await requireSession(); const id = idSchema.parse((await ctx.params).id); const action = new URL(req.url).searchParams.get("action"); const contact = await prisma.contact.findFirst({ where: { id, tenantId: session.tenantId } }); if (!contact) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Contact not found" } }, { status: 404 }); if (action === "anonymize") { const value = `deleted-${id.slice(-8)}`; await prisma.$transaction([prisma.contactIdentity.deleteMany({ where: { contactId: id } }), prisma.contact.update({ where: { id }, data: { displayName: "Deleted contact", companyName: null, email: null, phone: null, city: null, gclid: null, landingUrl: null, utmSource: null, utmMedium: null, utmCampaign: null, metadata: { anonymizedAt: new Date().toISOString() } } })]); await audit({ tenantId: session.tenantId, actorUserId: session.id, action: "anonymize", entityType: "contact", entityId: id, before: { displayName: contact.displayName }, after: { reference: value } }); return NextResponse.json({ ok: true }); } await prisma.contact.delete({ where: { id } }); await audit({ tenantId: session.tenantId, actorUserId: session.id, action: "delete", entityType: "contact", entityId: id, before: { displayName: contact.displayName } }); return NextResponse.json({ ok: true }); } catch (error) { return fromApiError(error); }
}
