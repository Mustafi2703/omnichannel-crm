import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { fromApiError, idSchema } from "@/lib/api";

type Context = { params: Promise<{ id: string }> };
const actionSchema = z.object({ action: z.enum(["schedule", "start", "pause", "resume", "cancel"]), scheduledAt: z.coerce.date().optional() });

export async function PATCH(req: Request, ctx: Context) {
  try {
    const session = await requireRole("OWNER", "ADMIN");
    const id = idSchema.parse((await ctx.params).id);
    const input = actionSchema.parse(await req.json());
    const campaign = await prisma.campaign.findFirst({ where: { id, tenantId: session.tenantId }, select: { id: true, status: true, name: true, scheduledAt: true } });
    if (!campaign) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Campaign not found" } }, { status: 404 });
    if (campaign.status === "completed" || campaign.status === "cancelled") return NextResponse.json({ error: { code: "INVALID_STATE", message: "Completed or cancelled campaigns cannot be changed" } }, { status: 409 });

    const now = new Date();
    let update: { status: string; scheduledAt?: Date; startedAt?: Date | null; completedAt?: Date | null };
    if (input.action === "schedule") {
      if (!input.scheduledAt) return NextResponse.json({ error: { code: "SCHEDULE_REQUIRED", message: "scheduledAt is required to schedule a campaign" } }, { status: 400 });
      if (input.scheduledAt <= now) return NextResponse.json({ error: { code: "INVALID_SCHEDULE", message: "scheduledAt must be in the future" } }, { status: 400 });
      update = { status: "scheduled", scheduledAt: input.scheduledAt, startedAt: null, completedAt: null };
    } else if (input.action === "start") {
      update = { status: "scheduled", scheduledAt: now, startedAt: null, completedAt: null };
    } else if (input.action === "pause") {
      if (!(["scheduled", "running"] as string[]).includes(campaign.status)) return NextResponse.json({ error: { code: "INVALID_STATE", message: "Only scheduled or running campaigns can be paused" } }, { status: 409 });
      update = { status: "paused" };
    } else if (input.action === "resume") {
      if (campaign.status !== "paused") return NextResponse.json({ error: { code: "INVALID_STATE", message: "Only paused campaigns can be resumed" } }, { status: 409 });
      update = { status: "scheduled", scheduledAt: input.scheduledAt || now };
    } else {
      if (!(["scheduled", "running", "paused", "draft"] as string[]).includes(campaign.status)) return NextResponse.json({ error: { code: "INVALID_STATE", message: "This campaign cannot be cancelled" } }, { status: 409 });
      const [updated] = await prisma.$transaction([
        prisma.campaign.update({ where: { id }, data: { status: "cancelled", completedAt: now } }),
        prisma.campaignRecipient.updateMany({ where: { campaignId: id, status: { in: ["queued", "retry"] } }, data: { status: "cancelled", nextAttemptAt: null, error: "Campaign cancelled" } }),
      ]);
      await audit({ tenantId: session.tenantId, actorUserId: session.id, action: "campaign_cancelled", entityType: "campaign", entityId: id, before: { status: campaign.status }, after: { status: "cancelled" } });
      return NextResponse.json({ campaign: updated });
    }

    const updated = await prisma.campaign.update({ where: { id }, data: update });
    await audit({ tenantId: session.tenantId, actorUserId: session.id, action: `campaign_${input.action}`, entityType: "campaign", entityId: id, before: { status: campaign.status, scheduledAt: campaign.scheduledAt?.toISOString() || null }, after: { status: updated.status, scheduledAt: updated.scheduledAt?.toISOString() || null } });
    return NextResponse.json({ campaign: updated });
  } catch (error) { return fromApiError(error); }
}
