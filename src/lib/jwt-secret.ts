/** Fail-fast JWT secret helper (Phase 0). Kept separate so unit tests avoid Prisma import side-effects. */
export function requireJwtSecretBytes() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is required");
  return new TextEncoder().encode(value);
}
