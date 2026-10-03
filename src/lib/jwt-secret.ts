/** Fail-fast JWT secret helper (Phase 0). Kept separate so unit tests avoid Prisma import side-effects. */
export function requireJwtSecretBytes() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is required");
  const trimmed = value.trim();
  const placeholders = new Set(["change-me", "changeme", "secret", "jwt-secret", "your-jwt-secret", "replace-me"]);
  if (trimmed.length < 32 || placeholders.has(trimmed.toLowerCase())) {
    throw new Error("JWT_SECRET must be a strong secret of at least 32 characters");
  }
  return new TextEncoder().encode(trimmed);
}
