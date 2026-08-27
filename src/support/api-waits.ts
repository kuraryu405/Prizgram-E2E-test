import type { Page, Response } from "@playwright/test";

import { AI_RESULT_TIMEOUT } from "./timeouts.js";

const MAX_ERROR_BODY_CHARS = 2_000;
const DEFAULT_API_TIMEOUT_MS = 20_000;

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
  return runAndRequireResponse(
    page,
    matcher,
    operation,
    action,
    AI_RESULT_TIMEOUT,
  );
}
