import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { fromApiError, idSchema } from "@/lib/api";

type Context = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(4000).nullable().optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  reminderAt: z.coerce.date().nullable().optional(),
  status: z.enum(["scheduled", "confirmed", "completed", "cancelled", "no_show"]).optional(),
  comments: z.string().max(8000).nullable().optional(),
  ownerUserId: idSchema.nullable().optional(),
});

export async function PATCH(req: Request, ctx: Context) {
  try {
    const session = await requireSession();
    const id = idSchema.parse((await ctx.params).id);
    const input = updateSchema.parse(await req.json());
    const before = await prisma.calendarEvent.findFirst({ where: { id, tenantId: session.tenantId } });
    if (!before) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Event not found" } }, { status: 404 });
    }
    const event = await prisma.calendarEvent.update({
      where: { id },
      data: {
        ...input,
        completedAt:
          input.status === "completed"
            ? before.completedAt || new Date()
            : input.status
              ? null
              : undefined,
      },
    });
    return NextResponse.json({ event });
  } catch (error) {
    return fromApiError(error);
  }
}
