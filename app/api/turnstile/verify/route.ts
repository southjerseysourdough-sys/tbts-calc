import { NextRequest, NextResponse } from "next/server";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TOKEN_PATTERN = /^[A-Za-z0-9._-]+$/;
const MAX_TOKEN_LENGTH = 4096;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 15;
const ALLOWED_ORIGINS = new Set([
  "https://calc.tallowbethysoap.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

type SiteverifyResponse = {
  success: boolean;
  "error-codes"?: string[];
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const requestLog = new Map<string, RateLimitEntry>();

function jsonNoStore(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function isAllowedOrigin(request: NextRequest) {
  const originHeader = request.headers.get("origin");
  if (!originHeader) {
    return true;
  }

  return ALLOWED_ORIGINS.has(originHeader);
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const current = requestLog.get(ip);

  if (!current || current.resetAt <= now) {
    requestLog.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  current.count += 1;
  return current.count > MAX_REQUESTS_PER_WINDOW;
}

export async function POST(request: NextRequest) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    return jsonNoStore(
      {
        success: false,
        error: "server-misconfigured",
        message: "Verification is temporarily unavailable. Please try again later.",
      },
      { status: 500 },
    );
  }

  if (!isAllowedOrigin(request)) {
    return jsonNoStore(
      {
        success: false,
        error: "forbidden-origin",
        message: "Verification request was blocked.",
      },
      { status: 403 },
    );
  }

  const remoteIp = getClientIp(request);

  if (isRateLimited(remoteIp)) {
    return jsonNoStore(
      {
        success: false,
        error: "rate-limited",
        message: "Too many verification attempts. Please wait a moment and try again.",
      },
      { status: 429 },
    );
  }

  let token = "";

  try {
    const body = (await request.json()) as { token?: string };
    token = typeof body.token === "string" ? body.token.trim() : "";
  } catch {
    return jsonNoStore(
      {
        success: false,
        error: "invalid-request",
        message: "The verification request was malformed.",
      },
      { status: 400 },
    );
  }

  if (
    !token ||
    token.length > MAX_TOKEN_LENGTH ||
    !TOKEN_PATTERN.test(token)
  ) {
    return jsonNoStore(
      {
        success: false,
        error: "invalid-token",
        message: "The verification token was invalid.",
      },
      { status: 400 },
    );
  }

  const formData = new URLSearchParams({
    secret: secretKey,
    response: token,
  });

  if (remoteIp !== "unknown") {
    formData.set("remoteip", remoteIp);
  }

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
      cache: "no-store",
    });

    if (!response.ok) {
      return jsonNoStore(
        {
          success: false,
          error: "siteverify-unavailable",
          message: "Verification service was unavailable. Please try again.",
        },
        { status: 502 },
      );
    }

    const data = (await response.json()) as SiteverifyResponse;

    return jsonNoStore({
      success: data.success,
      errorCodes: data["error-codes"] ?? [],
    });
  } catch {
    return jsonNoStore(
      {
        success: false,
        error: "network-error",
        message: "Verification could not be completed. Please try again.",
      },
      { status: 502 },
    );
  }
}
