import type { Page, Response } from "@playwright/test";

import { AI_RESULT_TIMEOUT } from "./timeouts.js";
import { withDemoWait } from "./demo-timeline.js";

const MAX_ERROR_BODY_CHARS = 2_000;
const DEFAULT_API_TIMEOUT_MS = 20_000;
const RETRYABLE_AI_CLOUDFLARE_LIMIT = 3;
const RETRYABLE_AI_CLOUDFLARE_DELAY_MS = 1_500;

type ResponseMatcher = (response: Response) => boolean;

export function apiResponseMatcher(
  method: string,
  pathname: RegExp,
): ResponseMatcher {
  return (response) => {
    if (response.request().method() !== method) return false;
    try {
      return pathname.test(new URL(response.url()).pathname);
    } catch {
      return false;
    }
  };
}

async function responseBodyForError(response: Response): Promise<string> {
  const body = await response.text().catch(() => "<response body unavailable>");
  if (body.length <= MAX_ERROR_BODY_CHARS) return body;
  return `${body.slice(0, MAX_ERROR_BODY_CHARS)}\n…<truncated>`;
}

async function responseDiagnostics(response: Response): Promise<string> {
  const names = [
    "content-type",
    "server",
    "cf-ray",
    "cf-error-type",
    "cf-error-origin",
  ] as const;
  const values = await Promise.all(
    names.map(async (name) => [name, await response.headerValue(name)] as const),
  );
  const present = values.flatMap(([name, value]) =>
    value === null ? [] : [`${name}=${value}`],
  );
  return present.length === 0
    ? "diagnostic headers: <none>"
    : `diagnostic headers: ${present.join(", ")}`;
}

async function isCloudflareHtml502(
  response: Response,
  body: string,
): Promise<boolean> {
  if (response.status() !== 502) return false;
  const contentType = (await response.headerValue("content-type")) ?? "";
  return (
    contentType.toLowerCase().includes("text/html") &&
    /cloudflare|cf-error-details|cf-wrapper/i.test(body) &&
    /bad gateway|host\s+error|error code 502/i.test(body)
  );
}

export async function requireSuccessfulResponse(
  response: Response,
  operation: string,
): Promise<Response> {
  if (response.ok()) return response;
  const body = await responseBodyForError(response);
  throw new Error(
    `${operation} failed: HTTP ${response.status()} ${response.statusText()}\n${body}`,
  );
}

export async function runAndRequireResponse(
  page: Page,
  matcher: ResponseMatcher,
  operation: string,
  action: () => Promise<void>,
  timeout = DEFAULT_API_TIMEOUT_MS,
): Promise<Response> {
  const responsePromise = page.waitForResponse(matcher, { timeout });
  try {
    await action();
  } catch (error) {
    // The action can fail before it issues the request (for example because a
    // locator became ambiguous). Mark the pending waiter as handled so page
    // teardown does not add a secondary "Channel closed" rejection.
    void responsePromise.catch(() => undefined);
    throw error;
  }
  return requireSuccessfulResponse(await responsePromise, operation);
}

export async function runAndRequireAiResponse(
  page: Page,
  matcher: ResponseMatcher,
  operation: string,
  action: () => Promise<void>,
): Promise<Response> {
  return withDemoWait(operation, () =>
    runAndRequireResponse(
      page,
      matcher,
      operation,
      action,
      AI_RESULT_TIMEOUT,
    ),
  );
}

/**
 * Retries only Cloudflare-generated HTML 502 responses for AI operations that
 * are safe to repeat (pure generation with no persisted mutation). App JSON
 * errors, schema failures, and every other status still fail immediately.
 */
export async function runAndRequireRetryableAiResponse(
  page: Page,
  matcher: ResponseMatcher,
  operation: string,
  action: () => Promise<void>,
): Promise<Response> {
  for (
    let attempt = 1;
    attempt <= RETRYABLE_AI_CLOUDFLARE_LIMIT;
    attempt += 1
  ) {
    const responsePromise = page.waitForResponse(matcher, {
      timeout: AI_RESULT_TIMEOUT,
    });
    const response = await withDemoWait(
      `${operation} (attempt ${attempt})`,
      async () => {
        try {
          await action();
        } catch (error) {
          void responsePromise.catch(() => undefined);
          throw error;
        }
        return responsePromise;
      },
    );
    if (response.ok()) return response;

    const body = await responseBodyForError(response);
    if (!(await isCloudflareHtml502(response, body))) {
      throw new Error(
        `${operation} failed: HTTP ${response.status()} ${response.statusText()}\n${body}`,
      );
    }

    if (attempt === RETRYABLE_AI_CLOUDFLARE_LIMIT) {
      const diagnostics = await responseDiagnostics(response);
      throw new Error(
        `${operation} failed after ${RETRYABLE_AI_CLOUDFLARE_LIMIT} attempts because Cloudflare repeatedly returned an HTML 502 Bad Gateway.\n${diagnostics}\n${body}`,
      );
    }

    // Let the client component leave its loading/error state before clicking
    // the same safe generation action again. Playwright click actionability
    // will additionally wait for the button to become enabled.
    await page.waitForTimeout(RETRYABLE_AI_CLOUDFLARE_DELAY_MS);
  }

  throw new Error(`${operation} did not produce a response.`);
}
