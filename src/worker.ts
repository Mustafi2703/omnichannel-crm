import { Worker } from "bullmq";
import { Role } from "@prisma/client";
import { prisma } from "./lib/prisma";
import { notify } from "./lib/notifications";
import { runAutomations } from "./lib/automation";
import { enqueueAutomation } from "./lib/queue";
import { appBaseUrl, inboxUrl } from "./lib/app-url";
import { businessOpenedAt, getOperationsSettings, type OperationsSettings } from "./lib/tenant-settings";
import { processDueCampaigns } from "./lib/campaigns";

type SlaConversation = { id: string; tenantId: string; contactId: string; assigneeId: string | null; assignedAt: Date | null; unassignedAt: Date | null; tenant: { settings: unknown; timezone: string } };

async function managerIds(tenantId: string, settings: OperationsSettings) {
  const where = settings.sla.managerUserIds.length
    ? { tenantId, isActive: true, id: { in: settings.sla.managerUserIds } }
    : { tenantId, isActive: true, role: { in: [Role.OWNER, Role.ADMIN] } };
  const users = await prisma.user.findMany({ where, select: { id: true } });
  return users.map((user) => user.id);
}

async function notifyTenantManagers(tenantId: string, tenantSettings: unknown, type: string, title: string, body: string) {
  const recipients = await managerIds(tenantId, getOperationsSettings(tenantSettings));
  await Promise.all(recipients.map((userId) => notify({ tenantId, userId, type, title, body })));
}

async function notifyManagers(params: { conversation: SlaConversation; title: string; body: string; type: string }) {
  const contact = await prisma.contact.findFirst({
    where: { id: params.conversation.contactId },
    select: { displayName: true },
  });
  const body = `${params.body} Contact: ${contact?.displayName || "Unknown"}. Open: ${inboxUrl(params.conversation.id)}`;
  await notifyTenantManagers(params.conversation.tenantId, params.conversation.tenant.settings, params.type, params.title, body);
}

async function escalateUnassigned(now: Date) {
  const conversations = await prisma.conversation.findMany({
    where: { status: { not: "closed" }, assigneeId: null, unassignedAt: { not: null }, unassignedEscalatedAt: null },
    select: { id: true, tenantId: true, contactId: true, assigneeId: true, assignedAt: true, unassignedAt: true, tenant: { select: { settings: true, timezone: true } } },
  });
  // Hand-offs left waiting while closed are reported once, as a count, in the first scan after opening.
  const waitingSinceClosed = new Map<string, { tenantSettings: unknown; count: number }>();
  for (const conversation of conversations) {
    const settings = getOperationsSettings(conversation.tenant.settings);
    const openedAt = businessOpenedAt(now, settings.businessHours, conversation.tenant.timezone);
    if (!openedAt || !conversation.unassignedAt) continue;
    const sinceClosed = conversation.unassignedAt < openedAt;
    if (!sinceClosed && now.getTime() - conversation.unassignedAt.getTime() < settings.sla.unassignedAfterMinutes * 60_000) continue;
    const updated = await prisma.conversation.updateMany({ where: { id: conversation.id, unassignedEscalatedAt: null }, data: { unassignedEscalatedAt: now } });
    if (!updated.count) continue;
    if (sinceClosed) {
      const entry = waitingSinceClosed.get(conversation.tenantId) || { tenantSettings: conversation.tenant.settings, count: 0 };
      entry.count += 1;
      waitingSinceClosed.set(conversation.tenantId, entry);
      continue;
    }
    await notifyManagers({ conversation, type: "sla_unassigned", title: "SLA: assignment required", body: `Conversation ${conversation.id} has been unassigned for ${settings.sla.unassignedAfterMinutes} minutes.` });
  }
  for (const [tenantId, { tenantSettings, count }] of waitingSinceClosed) {
    await notifyTenantManagers(tenantId, tenantSettings, "sla_waiting_digest", `SLA: ${count} yeni müşteri atanmayı bekliyor`, `${count} yeni müşteri atanmayı bekliyor. / ${count} new customer(s) waiting to be assigned. Open: ${appBaseUrl()}/inbox`);
  }
}

async function escalateNoCall(now: Date, kind: "first" | "threeHour") {
  const conversations = await prisma.conversation.findMany({
    where: { status: { not: "closed" }, assigneeId: { not: null }, assignedAt: { not: null }, lastCallAt: null, ...(kind === "first" ? { firstCallEscalatedAt: null } : { threeHourEscalatedAt: null }) },
    select: { id: true, tenantId: true, contactId: true, assigneeId: true, assignedAt: true, unassignedAt: true, tenant: { select: { settings: true, timezone: true } } },
  });
  for (const conversation of conversations) {
    const settings = getOperationsSettings(conversation.tenant.settings);
    // Closed: hold the reminder; anything that came due overnight fires at opening.
    if (!businessOpenedAt(now, settings.businessHours, conversation.tenant.timezone)) continue;
    const minutes = kind === "first" ? settings.sla.firstCallAfterMinutes : settings.sla.noCallAfterMinutes;
    if (!conversation.assignedAt || now.getTime() - conversation.assignedAt.getTime() < minutes * 60_000) continue;
    const updated = await prisma.conversation.updateMany({ where: { id: conversation.id, ...(kind === "first" ? { firstCallEscalatedAt: null } : { threeHourEscalatedAt: null }) }, data: kind === "first" ? { firstCallEscalatedAt: now } : { threeHourEscalatedAt: now } });
    if (updated.count) await notifyManagers({ conversation, type: kind === "first" ? "sla_first_call" : "sla_no_call", title: kind === "first" ? "SLA: first call overdue" : "SLA: call overdue", body: `Conversation ${conversation.id} has not had a logged call within ${minutes} minutes of assignment.` });
  }
}

async function scan() {
  const now = new Date();
  const due = await prisma.task.findMany({ where: { status: "open", dueAt: { lte: now }, assigneeId: { not: null }, dueNotifiedAt: null }, select: { id: true, tenantId: true, title: true, assigneeId: true, contactId: true } });
  for (const task of due) {
    const claimed = await prisma.task.updateMany({
      where: { id: task.id, status: "open", dueNotifiedAt: null },
      data: { dueNotifiedAt: now },
    });
    if (!claimed.count) continue;
    if (task.assigneeId) await notify({ tenantId: task.tenantId, userId: task.assigneeId, type: "task_due", title: "Follow-up due", body: task.title });
    await runAutomations(task.tenantId, "task_overdue", { assigneeId: task.assigneeId || undefined, contactId: task.contactId || undefined });
  }
  await Promise.all([escalateUnassigned(now), escalateNoCall(now, "first"), escalateNoCall(now, "threeHour"), processDueCampaigns()]);
}

const connection = process.env.REDIS_URL ? { url: process.env.REDIS_URL } : undefined;
if (!connection) throw new Error("REDIS_URL is required for the worker");
new Worker("automation", async (job) => {
  if (job.name !== "sla_scan") throw new Error(`Unsupported automation job: ${job.name}`);
  await scan();
}, { connection });

function scheduleScan() { void enqueueAutomation("sla_scan", {}).catch((error) => console.error("Unable to enqueue SLA scan", error)); }
scheduleScan();
setInterval(scheduleScan, 60 * 1000);
