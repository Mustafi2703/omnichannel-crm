import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { contactInputSchema, fromApiError, paginationSchema } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const query = new URL(req.url).searchParams;
    const { page, pageSize } = paginationSchema.parse(Object.fromEntries(query));
    const q = (query.get("q") || "").trim();
    const where = { tenantId: session.tenantId, OR: q ? ["displayName", "companyName", "email", "phone"].map((field) => ({ [field]: { contains: q, mode: "insensitive" as const } })) : undefined };
    const [contacts, total] = await prisma.$transaction([
      prisma.contact.findMany({ where, include: { _count: { select: { leads: true, conversations: true } }, owner: { select: { id: true, name: true } } }, orderBy: { updatedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.contact.count({ where }),
    ]);
    return NextResponse.json({ contacts, pagination: { page, pageSize, total } });
  } catch (error) { return fromApiError(error); }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const input = contactInputSchema.parse(await req.json());
    if (input.ownerUserId) {
      const owner = await prisma.user.findFirst({ where: { id: input.ownerUserId, tenantId: session.tenantId, isActive: true } });
      if (!owner) return NextResponse.json({ error: { code: "INVALID_OWNER", message: "Owner not found" } }, { status: 400 });
    }
    const contact = await prisma.contact.create({ data: { ...input, tenantId: session.tenantId } });
    await audit({ tenantId: session.tenantId, actorUserId: session.id, action: "create", entityType: "contact", entityId: contact.id, after: { displayName: contact.displayName } });
    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) { return fromApiError(error); }
}
