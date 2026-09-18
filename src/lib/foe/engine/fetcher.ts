/**
 * HTTP fetching for the sweep.
 *
 * Two jobs beyond "get the page":
 *
 *  1. Be cheap. Conditional requests (ETag / If-Modified-Since) let a source
 *     answer 304 and cost nothing, which is what most sources should do most
 *     hours.
 *  2. Be honest about failure. Every non-success is classified into a
 *     `FailureKind` so the difference between "checked, nothing there",
 *     "blocked by Cloudflare" and "the URL 404s now" survives into the health
 *     view instead of collapsing into a null.
 */

import type { FailureKind } from "@prisma/client";
import { extractText } from "./content";

const DEFAULT_TIMEOUT_MS = 12_000;

/**
 * Identifies the crawler honestly and points at the project. A bot that lies
 * about what it is has no business complaining when it gets blocked.
 */
const USER_AGENT = "Mozilla/5.0 (compatible; HQ-FOE/1.0; +https://github.com/wolverzor/HQ)";

export interface FetchSuccess {
  ok: true;
  status: number;
  /** True when the server answered 304: unchanged, nothing to re-parse. */
  notModified: boolean;
  text: string;
  etag: string | null;
  lastModified: string | null;
  finalUrl: string;
}

export interface FetchFailure {
  ok: false;
  status: number | null;
  kind: FailureKind;
  message: string;
  /** Whether retrying later is likely to help. */
  transient: boolean;
}

export type FetchOutcome = FetchSuccess | FetchFailure;

/** Bot-wall fingerprints. Being blocked is a monitoring failure, not an absence of opportunities. */
const BLOCK_MARKERS = [
  "just a moment",
  "checking your browser",
  "cloudflare",
  "access denied",
  "attention required",
  "request blocked",
  "are you a robot",
  "enable javascript and cookies",
];

const CAPTCHA_MARKERS = ["captcha", "recaptcha", "hcaptcha", "turnstile"];

function classifyStatus(status: number): { kind: FailureKind; transient: boolean; message: string } {
  if (status === 403 || status === 401) {
    return { kind: "BLOCKED", transient: false, message: `Source refused the request (HTTP ${status}).` };
  }
  if (status === 404 || status === 410) {
    return { kind: "CAREERS_URL_MISSING", transient: false, message: `Source no longer exists (HTTP ${status}).` };
  }
  if (status === 429) {
    return { kind: "RATE_LIMITED", transient: true, message: "Rate limited by the source (HTTP 429)." };
  }
  if (status >= 500) {
    return { kind: "HTTP_ERROR", transient: true, message: `Source returned a server error (HTTP ${status}).` };
  }
  return { kind: "HTTP_ERROR", transient: false, message: `Unexpected response (HTTP ${status}).` };
}

/**
 * Detects a page that returned 200 but is actually a bot wall.
 *
 * This is the nastiest silent failure in the whole pipeline: a 200 with a
 * "checking your browser" body parses as a page with no programmes on it, and
 * would otherwise be recorded as a successful check that found nothing.
 */
export function detectBlockPage(text: string): { blocked: boolean; kind: FailureKind; reason: string } | null {
  const lower = text.toLowerCase();
  const short = lower.length < 2_000;

  if (CAPTCHA_MARKERS.some((m) => lower.includes(m))) {
    return { blocked: true, kind: "CAPTCHA", reason: "Page presented a CAPTCHA." };
  }
  // Block wording only counts on a short page: a long careers page mentioning
  // "cloudflare" in a job description is not a block.
  if (short && BLOCK_MARKERS.some((m) => lower.includes(m))) {
    return { blocked: true, kind: "BLOCKED", reason: "Page looks like an automated-traffic interstitial." };
  }
  return null;
}

export interface ConditionalHeaders {
  etag?: string | null;
  lastModified?: string | null;
}

export async function fetchSource(
  url: string,
  conditional: ConditionalHeaders = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<FetchOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-GB,en;q=0.9",
    };
    if (conditional.etag) headers["If-None-Match"] = conditional.etag;
    if (conditional.lastModified) headers["If-Modified-Since"] = conditional.lastModified;

    const res = await fetch(url, { signal: controller.signal, headers, redirect: "follow" });

    if (res.status === 304) {
      return {
        ok: true,
        status: 304,
        notModified: true,
        text: "",
        etag: conditional.etag ?? null,
        lastModified: conditional.lastModified ?? null,
        finalUrl: res.url || url,
      };
    }

    if (!res.ok) {
      const { kind, transient, message } = classifyStatus(res.status);
      return { ok: false, status: res.status, kind, transient, message };
    }

    const body = await res.text();

    // JSON sources (ATS boards) must survive intact: running an API response
    // through the HTML stripper would turn it into unparseable prose. Only
    // markup gets flattened.
    const contentType = res.headers.get("content-type") ?? "";
    const isJson = contentType.includes("json") || /^\s*[[{]/.test(body.slice(0, 200));
    const text = isJson ? body : extractText(body);

    // A bot wall is always an HTML page, so this check only applies there.
    const block = isJson ? null : detectBlockPage(text);
    if (block) {
      return { ok: false, status: res.status, kind: block.kind, transient: false, message: block.reason };
    }

    return {
      ok: true,
      status: res.status,
      notModified: false,
      text,
      etag: res.headers.get("etag"),
      lastModified: res.headers.get("last-modified"),
      finalUrl: res.url || url,
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      status: null,
      kind: "FETCH_ERROR",
      transient: true,
      message: aborted
        ? `Source did not respond within ${Math.round(timeoutMs / 1000)}s.`
        : `Could not reach the source (${error instanceof Error ? error.message : "unknown error"}).`,
    };
  } finally {
    clearTimeout(timer);
  }
}
