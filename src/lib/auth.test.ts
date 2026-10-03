import { afterEach, describe, expect, it } from "vitest";
import { requireJwtSecretBytes } from "@/lib/jwt-secret";

describe("JWT_SECRET", () => {
  const original = process.env.JWT_SECRET;

  afterEach(() => {
    if (original === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = original;
  });

  it("throws when JWT_SECRET is unset", () => {
    delete process.env.JWT_SECRET;
    expect(() => requireJwtSecretBytes()).toThrow(/JWT_SECRET is required/);
  });

  it("returns encoded secret when set", () => {
    process.env.JWT_SECRET = "unit-test-secret-at-least-32-chars!!";
    expect(requireJwtSecretBytes()).toBeInstanceOf(Uint8Array);
  });

  it("rejects short or placeholder secrets", () => {
    process.env.JWT_SECRET = "change-me";
    expect(() => requireJwtSecretBytes()).toThrow(/at least 32/);
  });
});
