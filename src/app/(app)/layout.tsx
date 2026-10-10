import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClientProviders } from "@/components/ClientProviders";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await prisma.user.findFirst({
    where: { id: session.id, tenantId: session.tenantId, isActive: true },
    select: { name: true, mustChangePassword: true },
  });
  if (!user) redirect("/login");
  return (
    <ClientProviders userName={user.name} mustChangePassword={user.mustChangePassword}>
      {children}
    </ClientProviders>
  );
}
