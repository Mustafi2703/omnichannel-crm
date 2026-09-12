import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { fromApiError } from "@/lib/api";

/** Approved service templates are available to every authenticated inbox agent. */
export async function GET() {
  try {
    const session = await requireSession();
    const templates = await prisma.whatsappTemplate.findMany({
      where: { tenantId: session.tenantId, status: "approved" },
      select: { id: true, name: true, language: true, category: true, body: true },
      orderBy: [{ language: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ templates });
  } catch (error) {
    return fromApiError(error);
  }
}
