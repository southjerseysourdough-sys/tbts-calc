"use client";

import { useCallback, useEffect, useState } from "react";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { ShareModule, ThemeToggle } from "@/components/wizard/ui";

const HOMEPAGE_URL = "https://tallowbethysoap.com/";
const SHARE_URL = "https://calc.tallowbethysoap.com/";
const SHARE_TEXT = "Tallow Be Thy Soap Lab | Guided cold process soap calculator";
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type EntryGateScreenProps = {
  onEnter: () => void;
};

export function EntryGateScreen({ onEnter }: EntryGateScreenProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileStatus, setTurnstileStatus] = useState<
    "idle" | "verifying" | "verified" | "failed"
  >("idle");
  const [turnstileMessage, setTurnstileMessage] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  const resetTurnstileState = useCallback((message?: string) => {
    setTurnstileToken("");
    setTurnstileStatus("idle");
    setTurnstileMessage(message ?? "");
    setTurnstileResetKey((current) => current + 1);
  }, []);

  const handleTurnstileExpired = useCallback(() => {
    resetTurnstileState("Verification expired. Please complete the check again.");
  }, [resetTurnstileState]);

  const handleTurnstileError = useCallback((message: string) => {
    setTurnstileStatus("failed");
    setTurnstileMessage(message);
  }, []);

  const handleTurnstileToken = useCallback((token: string) => {
    setTurnstileToken(token);
    setTurnstileStatus("verifying");
    setTurnstileMessage("Checking verification...");
  }, []);

  useEffect(() => {
    if (!turnstileToken) {
      return;
    }

    let ignore = false;

    const verifyToken = async () => {
      try {
        const response = await fetch("/api/turnstile/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token: turnstileToken }),
        });

        const data = (await response.json()) as {
          success?: boolean;
          message?: string;
        };

        if (ignore) {
          return;
        }

        if (response.ok && data.success) {
          setTurnstileStatus("verified");
          setTurnstileMessage("Verification complete. You can enter the calculator.");
          return;
        }

        setTurnstileStatus("failed");
        setTurnstileMessage(
          data.message ??
            "Verification could not be confirmed. Please reset the check and try again.",
        );
        setTurnstileToken("");
        setTurnstileResetKey((current) => current + 1);
      } catch {
        if (ignore) {
          return;
        }

        setTurnstileStatus("failed");
        setTurnstileMessage(
          "Verification could not be completed right now. Please reset the check and try again.",
        );
        setTurnstileToken("");
        setTurnstileResetKey((current) => current + 1);
      }
    };

    verifyToken();

    return () => {
      ignore = true;
    };
  }, [turnstileToken]);

  const canEnter = acknowledged && Boolean(turnstileToken) && turnstileStatus === "verified";

  return (
    <div className="mx-auto max-w-6xl space-y-5 page-fade-shell">
      <section className="paper-card p-6 md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={HOMEPAGE_URL}
                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent-strong)] transition hover:text-[var(--accent)]"
              >
                <span aria-hidden="true">&lt;-</span>
                <span>Back to tallowbethysoap.com</span>
              </a>
              <ThemeToggle />
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.24em] text-[var(--accent-strong)]">
              Calculator Entry
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--text)] md:text-5xl">
              Tallow Be Thy Soap Lab
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-soft)]">
              Review the acknowledgment below, complete the quiet verification check, and then
              enter the guided calculator.
            </p>
          </div>
          <ShareModule shareUrl={SHARE_URL} shareText={SHARE_TEXT} />
        </div>
      </section>

      <section className="paper-card p-6 md:p-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            Acknowledgment
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text)]">
            Enter the calculator
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">
            This calculator is a formulation aid for soapmakers. Before entering, please confirm
            that you will review your oils, alkali type, fragrance limits, and process choices
            before making a live batch.
          </p>

          <div className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-5">
            <label className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4 text-sm leading-6 text-[var(--text)]">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                className="mt-1 h-4 w-4 accent-[var(--accent)]"
              />
              <span>
                I understand this tool helps me calculate a recipe, but I am still responsible for
                verifying my formula and safe usage before making soap.
              </span>
            </label>

            <div className="mt-4 space-y-3">
              <TurnstileWidget
                siteKey={TURNSTILE_SITE_KEY}
                resetKey={turnstileResetKey}
                theme="auto"
                onToken={handleTurnstileToken}
                onExpired={handleTurnstileExpired}
                onError={handleTurnstileError}
              />

              {turnstileMessage ? (
                <p
                  className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                    turnstileStatus === "failed"
                      ? "warning-card"
                      : "border border-[var(--border)] bg-[var(--surface-strong)] text-[var(--text-soft)]"
                  }`}
                >
                  {turnstileMessage}
                </p>
              ) : null}

              <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() =>
                    resetTurnstileState("Verification reset. Please complete the check again.")
                  }
                  className="pill-toggle pill-toggle--quiet rounded-2xl px-4 py-3 text-sm font-medium"
                >
                  Reset verification
                </button>
                {!TURNSTILE_SITE_KEY ? (
                  <p className="text-sm text-[var(--warning)]">
                    Developer note: add the public Turnstile site key before opening the
                    calculator.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end border-t border-[var(--border)] pt-5">
            <button
              type="button"
              onClick={onEnter}
              disabled={!canEnter}
              className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Enter Calculator
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
