"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    __tbtsTurnstileLoader?: Promise<void>;
  }
}

const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstileScript() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  if (window.__tbtsTurnstileLoader) {
    return window.__tbtsTurnstileLoader;
  }

  window.__tbtsTurnstileLoader = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${TURNSTILE_SCRIPT_SRC}"]`,
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("script-load-failed")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("script-load-failed"));
    document.head.appendChild(script);
  });

  return window.__tbtsTurnstileLoader;
}

type TurnstileWidgetProps = {
  siteKey?: string;
  theme?: "light" | "dark" | "auto";
  resetKey?: number;
  onToken: (token: string) => void;
  onExpired: () => void;
  onError: (message: string) => void;
};

export function TurnstileWidget({
  siteKey,
  theme = "auto",
  resetKey = 0,
  onToken,
  onExpired,
  onError,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    loadTurnstileScript()
      .then(() => {
        if (!isMounted) {
          return;
        }

        if (!window.turnstile) {
          onError("Turnstile did not finish loading. Please refresh and try again.");
          return;
        }

        setScriptReady(true);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        onError("Turnstile could not load. Please check your connection and try again.");
      });

    return () => {
      isMounted = false;
    };
  }, [onError]);

  useEffect(() => {
    if (!siteKey || !scriptReady || !containerRef.current || !window.turnstile) {
      return;
    }

    if (widgetIdRef.current) {
      window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme,
      callback: (token) => onToken(token),
      "expired-callback": () => onExpired(),
      "error-callback": () =>
        onError("Verification ran into a problem. Please reset the check and try again."),
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [onError, onExpired, onToken, scriptReady, siteKey, theme]);

  useEffect(() => {
    if (!widgetIdRef.current || !window.turnstile) {
      return;
    }

    window.turnstile.reset(widgetIdRef.current);
  }, [resetKey]);

  if (!siteKey) {
    return (
      <div className="rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-surface)] px-4 py-3 text-sm leading-6 text-[var(--warning)]">
        Developer note: add <code>NEXT_PUBLIC_TURNSTILE_SITE_KEY</code> before testing the
        protected Review Recipe step.
      </div>
    );
  }

  return (
    <div className="min-h-[66px] rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-3">
      <div ref={containerRef} />
    </div>
  );
}
