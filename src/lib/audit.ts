import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

export async function audit(params: {
  tenantId: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: object;
  after?: object;
}) {
  await prisma.auditLog.create({
    data: {
      ...params,
      before: params.before as Prisma.InputJsonValue | undefined,
      after: params.after as Prisma.InputJsonValue | undefined,
    },
  });
}
