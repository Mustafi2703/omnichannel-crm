import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  verifyPassword,
  getSession,
} from "@/lib/auth";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limit = await rateLimit(`login:${clientIp(req)}`, 10);
  if (!limit.ok) return apiError(429, "RATE_LIMITED", "Too many login attempts");
  // Trim before validating so a harmless paste-space cannot turn a valid
  // address into a failed login attempt.
  const parsed = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128) }).safeParse(await req.json());
  if (!parsed.success) return apiError(400, "VALIDATION_ERROR", "Email and password are required");
  const email = parsed.data.email.toLowerCase().trim();
  const password = parsed.data.password;
  const user = await prisma.user.findFirst({
    where: { email, isActive: true },
  });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  const token = await createSessionToken({
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  await setSessionCookie(token);
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: session });
}
