import { z } from "zod";

const operationsSchema = z.object({
  aiInstructions: z.string().trim().max(10_000).default(""),
  sla: z.object({
    managerUserIds: z.array(z.string().min(1).max(64)).max(20).default([]),
    unassignedAfterMinutes: z.number().int().min(5).max(1_440).default(15),
    firstCallAfterMinutes: z.number().int().min(5).max(1_440).default(30),
    noCallAfterMinutes: z.number().int().min(30).max(10_080).default(180),
  }).default({
    managerUserIds: [],
    unassignedAfterMinutes: 15,
    firstCallAfterMinutes: 30,
    noCallAfterMinutes: 180,
  }),
});

export type OperationsSettings = z.infer<typeof operationsSchema>;
export const DEFAULT_OPERATIONS_SETTINGS: OperationsSettings = operationsSchema.parse({});

export function getOperationsSettings(settings: unknown): OperationsSettings {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return DEFAULT_OPERATIONS_SETTINGS;
  const candidate = (settings as Record<string, unknown>).operations;
  return operationsSchema.safeParse(candidate).data || DEFAULT_OPERATIONS_SETTINGS;
}

export function mergeOperationsSettings(existing: unknown, operations: OperationsSettings) {
  const base = existing && typeof existing === "object" && !Array.isArray(existing)
    ? { ...(existing as Record<string, unknown>) }
    : {};
  return { ...base, operations };
}

export const operationsInputSchema = operationsSchema;
