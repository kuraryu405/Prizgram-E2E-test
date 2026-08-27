import { test as base, expect } from "@playwright/test";

import { getBaseUrl } from "./env.js";

type DiagnosticEntry = Readonly<{
  kind: "console" | "pageerror" | "requestfailed";
  level?: string;
  message: string;
  url?: string;
  method?: string;
  classification: "target" | "third_party" | "browser";
}>;

function classifyUrl(rawUrl: string | undefined): DiagnosticEntry["classification"] {
  if (rawUrl === undefined || rawUrl === "") return "browser";
  try {
    const target = new URL(getBaseUrl());
    const actual = new URL(rawUrl);
    return actual.hostname === target.hostname ? "target" : "third_party";
  } catch {
    return "browser";
  }
}

export const test = base.extend<{ diagnostics: void }>({
  diagnostics: [
    async ({ page }, use, testInfo) => {
      const entries: DiagnosticEntry[] = [];

      page.on("console", (message) => {
        if (message.type() !== "error" && message.type() !== "warning") return;
        const location = message.location();
        entries.push({
          kind: "console",
          level: message.type(),
          message: message.text(),
          ...(location.url === "" ? {} : { url: location.url }),
          classification: classifyUrl(location.url),
        });
      });

      page.on("pageerror", (error) => {
        entries.push({
          kind: "pageerror",
          level: "error",
          message: error.stack ?? error.message,
          classification: "browser",
        });
      });

      page.on("requestfailed", (request) => {
        entries.push({
          kind: "requestfailed",
          message: request.failure()?.errorText ?? "request failed",
          url: request.url(),
          method: request.method(),
          classification: classifyUrl(request.url()),
        });
      });

      await use();

      await testInfo.attach("browser-diagnostics.json", {
        body: Buffer.from(
          JSON.stringify(
            {
              target: getBaseUrl(),
              status: testInfo.status,
              expectedStatus: testInfo.expectedStatus,
              entries,
            },
            null,
            2,
          ),
        ),
        contentType: "application/json",
      });
    },
    { auto: true },
  ],
});

export { expect };
