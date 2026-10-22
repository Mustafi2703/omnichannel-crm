import { afterEach, describe, expect, it } from "vitest";
import { appBaseUrl, inboxUrl } from "./app-url";

describe("appBaseUrl", () => {
  const original = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = original;
  });

  it("uses the production host when no public URL is configured", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(appBaseUrl()).toBe("https://eacrm.net");
    expect(inboxUrl("conv 1")).toBe("https://eacrm.net/inbox?c=conv%201");
  });

  it("strips a trailing slash from the configured URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://staging-crm.eaglobalwater.com/";
    expect(inboxUrl("abc")).toBe("https://staging-crm.eaglobalwater.com/inbox?c=abc");
  });
});
