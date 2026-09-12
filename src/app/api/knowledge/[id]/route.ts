import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ingestKnowledgeDocument } from "@/lib/knowledge";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: Context) {
  try {
    const session = await requireRole("OWNER", "ADMIN");
    const { id } = await context.params;
    const body = await req.json();
    if (body.action !== "reindex") return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    const document = await prisma.knowledgeDocument.updateMany({
      where: { id, tenantId: session.tenantId },
      data: { status: "processing", errorMessage: null },
    });
    if (!document.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
    after(async () => {
      try {
        await ingestKnowledgeDocument(id, session.tenantId);
      } catch (error) {
        console.error("Knowledge re-index failed", error);
      }
    });
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message === "FORBIDDEN" ? "Forbidden" : "Unauthorized" }, { status: message === "FORBIDDEN" ? 403 : 401 });
  }
}

export async function DELETE(_req: Request, context: Context) {
  try {
    const session = await requireRole("OWNER", "ADMIN");
    const { id } = await context.params;
    const document = await prisma.knowledgeDocument.deleteMany({ where: { id, tenantId: session.tenantId } });
    if (!document.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message === "FORBIDDEN" ? "Forbidden" : "Unauthorized" }, { status: message === "FORBIDDEN" ? 403 : 401 });
  }
}
