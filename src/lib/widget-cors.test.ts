import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveAllowedOrigins } from "./widget-cors";

describe("resolveAllowedOrigins", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("adds the CRM origin once shop domains are configured, so the Widget demo is not blocked", () => {
    vi.stubEnv("WIDGET_ALLOWED_ORIGINS", "https://www.hidrotekwater.com.tr/");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://eacrm.net/");
    expect(resolveAllowedOrigins({ widgetAllowedOrigins: ["https://biohidrogen.com"] })).toEqual([
      "https://biohidrogen.com",
      "https://www.hidrotekwater.com.tr",
      "https://eacrm.net",
    ]);
  });

  it("stays open to any origin when nothing is configured", () => {
    vi.stubEnv("WIDGET_ALLOWED_ORIGINS", "");
    expect(resolveAllowedOrigins()).toEqual([]);
  });
});
