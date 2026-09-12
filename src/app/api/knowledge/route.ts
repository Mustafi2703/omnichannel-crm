import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/auth";
import { canManageKnowledge, cleanKnowledgeText, extractKnowledgeText, ingestKnowledgeDocument } from "@/lib/knowledge";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await requireSession();
    const docs = await prisma.knowledgeDocument.findMany({
      where: { tenantId: session.tenantId },
      include: { embeddingIndex: { select: { provider: true, model: true, dimensions: true, version: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ docs, canManage: canManageKnowledge(session.role) });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole("OWNER", "ADMIN");
    const contentType = req.headers.get("content-type") || "";
    let title = "";
    let content = "";
    let sourceFilename: string | undefined;
    let mimeType: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      title = String(form.get("title") || "").trim();
      if (!(file instanceof File)) return NextResponse.json({ error: "A file is required" }, { status: 400 });
      content = cleanKnowledgeText(await extractKnowledgeText(file));
      sourceFilename = file.name;
      mimeType = file.type || undefined;
      if (!title) title = file.name.replace(/\.[^.]+$/, "");
    } else {
      const body = await req.json();
      title = String(body.title || "").trim();
      content = cleanKnowledgeText(String(body.content || ""));
    }

    if (!title || !content) {
      return NextResponse.json({ error: "Title and readable content are required" }, { status: 400 });
    }
    const document = await prisma.knowledgeDocument.create({
      data: { tenantId: session.tenantId, title: title.slice(0, 200), content, sourceFilename, mimeType, status: "processing" },
    });
    after(async () => {
      try {
        await ingestKnowledgeDocument(document.id, session.tenantId);
      } catch (error) {
        console.error("Knowledge ingestion failed", error);
      }
    });
    return NextResponse.json({ document }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json({ error: message === "FORBIDDEN" ? "Forbidden" : "Unauthorized" }, { status: message === "FORBIDDEN" ? 403 : 401 });
  }
}
