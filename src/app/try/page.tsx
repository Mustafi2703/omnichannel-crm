import { prisma } from "@/lib/prisma";
import { TryChat } from "@/components/TryChat";

export const dynamic = "force-dynamic";

export default async function TryPage() {
  const slug = process.env.DEFAULT_TENANT_SLUG || "ea-global-water-staging";
  const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { settings: true } });
  const publicKey = ((tenant?.settings || {}) as { widgetPublicKey?: string }).widgetPublicKey || "";
  if (!publicKey) {
    return <main className="p-8 text-sm text-slate-600">The chat widget is not configured for this workspace yet.</main>;
  }
  return <TryChat slug={slug} publicKey={publicKey} />;
}
