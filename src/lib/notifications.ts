import { Resend } from "resend";
import { prisma } from "./prisma";
export async function notify(params: { tenantId: string; userId?: string; type: string; title: string; body?: string }) {
  const notification = await prisma.notification.create({ data: params });
  const key = process.env.RESEND_API_KEY;
  if (key && params.userId) { const user = await prisma.user.findFirst({ where: { id: params.userId, tenantId: params.tenantId, isActive: true } }); if (user) await new Resend(key).emails.send({ from: process.env.RESEND_FROM || "EA Global Water CRM <onboarding@resend.dev>", to: user.email, subject: params.title, text: params.body || params.title }); }
  return notification;
}
