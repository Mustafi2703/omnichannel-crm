import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { fromApiError, idSchema } from "@/lib/api";

const maxBytes = 10 * 1024 * 1024;
const allowed = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf", "text/plain"]);
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) { try { const session = await requireSession(); const id = idSchema.parse((await ctx.params).id); const conversation = await prisma.conversation.findFirst({ where: { id, tenantId: session.tenantId } }); if (!conversation) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Conversation not found" } }, { status: 404 }); const form = await req.formData(); const file = form.get("file"); if (!(file instanceof File) || !allowed.has(file.type) || file.size > maxBytes) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Use a PDF, text, JPEG, PNG, or WebP file up to 10 MB" } }, { status: 400 }); const extension = path.extname(file.name).replace(/[^.a-z0-9]/gi, "").slice(0, 12); const storageKey = `${session.tenantId}/${crypto.randomUUID()}${extension}`; const destination = path.join(process.cwd(), "public", "uploads", storageKey); await mkdir(path.dirname(destination), { recursive: true }); await writeFile(destination, Buffer.from(await file.arrayBuffer())); const attachment = await prisma.attachment.create({ data: { tenantId: session.tenantId, conversationId: id, filename: file.name.slice(0, 255), contentType: file.type, sizeBytes: file.size, storageKey } }); return NextResponse.json({ attachment }, { status: 201 }); } catch (error) { return fromApiError(error); } }
