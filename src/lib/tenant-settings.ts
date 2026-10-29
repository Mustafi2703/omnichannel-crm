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
  // Staff alerts only fire inside these hours (tenant time zone). Days: 0 = Sunday … 6 = Saturday.
  businessHours: z.object({
    days: z.array(z.number().int().min(0).max(6)).max(7).default([1, 2, 3, 4, 5, 6]),
    start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("09:30"),
    end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("18:30"),
  }).default({ days: [1, 2, 3, 4, 5, 6], start: "09:30", end: "18:30" }),
});

export type OperationsSettings = z.infer<typeof operationsSchema>;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const toSeconds = (hhmm: string) => Number(hhmm.slice(0, 2)) * 3600 + Number(hhmm.slice(3, 5)) * 60;

/** When today's business hours began, or null while closed. */
export function businessOpenedAt(now: Date, hours: OperationsSettings["businessHours"], timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  const seconds = Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second);
  const start = toSeconds(hours.start);
  if (!hours.days.includes(WEEKDAYS.indexOf(parts.weekday)) || seconds < start || seconds >= toSeconds(hours.end)) return null;
  // ponytail: assumes no DST shift between opening and now (Europe/Istanbul has none); do per-zone offset math if a DST tenant appears.
  return new Date(now.getTime() - now.getMilliseconds() - (seconds - start) * 1000);
}
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
