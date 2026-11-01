import { describe, expect, it } from "vitest";
import { businessOpenedAt, DEFAULT_OPERATIONS_SETTINGS, getOperationsSettings } from "./tenant-settings";

const hours = DEFAULT_OPERATIONS_SETTINGS.businessHours;
const ist = (local: string) => new Date(`${local}+03:00`); // Europe/Istanbul is UTC+3 all year
const opened = (local: string) => businessOpenedAt(ist(local), hours, "Europe/Istanbul");

describe("businessOpenedAt (Mon–Sat 09:30–18:30 Istanbul)", () => {
  it("is closed before opening, at closing time and on Sunday", () => {
    expect(opened("2026-11-02T09:29:59")).toBeNull(); // Monday
    expect(opened("2026-10-31T18:30:00")).toBeNull(); // Saturday closing
    expect(opened("2026-11-01T12:00:00")).toBeNull(); // Sunday
  });

  it("returns today's opening instant while open", () => {
    expect(opened("2026-11-02T09:30:00")).toEqual(ist("2026-11-02T09:30:00"));
    expect(opened("2026-10-31T18:29:59.500")).toEqual(ist("2026-10-31T09:30:00"));
  });

  it("uses the tenant's local day, not the UTC day", () => {
    // 22:00 UTC on Saturday is 01:00 Sunday in Istanbul → closed
    expect(businessOpenedAt(new Date("2026-10-31T22:00:00Z"), hours, "Europe/Istanbul")).toBeNull();
    // 07:00 UTC on Monday is 10:00 in Istanbul → open since 06:30 UTC
    expect(businessOpenedAt(new Date("2026-11-02T07:00:00Z"), hours, "Europe/Istanbul")).toEqual(new Date("2026-11-02T06:30:00Z"));
  });

  it("defaults the hours for tenants saved before the setting existed", () => {
    expect(getOperationsSettings({ operations: { sla: { managerUserIds: ["u1"] } } }).businessHours).toEqual({ days: [1, 2, 3, 4, 5, 6], start: "09:30", end: "18:30" });
  });
});
