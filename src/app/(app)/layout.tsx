import { redirect } from "next/navigation";
import { getSession, getSessionIssuedAtMs } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClientProviders } from "@/components/ClientProviders";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await prisma.user.findFirst({
    where: { id: session.id, tenantId: session.tenantId, isActive: true },
    select: { name: true, mustChangePassword: true, passwordChangedAt: true },
  });
  if (!user) redirect("/login");
  const issuedAtMs = await getSessionIssuedAtMs();
  if (user.passwordChangedAt && issuedAtMs != null && issuedAtMs + 2000 < user.passwordChangedAt.getTime()) {
    // Cookies cannot be changed while rendering a page (Next throws), so just send them to sign in;
    // the next sign-in replaces the stale cookie, and /login does not bounce signed-in users.
    redirect("/login");
  }
  return (
    <ClientProviders userName={user.name} mustChangePassword={user.mustChangePassword}>
      {children}
    </ClientProviders>
  );
}
