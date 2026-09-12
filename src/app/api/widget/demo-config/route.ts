import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fromApiError } from "@/lib/api";

/** Internal-only configuration used by the authenticated widget demo. */
export async function GET() {
  try {
    const session = await requireSession();
    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { id: session.tenantId },
      select: { slug: true, settings: true },
    });
    const settings = tenant.settings as { widgetPublicKey?: string };
    return NextResponse.json({ slug: tenant.slug, publicKey: settings.widgetPublicKey || null });
  } catch (error) {
    return fromApiError(error);
  }
}
