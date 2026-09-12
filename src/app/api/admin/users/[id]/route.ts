import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { fromApiError, idSchema } from "@/lib/api";
type Context = { params: Promise<{ id: string }> };
const updateSchema = z.object({ name: z.string().trim().min(1).max(120).optional(), role: z.enum(["OWNER", "ADMIN", "AGENT"]).optional(), isActive: z.boolean().optional() });
export async function PATCH(req: Request, ctx: Context) { try { const session = await requireRole("OWNER", "ADMIN"); const id = idSchema.parse((await ctx.params).id); const input = updateSchema.parse(await req.json()); const user = await prisma.user.findFirst({ where: { id, tenantId: session.tenantId } }); if (!user) return NextResponse.json({ error: { code: "NOT_FOUND", message: "User not found" } }, { status: 404 }); if (id === session.id && input.isActive === false) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "You cannot deactivate yourself" } }, { status: 400 }); if (session.role !== "OWNER" && (input.role === "OWNER" || user.role === "OWNER")) return NextResponse.json({ error: { code: "FORBIDDEN", message: "Only the owner can manage owners" } }, { status: 403 }); const updated = await prisma.user.update({ where: { id }, data: input, select: { id: true, email: true, name: true, role: true, isActive: true } }); await audit({ tenantId: session.tenantId, actorUserId: session.id, action: "update", entityType: "user", entityId: id, before: { role: user.role, isActive: user.isActive }, after: { role: updated.role, isActive: updated.isActive } }); return NextResponse.json({ user: updated }); } catch (error) { return fromApiError(error); } }
