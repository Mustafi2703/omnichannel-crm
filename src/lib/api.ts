import { NextResponse } from "next/server";
import { z } from "zod";

export const idSchema = z.string().min(1).max(64);
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export const contactInputSchema = z.object({
  displayName: z.string().trim().min(1).max(160),
  companyName: z.string().trim().max(160).nullable().optional(),
  email: z.string().trim().email().max(254).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  ownerUserId: idSchema.nullable().optional(),
  consentWhatsappMarketing: z.boolean().optional(),
});
export const leadInputSchema = z.object({
  contactId: idSchema,
  stageId: idSchema,
  title: z.string().trim().min(1).max(200),
  ownerUserId: idSchema.nullable().optional(),
  score: z.number().int().min(0).max(100).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  notes: z.string().max(10_000).nullable().optional(),
  lostReason: z.string().max(500).nullable().optional(),
  expectedValue: z.number().nonnegative().nullable().optional(),
  wonAmount: z.number().nonnegative().nullable().optional(),
  nextFollowupAt: z.coerce.date().nullable().optional(),
});
export const taskInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().max(10_000).nullable().optional(),
  type: z.string().trim().min(1).max(50).optional(),
  leadId: idSchema.nullable().optional(),
  contactId: idSchema.nullable().optional(),
  conversationId: idSchema.nullable().optional(),
  assigneeId: idSchema.nullable().optional(),
  dueAt: z.coerce.date().nullable().optional(),
});

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function fromApiError(error: unknown) {
  if (error instanceof z.ZodError) return apiError(400, "VALIDATION_ERROR", "Invalid request",);
  const message = error instanceof Error ? error.message : "Internal server error";
  if (message === "UNAUTHORIZED") return apiError(401, "UNAUTHORIZED", "Authentication is required");
  if (message === "FORBIDDEN") return apiError(403, "FORBIDDEN", "You do not have permission");
  console.error(error);
  return apiError(500, "INTERNAL_ERROR", "Unexpected server error");
}
