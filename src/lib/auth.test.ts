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
    process.env.JWT_SECRET = "unit-test-secret";
    expect(requireJwtSecretBytes()).toBeInstanceOf(Uint8Array);
  });
});
