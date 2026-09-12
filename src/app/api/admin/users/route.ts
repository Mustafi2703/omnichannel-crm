import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { fromApiError } from "@/lib/api";

const createSchema = z.object({ email: z.string().email().max(254), name: z.string().trim().min(1).max(120), password: z.string().min(12).max(128), role: z.enum(["OWNER", "ADMIN", "AGENT"]).default("AGENT") });
export async function GET() { try { const session = await requireRole("OWNER", "ADMIN"); const users = await prisma.user.findMany({ where: { tenantId: session.tenantId }, select: { id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true, createdAt: true }, orderBy: { createdAt: "asc" } }); return NextResponse.json({ users }); } catch (error) { return fromApiError(error); } }
export async function POST(req: Request) { try { const session = await requireRole("OWNER", "ADMIN"); const input = createSchema.parse(await req.json()); if (session.role !== "OWNER" && input.role === "OWNER") return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only the owner can create another owner" } }, { status: 403 }); const user = await prisma.user.create({ data: { tenantId: session.tenantId, email: input.email.toLowerCase(), name: input.name, role: input.role, passwordHash: await hashPassword(input.password) }, select: { id: true, email: true, name: true, role: true, isActive: true } }); await audit({ tenantId: session.tenantId, actorUserId: session.id, action: "create", entityType: "user", entityId: user.id, after: { email: user.email, role: user.role } }); return NextResponse.json({ user }, { status: 201 }); } catch (error) { return fromApiError(error); } }
