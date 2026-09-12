import { prisma } from "./prisma";
import { notify } from "./notifications";

export async function runAutomations(tenantId: string, trigger: string, context: { conversationId?: string; contactId?: string; leadId?: string; assigneeId?: string }) {
  if (context.contactId) {
    const contact = await prisma.contact.findFirst({ where: { id: context.contactId, tenantId }, select: { automationPausedAt: true } });
    if (contact?.automationPausedAt) return;
  }
  const rules = await prisma.automationRule.findMany({ where: { tenantId, trigger, isActive: true } });
  for (const rule of rules) {
    try {
      const config = rule.config as { userId?: string; tag?: string };
      if (rule.action === "assign_user" && context.conversationId && config.userId) await prisma.conversation.updateMany({ where: { id: context.conversationId, tenantId }, data: { assigneeId: config.userId } });
      if (rule.action === "add_tag" && context.leadId && config.tag) { const lead = await prisma.lead.findFirst({ where: { id: context.leadId, tenantId } }); if (lead && !lead.tags.includes(config.tag)) await prisma.lead.update({ where: { id: lead.id }, data: { tags: [...lead.tags, config.tag] } }); }
      if (rule.action === "notify" && (config.userId || context.assigneeId)) await notify({ tenantId, userId: config.userId || context.assigneeId, type: "automation", title: rule.name, body: "Automation completed" });
      await prisma.automationRun.create({ data: { tenantId, ruleId: rule.id, status: "completed", detail: context } });
    } catch (error) { await prisma.automationRun.create({ data: { tenantId, ruleId: rule.id, status: "failed", detail: { ...context, error: error instanceof Error ? error.message : "Unknown error" } } }); }
  }
}
