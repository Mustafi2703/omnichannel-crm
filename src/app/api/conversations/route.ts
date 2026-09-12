import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { z } from "zod";
import { fromApiError } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const query = new URL(req.url).searchParams;
    const filters = z.object({
      status: z.enum(["open", "pending", "closed"]).optional(),
      channel: z.string().trim().min(1).max(40).optional(),
      assigneeId: z.string().trim().min(1).max(64).optional(),
      q: z.string().trim().max(160).default(""),
    }).parse({
      status: query.get("status") || undefined,
      channel: query.get("channel") || undefined,
      assigneeId: query.get("assigneeId") || undefined,
      q: query.get("q") || "",
    });
    const conversations = await prisma.conversation.findMany({
      where: {
        tenantId: session.tenantId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.channel ? { channelType: filters.channel } : {}),
        ...(filters.assigneeId === "unassigned" ? { assigneeId: null } : filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
        ...(filters.q ? { contact: { displayName: { contains: filters.q, mode: "insensitive" } } } : {}),
      },
      orderBy: { lastMessageAt: "desc" },
      include: {
        contact: true,
        assignee: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      take: 100,
    });
    return NextResponse.json({ conversations });
  } catch (error) {
    return fromApiError(error);
  }
}
