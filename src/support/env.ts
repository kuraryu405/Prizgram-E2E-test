function csv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getBaseUrl(): string {
  const raw = process.env.E2E_BASE_URL?.trim();
  if (!raw) {
    throw new Error(
      "E2E_BASE_URL is required. Point it at localhost, preview, or staging.",
    );
  }

  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("E2E_BASE_URL must use http or https.");
  }
  return url.toString().replace(/\/$/, "");
}

export function assertMutationAllowed(): void {
  if (process.env.E2E_ALLOW_MUTATION !== "true") {
    throw new Error(
      "Mutable E2E is disabled. Set E2E_ALLOW_MUTATION=true for an isolated test environment.",
    );
  }

  const baseUrl = new URL(getBaseUrl());
  const productionHosts = new Set([
    "prizgram.kuraryu.jp",
    ...csv(process.env.E2E_PRODUCTION_HOSTS),
  ]);

  if (
    productionHosts.has(baseUrl.hostname) &&
    process.env.E2E_ALLOW_PRODUCTION !== "true"
  ) {
    throw new Error(
      `Refusing to mutate production host ${baseUrl.hostname}. Use a disposable environment instead.`,
    );
  }
}

export function isProductionTarget(): boolean {
  const baseUrl = new URL(getBaseUrl());
  const productionHosts = new Set([
    "prizgram.kuraryu.jp",
    ...csv(process.env.E2E_PRODUCTION_HOSTS),
  ]);
  return productionHosts.has(baseUrl.hostname);
}
