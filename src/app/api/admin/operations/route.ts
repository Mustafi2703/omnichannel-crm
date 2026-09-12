import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fromApiError } from "@/lib/api";
import { getOperationsSettings, mergeOperationsSettings, operationsInputSchema } from "@/lib/tenant-settings";
import { audit } from "@/lib/audit";

export async function GET() {
  try {
    const session = await requireRole("OWNER", "ADMIN");
    const [tenant, users] = await Promise.all([
      prisma.tenant.findUniqueOrThrow({ where: { id: session.tenantId }, select: { settings: true } }),
      prisma.user.findMany({
        where: { tenantId: session.tenantId, isActive: true },
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: "asc" },
      }),
    ]);
    return NextResponse.json({ operations: getOperationsSettings(tenant.settings), users });
  } catch (error) {
    return fromApiError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireRole("OWNER", "ADMIN");
    const operations = operationsInputSchema.parse(await req.json());
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: session.tenantId }, select: { settings: true } });
    const managers = operations.sla.managerUserIds.length
      ? await prisma.user.count({ where: { tenantId: session.tenantId, isActive: true, id: { in: operations.sla.managerUserIds } } })
      : 0;
    if (managers !== operations.sla.managerUserIds.length) {
      return NextResponse.json({ error: { code: "INVALID_MANAGER", message: "Every selected SLA manager must be an active workspace user." } }, { status: 400 });
    }
    await prisma.tenant.update({
      where: { id: session.tenantId },
      data: { settings: mergeOperationsSettings(tenant.settings, operations) },
    });
    await audit({
      tenantId: session.tenantId,
      actorUserId: session.id,
      action: "operations_settings_updated",
      entityType: "tenant",
      entityId: session.tenantId,
      after: { sla: operations.sla, hasAiInstructions: Boolean(operations.aiInstructions) },
    });
    return NextResponse.json({ operations });
  } catch (error) {
    return fromApiError(error);
  }
}
