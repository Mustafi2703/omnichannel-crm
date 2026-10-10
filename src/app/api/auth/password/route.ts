import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError, fromApiError } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createSessionToken, hashPassword, requireSession, setSessionCookie, verifyPassword } from "@/lib/auth";

const bodySchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12).max(128),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession({ allowPasswordChange: true });
    const limit = await rateLimit(`password:${session.id}:${clientIp(req)}`, 8);
    if (!limit.ok) return apiError(429, "RATE_LIMITED", "Too many password attempts");
    let bodyJson: unknown;
    try {
      bodyJson = await req.json();
    } catch {
      return apiError(400, "VALIDATION_ERROR", "Invalid JSON body");
    }
    const parsed = bodySchema.safeParse(bodyJson);
    if (!parsed.success) return apiError(400, "VALIDATION_ERROR", "New password must be at least 12 characters");
    if (parsed.data.currentPassword === parsed.data.newPassword) {
      return apiError(400, "PASSWORD_REUSED", "Choose a password that is different from the current one");
    }
    const user = await prisma.user.findFirst({
      where: { id: session.id, tenantId: session.tenantId, isActive: true },
    });
    if (!user || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
      return apiError(403, "INVALID_PASSWORD", "Current password is incorrect");
    }
    const passwordChangedAt = new Date();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(parsed.data.newPassword),
        mustChangePassword: false,
        passwordChangedAt,
      },
    });
    const token = await createSessionToken({
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    await setSessionCookie(token);
    await audit({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: "password_change",
      entityType: "user",
      entityId: user.id,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return fromApiError(error);
  }
}
