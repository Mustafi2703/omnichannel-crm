import { Resend } from "resend";
import { prisma } from "./prisma";

export async function notify(params: { tenantId: string; userId?: string; type: string; title: string; body?: string }) {
  const notification = await prisma.notification.create({ data: params });
  const key = process.env.RESEND_API_KEY;
  if (!key || !params.userId) return notification;
  const user = await prisma.user.findFirst({
    where: { id: params.userId, tenantId: params.tenantId, isActive: true },
    select: { email: true },
  });
  if (!user?.email) return notification;
  try {
    const result = await new Resend(key).emails.send({
      from: process.env.RESEND_FROM || "EA Global Water CRM <onboarding@resend.dev>",
      to: user.email,
      subject: params.title,
      text: params.body || params.title,
    });
    if (result.error) console.error("notification email failed", result.error.message);
  } catch (error) {
    console.error("notification email failed", error instanceof Error ? error.message : "unknown");
  }
  return notification;
}
