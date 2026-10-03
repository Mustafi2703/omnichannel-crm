import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireSession();
    const tenantId = session.tenantId;
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      openConvos,
      overdueTasks,
      leadsWeek,
      stages,
      todayUsage,
      wonLeads,
      newLeadsToday,
    ] = await Promise.all([
      prisma.conversation.count({ where: { tenantId, status: { in: ["open", "pending"] } } }),
      prisma.task.count({
        where: { tenantId, status: "open", dueAt: { lt: new Date() } },
      }),
      prisma.lead.count({ where: { tenantId, createdAt: { gte: weekAgo } } }),
      prisma.pipelineStage.findMany({
        where: { tenantId },
        orderBy: { position: "asc" },
        include: { _count: { select: { leads: true } } },
      }),
      prisma.usageEvent.aggregate({
        where: { tenantId, occurredAt: { gte: startOfDay } },
        _sum: { totalCost: true },
      }),
      prisma.lead.findMany({
        where: { tenantId, stage: { isWon: true }, wonAmount: { not: null } },
        select: { wonAmount: true, attributedCost: true },
      }),
      prisma.lead.count({ where: { tenantId, createdAt: { gte: startOfDay } } }),
    ]);

    const todayCost = todayUsage._sum.totalCost || 0;
    const wonRevenue = wonLeads.reduce((s, l) => s + (l.wonAmount || 0), 0);
    const wonCost = wonLeads.reduce((s, l) => s + (l.attributedCost || 0), 0);
    const cpl = newLeadsToday > 0 ? todayCost / newLeadsToday : todayCost;

    return NextResponse.json({
      openConvos,
      overdueTasks,
      leadsWeek,
      todayCost,
      costPerLead: cpl,
      margin: wonRevenue - wonCost,
      wonRevenue,
      pipeline: stages.map((s) => ({
        key: s.key,
        name: s.name,
        nameTr: s.nameTr,
        count: s._count.leads,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
