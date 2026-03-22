import { NextRequest, NextResponse } from "next/server";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type SiteverifyResponse = {
  success: boolean;
  "error-codes"?: string[];
};

export async function POST(request: NextRequest) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    return NextResponse.json(
      {
        success: false,
        error: "missing-secret",
        message:
          "TURNSTILE_SECRET_KEY is missing on the server. Add it before using Review Recipe protection.",
      },
      { status: 500 },
    );
  }

  let token = "";

  try {
    const body = (await request.json()) as { token?: string };
    token = typeof body.token === "string" ? body.token : "";
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "invalid-request",
        message: "The Turnstile verification request was malformed.",
      },
      { status: 400 },
    );
  }

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: "missing-token",
        message: "No Turnstile token was provided.",
      },
      { status: 400 },
    );
  }

  const remoteIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const formData = new URLSearchParams({
    secret: secretKey,
    response: token,
  });

  if (remoteIp) {
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
      return NextResponse.json(
        {
          success: false,
          error: "siteverify-unavailable",
          message: "Cloudflare verification was unavailable. Please try again.",
        },
        { status: 502 },
      );
    }

    const data = (await response.json()) as SiteverifyResponse;

    return NextResponse.json({
      success: data.success,
      errorCodes: data["error-codes"] ?? [],
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "network-error",
        message: "Cloudflare verification could not be completed. Please try again.",
      },
      { status: 502 },
    );
  }
}
