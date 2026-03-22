"use client";

import { ShareModule, ThemeToggle } from "@/components/wizard/ui";

const HOMEPAGE_URL = "https://tallowbethysoap.com/";
const SHARE_URL = "https://calc.tallowbethysoap.com/";
const SHARE_TEXT = "Tallow Be Thy Soap Lab | Guided cold process soap calculator";

export function AppHeader() {
  return (
    <header className="mx-auto max-w-6xl px-4 pt-8">
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
              Guided Soap Calculator
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--text)] md:text-5xl">
              Tallow Be Thy Soap Lab
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-soft)]">
              Build, review, and refine artisan cold process soap recipes with a warm, guided workflow.
            </p>
          </div>
          <ShareModule shareUrl={SHARE_URL} shareText={SHARE_TEXT} />
        </div>
      </section>
    </header>
  );
}
