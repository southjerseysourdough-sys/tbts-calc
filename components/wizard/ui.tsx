"use client";

import { CSSProperties, ElementType, ReactNode, useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { RecipeState, SoapCalculationResult, Unit } from "@/lib/types";
import { formatPercent, formatWeight, roundTo } from "@/lib/calculations";

export type WizardStepId = "batch" | "oils" | "water" | "lye" | "review";

export const WIZARD_STEPS: { id: WizardStepId; title: string; subtitle: string }[] = [
  {
    id: "batch",
    title: "Batch Setup",
    subtitle: "Name the recipe and define the basic batch size.",
  },
  {
    id: "oils",
    title: "Oil Composition",
    subtitle: "Build your oil profile by percent or by weight.",
  },
  {
    id: "water",
    title: "Water Settings",
    subtitle: "Choose the liquid method that matches your workflow.",
  },
  {
    id: "lye",
    title: "Lye and Additives",
    subtitle: "Select the alkali and set fragrance loading.",
  },
  {
    id: "review",
    title: "Review Recipe",
    subtitle: "Read the full summary and warnings before final output.",
  },
];

type RevealSectionProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
  delay?: number;
  reducedMotion: boolean;
};

export function RevealSection<T extends ElementType = "section">({
  as,
  children,
  className,
  delay = 0,
  reducedMotion,
}: RevealSectionProps<T>) {
  const Component = (as ?? "section") as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      setIsVisible(true);
      return;
    }

    const node = ref.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }

        setIsVisible(true);
        observer.disconnect();
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -12% 0px",
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <Component
      ref={ref}
      className={`motion-reveal ${className ?? ""}`.trim()}
      data-visible={isVisible}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Component>
  );
}

export function formatRecipeWeight(value: number, unit: Unit) {
  return `${formatWeight(value, unit)} ${unit}`;
}

export function getStepIndex(stepId: WizardStepId) {
  return WIZARD_STEPS.findIndex((step) => step.id === stepId);
}

export function StepIndicator({
  currentStep,
  onSelect,
}: {
  currentStep: WizardStepId;
  onSelect: (step: WizardStepId) => void;
}) {
  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="control-cluster rounded-[1.6rem] p-3">
      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-5">
        {WIZARD_STEPS.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = index < currentIndex;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onSelect(step.id)}
              className="pill-toggle flex min-h-20 flex-col items-start justify-between rounded-3xl px-4 py-3 text-left"
              data-active={isActive}
            >
              <span className="text-[0.72rem] uppercase tracking-[0.18em] text-[var(--text-soft)]">
                {isCompleted ? "Complete" : `Step ${index + 1}`}
              </span>
              <span className="text-sm font-semibold text-[var(--text)]">{step.title}</span>
              <span className="text-xs text-[var(--text-soft)]">{step.subtitle}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="dot-leader-row text-sm text-[var(--text-soft)]">
      <span>{label}</span>
      <span className="font-semibold text-[var(--text)]">{value}</span>
    </div>
  );
}

export function StepNavigation({
  canGoBack,
  backLabel = "Back",
  nextLabel = "Continue",
  onBack,
  onNext,
  nextDisabled,
}: {
  canGoBack: boolean;
  backLabel?: string;
  nextLabel?: string;
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-6 flex flex-col gap-3 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        onClick={onBack}
        disabled={!canGoBack}
        className="pill-toggle pill-toggle--quiet rounded-2xl px-5 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-45"
      >
        {backLabel}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {nextLabel}
      </button>
    </div>
  );
}

function SocialIcon({
  children,
  label,
  href,
}: {
  children: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="pill-toggle social-button inline-flex h-11 w-11 items-center justify-center rounded-2xl"
    >
      <span className="h-5 w-5">{children}</span>
    </a>
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <div className="theme-toggle" role="group" aria-label="Color theme">
      <button
        type="button"
        onClick={() => setTheme("light")}
        className="theme-toggle__option"
        data-active={resolvedTheme === "light"}
        aria-pressed={resolvedTheme === "light"}
      >
        <span className="theme-toggle__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path
              d="M12 3v2.25M12 18.75V21M4.93 4.93l1.6 1.6M17.47 17.47l1.6 1.6M3 12h2.25M18.75 12H21M4.93 19.07l1.6-1.6M17.47 6.53l1.6-1.6"
              strokeLinecap="round"
            />
            <circle cx="12" cy="12" r="4.25" />
          </svg>
        </span>
        <span>Light</span>
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className="theme-toggle__option"
        data-active={resolvedTheme === "dark"}
        aria-pressed={resolvedTheme === "dark"}
      >
        <span className="theme-toggle__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.77 15.12A8.26 8.26 0 0 1 8.88 3.23a.75.75 0 0 0-.94-.94A9.76 9.76 0 1 0 21.71 16.06a.75.75 0 0 0-.94-.94Z" />
          </svg>
        </span>
        <span>Dark</span>
      </button>
    </div>
  );
}

export function ShareModule({ shareUrl, shareText }: { shareUrl: string; shareText: string }) {
  return (
    <div className="share-module rounded-3xl border p-4 md:min-w-72">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">
        Share this calculator
      </p>
      <div className="share-module__actions mt-3 flex flex-wrap gap-2 rounded-[1.25rem] p-2">
        <SocialIcon
          label="Share on Facebook"
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.5 21v-8.1h2.7l.4-3.2h-3.1V7.66c0-.93.26-1.56 1.59-1.56H16.6V3.24c-.27-.04-1.2-.12-2.28-.12-2.25 0-3.79 1.37-3.79 3.89v2.16H8v3.2h2.53V21h2.97Z" />
          </svg>
        </SocialIcon>
        <SocialIcon
          label="Share on X"
          href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.9 2H22l-6.77 7.74L23 22h-6.1l-4.78-6.97L6.02 22H2.9l7.24-8.27L1 2h6.26l4.32 6.32L18.9 2Zm-1.07 18h1.7L6.33 3.9H4.5L17.83 20Z" />
          </svg>
        </SocialIcon>
        <SocialIcon
          label="Share on Pinterest"
          href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&description=${encodeURIComponent(shareText)}`}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a10 10 0 0 0-3.64 19.31c-.05-1.64-.01-3.61.43-5.46l1.33-5.63S9.8 9.58 9.8 8.66c0-1.42.82-2.48 1.85-2.48.87 0 1.29.65 1.29 1.43 0 .87-.55 2.18-.84 3.39-.24 1.01.51 1.83 1.51 1.83 1.82 0 3.04-2.34 3.04-5.12 0-2.11-1.42-3.69-4.01-3.69-2.92 0-4.74 2.18-4.74 4.62 0 .84.25 1.44.65 1.9.18.21.21.29.14.53-.05.18-.15.6-.2.77-.07.26-.28.35-.52.25-1.46-.59-2.14-2.18-2.14-3.97 0-2.96 2.49-6.52 7.44-6.52 3.98 0 6.6 2.88 6.6 5.97 0 4.09-2.27 7.14-5.62 7.14-1.12 0-2.16-.61-2.52-1.29l-.69 2.73c-.42 1.7-1.25 3.4-2.01 4.72A10 10 0 1 0 12 2Z" />
          </svg>
        </SocialIcon>
        <SocialIcon
          label="Share by email"
          href={`mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(`Take a look at the Tallow Be Thy Soap Lab calculator: ${shareUrl}`)}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16v12H4z" />
            <path d="m4 7 8 6 8-6" />
          </svg>
        </SocialIcon>
      </div>
    </div>
  );
}

export function PrintRecipeCard({
  recipe,
  result,
  getWaterModeLabel,
}: {
  recipe: RecipeState;
  result: SoapCalculationResult;
  getWaterModeLabel: (recipe: RecipeState, result: SoapCalculationResult) => string;
}) {
  return (
    <section className="recipe-print-card">
      <p className="print-eyebrow">Tallow Be Thy Soap Lab</p>
      <h1 className="print-title">{recipe.recipeName}</h1>
      <p className="print-subtitle">Guided cold process soap recipe card</p>

      <div className="print-section">
        <h2>Batch overview</h2>
        <div className="print-grid">
          <div>
            <span>Total oils</span>
            <strong>{formatRecipeWeight(result.totals.oilWeight, recipe.unit)}</strong>
          </div>
          <div>
            <span>Superfat</span>
            <strong>{formatPercent(recipe.superfat)}%</strong>
          </div>
          <div>
            <span>Alkali</span>
            <strong>{formatRecipeWeight(result.lye.displayAmount, recipe.unit)} {result.lye.label}</strong>
          </div>
          <div>
            <span>Water setting</span>
            <strong>{getWaterModeLabel(recipe, result)}</strong>
          </div>
          <div>
            <span>Fragrance</span>
            <strong>{formatRecipeWeight(result.totals.fragranceWeight, recipe.unit)}</strong>
          </div>
          <div>
            <span>Total batch</span>
            <strong>{formatRecipeWeight(result.totals.totalBatch, recipe.unit)}</strong>
          </div>
        </div>
      </div>

      <div className="print-section">
        <h2>Oil breakdown</h2>
        <div className="space-y-2">
          {result.oils.map((oil) => (
            <div key={oil.oilId} className="dot-leader-row print-row">
              <span>{oil.name} ({formatPercent(oil.percent)}%)</span>
              <span>{formatRecipeWeight(oil.weight, recipe.unit)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="print-section">
        <h2>Solution and additives</h2>
        <div className="space-y-2">
          <div className="dot-leader-row print-row">
            <span>{result.lye.label}</span>
            <span>{formatRecipeWeight(result.lye.displayAmount, recipe.unit)}</span>
          </div>
          <div className="dot-leader-row print-row">
            <span>Water</span>
            <span>{formatRecipeWeight(result.totals.waterAmount, recipe.unit)}</span>
          </div>
          <div className="dot-leader-row print-row">
            <span>Fragrance</span>
            <span>{formatRecipeWeight(result.totals.fragranceWeight, recipe.unit)}</span>
          </div>
        </div>
      </div>

      <div className="print-section">
        <h2>Soap qualities</h2>
        <div className="print-grid">
          {Object.entries(result.qualities).map(([key, value]) => (
            <div key={key}>
              <span>{key}</span>
              <strong>{roundTo(value, 2).toFixed(2)}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="print-section">
        <h2>Warnings and notes</h2>
        {result.warnings.length === 0 ? (
          <p className="print-note">No warning flags.</p>
        ) : (
          <ul className="print-list">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
