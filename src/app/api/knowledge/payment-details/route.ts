import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { fromApiError } from "@/lib/api";

/** Signed-in agents only. This category is excluded from AI retrieval and from the always-inject prompt. */
export async function GET() {
  try {
    const session = await requireSession();
    const docs = await prisma.knowledgeDocument.findMany({
      where: { tenantId: session.tenantId, category: "iban_information", status: "ready" },
      select: { title: true, content: true },
      orderBy: { updatedAt: "desc" },
      take: 1,
    });
    if (!docs.length) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Payment details have not been added yet" } }, { status: 404 });
    }
    return NextResponse.json({ title: docs[0].title, text: docs[0].content });
  } catch (error) {
    return fromApiError(error);
  }
}
