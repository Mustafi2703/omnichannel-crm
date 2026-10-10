import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { requireJwtSecretBytes } from "./jwt-secret";
import type { Role } from "@prisma/client";

const COOKIE = "omni_session";

export function secret() {
  return requireJwtSecretBytes();
}

export type SessionUser = {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: Role;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({
    sub: user.id,
    tenantId: user.tenantId,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

async function readSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const session: SessionUser = {
      id: String(payload.sub),
      tenantId: String(payload.tenantId),
      email: String(payload.email),
      name: String(payload.name),
      role: payload.role as Role,
    };
    return { session, iat: typeof payload.iat === "number" ? payload.iat : 0 };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const read = await readSession();
  return read?.session ?? null;
}

export async function getSessionIssuedAtMs(): Promise<number | null> {
  const read = await readSession();
  return read ? read.iat * 1000 : null;
}

export async function requireSession(options?: { allowPasswordChange?: boolean }) {
  const read = await readSession();
  if (!read) throw new Error("UNAUTHORIZED");
  const user = await prisma.user.findFirst({
    where: { id: read.session.id, tenantId: read.session.tenantId, isActive: true },
    select: { mustChangePassword: true, passwordChangedAt: true },
  });
  if (!user) throw new Error("UNAUTHORIZED");
  if (user.passwordChangedAt && read.iat * 1000 + 2000 < user.passwordChangedAt.getTime()) {
    throw new Error("UNAUTHORIZED");
  }
  if (user.mustChangePassword && !options?.allowPasswordChange) {
    throw new Error("PASSWORD_CHANGE_REQUIRED");
  }
  return read.session;
}

export async function requireRole(...roles: Role[]) {
  const session = await requireSession();
  if (!roles.includes(session.role)) throw new Error("FORBIDDEN");
  return session;
}
