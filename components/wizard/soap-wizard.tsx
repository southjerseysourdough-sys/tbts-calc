"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { DisclaimerModal } from "@/components/disclaimer-modal";
import { Footer } from "@/components/footer";
import { Field } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { Stat } from "@/components/ui/stat";
import { TextInput } from "@/components/ui/text-input";
import {
  calculateRecipe,
  clamp,
  deriveWaterSettingsFromCurrent,
  formatPercent,
  formatRatio,
  formatWeight,
  normalizePercentages,
  parseLooseNumber,
  parseRatioInput,
  roundTo,
} from "@/lib/calculations";
import { DEFAULT_RECIPE, EMPTY_RECIPE, FEATURED_OIL_IDS, SAMPLE_RECIPE, STORAGE_KEY } from "@/lib/defaults";
import { OIL_MAP } from "@/lib/oil-data";
import { EntryMode, LyeType, RecipeState, SoapCalculationResult, Unit, WaterMode } from "@/lib/types";
import {
  formatRecipeWeight,
  getStepIndex,
  PrintRecipeCard,
  RevealSection,
  ShareModule,
  StepIndicator,
  StepNavigation,
  SummaryRow,
  ThemeToggle,
  WIZARD_STEPS,
  WizardStepId,
} from "@/components/wizard/ui";

type OilDraftMap = Record<string, { percent: string; weight: string }>;

type TopLevelDrafts = {
  recipeName: string;
  totalOilWeight: string;
  superfat: string;
  waterPercentOfOils: string;
  lyeConcentration: string;
  waterLyeRatio: string;
  fragranceLoad: string;
};

const OUNCES_TO_GRAMS = 28.349523125;
const HOMEPAGE_URL = "https://tallowbethysoap.com/";
const SHARE_URL = "https://calc.tallowbethysoap.com/";
const SHARE_TEXT = "Tallow Be Thy Soap Lab | Guided cold process soap calculator";
const DISCLAIMER_KEY = "tallow-be-thy-soap-disclaimer-accepted";

const LYE_OPTIONS: { value: LyeType; label: string }[] = [
  { value: "naoh", label: "NaOH" },
  { value: "koh", label: "KOH" },
  { value: "koh90", label: "90% KOH" },
];

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

function usePageLoaded(reducedMotion: boolean) {
  const [isLoaded, setIsLoaded] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      setIsLoaded(true);
      return;
    }

    const frame = window.requestAnimationFrame(() => setIsLoaded(true));
    return () => window.cancelAnimationFrame(frame);
  }, [reducedMotion]);

  return isLoaded;
}

function trimTrailingZeros(value: string) {
  return value.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

function makeOilDrafts(recipe: RecipeState) {
  const drafts: OilDraftMap = {};
  for (const oil of recipe.oils) {
    drafts[oil.id] = {
      percent: trimTrailingZeros(formatPercent(oil.percent)),
      weight: trimTrailingZeros(formatWeight(recipe.totalOilWeight * (oil.percent / 100), recipe.unit)),
    };
  }
  return drafts;
}

function makeTopLevelDrafts(recipe: RecipeState): TopLevelDrafts {
  return {
    recipeName: recipe.recipeName,
    totalOilWeight: trimTrailingZeros(formatWeight(recipe.totalOilWeight, recipe.unit)),
    superfat: trimTrailingZeros(formatPercent(recipe.superfat)),
    waterPercentOfOils: trimTrailingZeros(formatPercent(recipe.water.percentOfOils)),
    lyeConcentration: trimTrailingZeros(formatPercent(recipe.water.lyeConcentration * 100)),
    waterLyeRatio: formatRatio(recipe.water.waterLyeRatio),
    fragranceLoad: trimTrailingZeros(formatPercent(recipe.fragranceLoad)),
  };
}

function parseStoredRecipe(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as RecipeState;
  } catch {
    return null;
  }
}

function sanitizeRecipe(input: Partial<RecipeState> | null | undefined): RecipeState {
  return {
    recipeName:
      typeof input?.recipeName === "string" && input.recipeName.trim()
        ? input.recipeName
        : DEFAULT_RECIPE.recipeName,
    totalOilWeight:
      typeof input?.totalOilWeight === "number" && Number.isFinite(input.totalOilWeight)
        ? Math.max(input.totalOilWeight, 0)
        : DEFAULT_RECIPE.totalOilWeight,
    unit: input?.unit === "oz" ? "oz" : "g",
    superfat:
      typeof input?.superfat === "number" && Number.isFinite(input.superfat)
        ? clamp(input.superfat, 0, 20)
        : DEFAULT_RECIPE.superfat,
    water: {
      mode:
        input?.water?.mode === "percentOfOils" ||
        input?.water?.mode === "waterLyeRatio" ||
        input?.water?.mode === "lyeConcentration"
          ? input.water.mode
          : DEFAULT_RECIPE.water.mode,
      percentOfOils:
        typeof input?.water?.percentOfOils === "number" && Number.isFinite(input.water.percentOfOils)
          ? clamp(input.water.percentOfOils, 0, 100)
          : DEFAULT_RECIPE.water.percentOfOils,
      lyeConcentration:
        typeof input?.water?.lyeConcentration === "number" && Number.isFinite(input.water.lyeConcentration)
          ? clamp(input.water.lyeConcentration, 0.1, 0.95)
          : DEFAULT_RECIPE.water.lyeConcentration,
      waterLyeRatio:
        typeof input?.water?.waterLyeRatio === "number" && Number.isFinite(input.water.waterLyeRatio)
          ? clamp(input.water.waterLyeRatio, 0.5, 5)
          : DEFAULT_RECIPE.water.waterLyeRatio,
    },
    lyeType:
      input?.lyeType === "koh" || input?.lyeType === "koh90" || input?.lyeType === "naoh"
        ? input.lyeType
        : DEFAULT_RECIPE.lyeType,
    fragranceLoad:
      typeof input?.fragranceLoad === "number" && Number.isFinite(input.fragranceLoad)
        ? Math.max(input.fragranceLoad, 0)
        : DEFAULT_RECIPE.fragranceLoad,
    oils:
      Array.isArray(input?.oils) && input.oils.length > 0
        ? input.oils
            .filter((oil) => typeof oil?.id === "string" && typeof oil?.percent === "number")
            .map((oil) => ({ id: oil.id, percent: Math.max(oil.percent, 0) }))
        : DEFAULT_RECIPE.oils,
  };
}

function getWaterModeLabel(recipe: RecipeState, result: SoapCalculationResult) {
  switch (recipe.water.mode) {
    case "percentOfOils":
      return `${formatPercent(result.totals.waterPercentOfOils)}% of oils`;
    case "lyeConcentration":
      return `${formatPercent(result.totals.lyeConcentration * 100)}% lye concentration`;
    case "waterLyeRatio":
      return `${formatRatio(result.totals.waterLyeRatio)} water : lye`;
  }
}

export function SoapWizard() {
  const reducedMotion = usePrefersReducedMotion();
  const pageLoaded = usePageLoaded(reducedMotion);
  const [draftRecipe, setDraftRecipe] = useState<RecipeState>(DEFAULT_RECIPE);
  const [finalizedRecipe, setFinalizedRecipe] = useState<RecipeState | null>(null);
  const [entryMode, setEntryMode] = useState<EntryMode>("percent");
  const [newOilId, setNewOilId] = useState<string>(FEATURED_OIL_IDS[0]);
  const [topLevelDrafts, setTopLevelDrafts] = useState<TopLevelDrafts>(() => makeTopLevelDrafts(DEFAULT_RECIPE));
  const [oilDrafts, setOilDrafts] = useState<OilDraftMap>(() => makeOilDrafts(DEFAULT_RECIPE));
  const [currentStep, setCurrentStep] = useState<WizardStepId>("batch");
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [disclaimerReady, setDisclaimerReady] = useState(false);
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState(false);
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });

  const featuredOilOptions = useMemo(
    () =>
      FEATURED_OIL_IDS.map((id) => OIL_MAP.get(id)).filter(
        (oil): oil is NonNullable<(typeof OIL_MAP extends Map<string, infer V> ? V : never)> =>
          Boolean(oil),
      ),
    [],
  );
  const draftResult = useMemo(() => calculateRecipe(draftRecipe), [draftRecipe]);
  const finalResult = useMemo(() => (finalizedRecipe ? calculateRecipe(finalizedRecipe) : null), [finalizedRecipe]);
  const currentStepIndex = getStepIndex(currentStep);
  const currentStepMeta = WIZARD_STEPS[currentStepIndex];
  const totalPercentDifference = roundTo(100 - draftResult.totals.percent, 2);
  const isDisclaimerOpen = disclaimerReady && !hasAcceptedDisclaimer;

  const syncDraftsFromRecipe = (nextRecipe: RecipeState) => {
    setTopLevelDrafts(makeTopLevelDrafts(nextRecipe));
    setOilDrafts(makeOilDrafts(nextRecipe));
  };

  const updateDraft = (updater: (current: RecipeState) => RecipeState) => {
    setDraftRecipe((current) => updater(current));
  };

  useEffect(() => {
    try {
      const storedRecipe = parseStoredRecipe(window.localStorage.getItem(STORAGE_KEY));
      if (storedRecipe) {
        const nextRecipe = sanitizeRecipe(storedRecipe);
        setDraftRecipe(nextRecipe);
        syncDraftsFromRecipe(nextRecipe);
      }
      setHasAcceptedDisclaimer(window.localStorage.getItem(DISCLAIMER_KEY) === "true");
    } catch {
      setHasAcceptedDisclaimer(false);
    } finally {
      setDisclaimerReady(true);
    }
  }, []);

  useEffect(() => {
    if (!disclaimerReady) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draftRecipe));
    } catch {
      // Ignore local storage issues.
    }
  }, [disclaimerReady, draftRecipe]);

  useEffect(() => {
    if (!isSummaryOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSummaryOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSummaryOpen]);

  useEffect(() => {
    if (reducedMotion) {
      setParallaxOffset({ x: 0, y: 0 });
      return;
    }

    let frame = 0;

    const handlePointerMove = (event: PointerEvent) => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      frame = window.requestAnimationFrame(() => {
        const x = ((event.clientX / window.innerWidth) - 0.5) * 14;
        const y = ((event.clientY / window.innerHeight) - 0.5) * 10;
        setParallaxOffset({ x, y });
      });
    };

    const handlePointerLeave = () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      frame = window.requestAnimationFrame(() => setParallaxOffset({ x: 0, y: 0 }));
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [reducedMotion]);

  const handleRecipeName = (value: string) => {
    setTopLevelDrafts((current) => ({ ...current, recipeName: value }));
    updateDraft((current) => ({ ...current, recipeName: value }));
  };

  const handleTotalOilWeightChange = (value: string) => {
    setTopLevelDrafts((current) => ({ ...current, totalOilWeight: value }));
    const parsed = parseLooseNumber(value);
    if (parsed === null) {
      return;
    }
    updateDraft((current) => ({
      ...current,
      totalOilWeight: current.unit === "g" ? Math.max(parsed, 0) : Math.max(parsed, 0) * OUNCES_TO_GRAMS,
    }));
  };

  const handleSuperfatChange = (value: string) => {
    setTopLevelDrafts((current) => ({ ...current, superfat: value }));
    const parsed = parseLooseNumber(value);
    if (parsed === null) {
      return;
    }
    updateDraft((current) => ({ ...current, superfat: clamp(parsed, 0, 20) }));
  };

  const handleFragranceLoadChange = (value: string) => {
    setTopLevelDrafts((current) => ({ ...current, fragranceLoad: value }));
    const parsed = parseLooseNumber(value);
    if (parsed === null) {
      return;
    }
    updateDraft((current) => ({ ...current, fragranceLoad: Math.max(parsed, 0) }));
  };

  const normalizeTopLevelBlur = () => {
    syncDraftsFromRecipe(draftRecipe);
  };

  const updateOilDraft = (oilId: string, key: "percent" | "weight", value: string) => {
    setOilDrafts((current) => ({
      ...current,
      [oilId]: {
        percent: current[oilId]?.percent ?? "",
        weight: current[oilId]?.weight ?? "",
        [key]: value,
      },
    }));
  };

  const handleOilPercentChangeAt = (index: number, value: string) => {
    const oilId = draftRecipe.oils[index]?.id ?? "";
    updateOilDraft(oilId || `blank-${index}`, "percent", value);
    const parsed = parseLooseNumber(value);
    if (parsed === null) {
      return;
    }
    updateDraft((current) => ({
      ...current,
      oils: current.oils.map((oil, oilIndex) =>
        oilIndex === index ? { ...oil, percent: Math.max(parsed, 0) } : oil,
      ),
    }));
  };

  const handleOilWeightChangeAt = (index: number, value: string) => {
    const oilId = draftRecipe.oils[index]?.id ?? "";
    updateOilDraft(oilId || `blank-${index}`, "weight", value);
    const parsed = parseLooseNumber(value);
    if (parsed === null) {
      return;
    }
    updateDraft((current) => {
      const weightInGrams = current.unit === "g" ? parsed : parsed * OUNCES_TO_GRAMS;
      const percent = current.totalOilWeight > 0 ? (weightInGrams / current.totalOilWeight) * 100 : 0;
      return {
        ...current,
        oils: current.oils.map((oil, oilIndex) =>
          oilIndex === index ? { ...oil, percent: Math.max(percent, 0) } : oil,
        ),
      };
    });
  };

  const handleOilSelectionChange = (index: number, currentOilId: string, nextOilId: string) => {
    if (!nextOilId) {
      return;
    }

    updateDraft((current) => ({
      ...current,
      oils: current.oils.map((oil, oilIndex) =>
        oilIndex === index ? { ...oil, id: nextOilId } : oil,
      ),
    }));

    setOilDrafts((current) => {
      const next = { ...current };
      const sourceKey = currentOilId || `blank-${index}`;
      next[nextOilId] = next[sourceKey] ?? { percent: "", weight: "" };
      if (sourceKey !== nextOilId) {
        delete next[sourceKey];
      }
      return next;
    });
  };

  const normalizeOilBlurAt = (index: number) => {
    const oil = draftRecipe.oils[index];
    if (!oil) {
      return;
    }
    const key = oil.id || `blank-${index}`;
    setOilDrafts((current) => ({
      ...current,
      [key]: {
        percent: trimTrailingZeros(formatPercent(oil.percent)),
        weight: trimTrailingZeros(formatWeight(draftRecipe.totalOilWeight * (oil.percent / 100), draftRecipe.unit)),
      },
    }));
  };

  const handleUnitChange = (unit: Unit) => {
    const nextRecipe = { ...draftRecipe, unit };
    setDraftRecipe(nextRecipe);
    syncDraftsFromRecipe(nextRecipe);
  };

  const handleWaterModeChange = (mode: WaterMode) => {
    const nextWater = deriveWaterSettingsFromCurrent(mode, draftResult);
    const nextRecipe = { ...draftRecipe, water: nextWater };
    setDraftRecipe(nextRecipe);
    syncDraftsFromRecipe(nextRecipe);
  };

  const handleWaterValueChange = (mode: WaterMode, value: string) => {
    if (mode === "percentOfOils") {
      setTopLevelDrafts((current) => ({ ...current, waterPercentOfOils: value }));
      const parsed = parseLooseNumber(value);
      if (parsed !== null) {
        updateDraft((current) => ({ ...current, water: { ...current.water, percentOfOils: clamp(parsed, 0, 100) } }));
      }
      return;
    }

    if (mode === "lyeConcentration") {
      setTopLevelDrafts((current) => ({ ...current, lyeConcentration: value }));
      const parsed = parseLooseNumber(value);
      if (parsed !== null) {
        updateDraft((current) => ({ ...current, water: { ...current.water, lyeConcentration: clamp(parsed / 100, 0.1, 0.95) } }));
      }
      return;
    }

    setTopLevelDrafts((current) => ({ ...current, waterLyeRatio: value }));
    const parsed = parseRatioInput(value);
    if (parsed !== null) {
      updateDraft((current) => ({ ...current, water: { ...current.water, waterLyeRatio: clamp(parsed, 0.5, 5) } }));
    }
  };

  const addOil = () => {
    if (!newOilId) {
      return;
    }
    setDraftRecipe((current) => ({ ...current, oils: [...current.oils, { id: newOilId, percent: 0 }] }));
    setOilDrafts((current) => ({ ...current, [newOilId]: { percent: "", weight: "" } }));
  };

  const removeOilAt = (index: number) => {
    const oilId = draftRecipe.oils[index]?.id ?? "";
    setDraftRecipe((current) => ({
      ...current,
      oils: current.oils.filter((_, oilIndex) => oilIndex !== index),
    }));
    setOilDrafts((current) => {
      const next = { ...current };
      delete next[oilId];
      delete next[`blank-${index}`];
      return next;
    });
  };

  const normalizeFormula = () => {
    const nextRecipe = { ...draftRecipe, oils: normalizePercentages(draftRecipe.oils) };
    setDraftRecipe(nextRecipe);
    syncDraftsFromRecipe(nextRecipe);
  };

  const loadSample = () => {
    setDraftRecipe(SAMPLE_RECIPE);
    setFinalizedRecipe(null);
    setEntryMode("percent");
    setCurrentStep("batch");
    syncDraftsFromRecipe(SAMPLE_RECIPE);
  };

  const resetWizard = () => {
    setDraftRecipe(EMPTY_RECIPE);
    setFinalizedRecipe(null);
    setEntryMode("percent");
    setCurrentStep("batch");
    setNewOilId(FEATURED_OIL_IDS[0]);
    syncDraftsFromRecipe(EMPTY_RECIPE);
  };

  const stepForward = () => {
    if (currentStep === "review") {
      setFinalizedRecipe(sanitizeRecipe(draftRecipe));
    }

    if (currentStepIndex < WIZARD_STEPS.length - 1) {
      setCurrentStep(WIZARD_STEPS[currentStepIndex + 1].id);
    }
  };

  const stepBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(WIZARD_STEPS[currentStepIndex - 1].id);
    }
  };

  const handleAcceptDisclaimer = () => {
    window.localStorage.setItem(DISCLAIMER_KEY, "true");
    setHasAcceptedDisclaimer(true);
    setDisclaimerChecked(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const availableOilOptions = featuredOilOptions.filter(
    (oil) => !draftRecipe.oils.some((entry) => entry.id === oil.id),
  );

  const renderBatchStep = () => (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Recipe name">
          <TextInput value={topLevelDrafts.recipeName} onChange={(event) => handleRecipeName(event.target.value)} placeholder="Weekend Tallow Bar" />
        </Field>
        <Field label="Unit">
          <div className="control-cluster grid grid-cols-2 gap-2 rounded-[1.4rem] p-2">
            {(["g", "oz"] as const).map((unit) => (
              <button key={unit} type="button" className="pill-toggle rounded-2xl px-4 py-3 text-sm font-medium uppercase" data-active={draftRecipe.unit === unit} onClick={() => handleUnitChange(unit)}>
                {unit}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Total oils" hint={draftRecipe.unit === "g" ? "grams" : "ounces"}>
          <TextInput inputMode="decimal" value={topLevelDrafts.totalOilWeight} onChange={(event) => handleTotalOilWeightChange(event.target.value)} onBlur={normalizeTopLevelBlur} suffix={draftRecipe.unit} />
        </Field>
        <Field label="Superfat">
          <TextInput inputMode="decimal" value={topLevelDrafts.superfat} onChange={(event) => handleSuperfatChange(event.target.value)} onBlur={normalizeTopLevelBlur} suffix="%" />
        </Field>
      </div>
      <StepNavigation canGoBack={false} backLabel="At start" onBack={() => undefined} onNext={stepForward} nextLabel="Continue to Oil Composition" />
    </>
  );

  const renderWaterStep = () => (
    <>
      <Field label="Water method">
        <SegmentedControl
          value={draftRecipe.water.mode}
          onChange={handleWaterModeChange}
          options={[
            { value: "percentOfOils", label: "Water as % of oils" },
            { value: "lyeConcentration", label: "Lye concentration" },
            { value: "waterLyeRatio", label: "Water : lye ratio" },
          ]}
        />
      </Field>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Field label="Water as % of oils">
          <TextInput inputMode="decimal" value={topLevelDrafts.waterPercentOfOils} onChange={(event) => handleWaterValueChange("percentOfOils", event.target.value)} onBlur={normalizeTopLevelBlur} suffix="%" />
        </Field>
        <Field label="Lye concentration">
          <TextInput inputMode="decimal" value={topLevelDrafts.lyeConcentration} onChange={(event) => handleWaterValueChange("lyeConcentration", event.target.value)} onBlur={normalizeTopLevelBlur} suffix="%" />
        </Field>
        <Field label="Water : lye ratio">
          <TextInput inputMode="text" value={topLevelDrafts.waterLyeRatio} onChange={(event) => handleWaterValueChange("waterLyeRatio", event.target.value)} onBlur={normalizeTopLevelBlur} placeholder="2:1 or 1.8" />
        </Field>
      </div>
      <div className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
        <p className="text-sm text-[var(--text-soft)]">
          Current water amount: <strong className="text-[var(--text)]">{formatRecipeWeight(draftResult.totals.waterAmount, draftRecipe.unit)}</strong>
        </p>
      </div>
      <StepNavigation canGoBack onBack={stepBack} onNext={stepForward} nextLabel="Continue to Lye and Additives" />
    </>
  );

  const renderLyeStep = () => (
    <>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-5">
          <Field label="Alkali type">
            <SegmentedControl value={draftRecipe.lyeType} onChange={(value) => updateDraft((current) => ({ ...current, lyeType: value }))} options={LYE_OPTIONS} />
          </Field>
          <Field label="Fragrance loading" hint="grams per kilogram of oils">
            <TextInput inputMode="decimal" value={topLevelDrafts.fragranceLoad} onChange={(event) => handleFragranceLoadChange(event.target.value)} onBlur={normalizeTopLevelBlur} suffix="g/kg" />
          </Field>
        </div>
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Live solution preview</p>
          <div className="mt-4 space-y-3">
            <SummaryRow label={draftResult.lye.label} value={formatRecipeWeight(draftResult.lye.displayAmount, draftRecipe.unit)} />
            <SummaryRow label="Pure alkali basis" value={formatRecipeWeight(draftResult.lye.pureAmount, draftRecipe.unit)} />
            <SummaryRow label="Water" value={formatRecipeWeight(draftResult.totals.waterAmount, draftRecipe.unit)} />
            <SummaryRow label="Fragrance" value={formatRecipeWeight(draftResult.totals.fragranceWeight, draftRecipe.unit)} />
            <SummaryRow label="Water setting" value={getWaterModeLabel(draftRecipe, draftResult)} />
          </div>
        </div>
      </div>
      <StepNavigation canGoBack onBack={stepBack} onNext={stepForward} nextLabel="Continue to Review" />
    </>
  );

  const renderOilStep = () => (
    <>
      <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <Field label="Add oil">
          <Select value={newOilId} onChange={(event) => setNewOilId(event.target.value)}>
            {availableOilOptions.length === 0 ? <option value="">All featured oils added</option> : availableOilOptions.map((oil) => <option key={oil.id} value={oil.id}>{oil.name}</option>)}
          </Select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <button type="button" onClick={addOil} disabled={availableOilOptions.length === 0} className="rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-45">
            Add selected oil
          </button>
          <button type="button" onClick={normalizeFormula} className="pill-toggle pill-toggle--quiet rounded-2xl px-4 py-3 text-sm font-medium">
            Normalize to 100%
          </button>
        </div>
      </div>
      <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 md:flex-row md:items-end md:justify-between">
        <Field label="Entry mode" className="md:w-72">
          <div className="control-cluster grid grid-cols-2 gap-2 rounded-[1.4rem] p-2">
            {(["percent", "weight"] as const).map((mode) => (
              <button key={mode} type="button" className="pill-toggle rounded-2xl px-4 py-3 text-sm font-medium capitalize" data-active={entryMode === mode} onClick={() => setEntryMode(mode)}>
                {mode}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid gap-2 text-sm text-[var(--text-soft)]">
          <span>Total oils: <strong className="text-[var(--text)]">{formatRecipeWeight(draftResult.totals.oilWeight, draftRecipe.unit)}</strong></span>
          <span>Percent total: <strong className="text-[var(--text)]">{formatPercent(draftResult.totals.percent)}%</strong></span>
          {Math.abs(totalPercentDifference) > 0.01 ? (
            <span className="text-[var(--warning)]">{totalPercentDifference > 0 ? "Missing" : "Over by"} {Math.abs(totalPercentDifference).toFixed(2)}%</span>
          ) : (
            <span className="text-[var(--accent-strong)]">Balanced at 100%</span>
          )}
        </div>
      </div>
      <div className="table-grid">
        {draftRecipe.oils.map((oil, index) => {
          const definition = OIL_MAP.get(oil.id);
          const draftKey = oil.id || `blank-${index}`;
          const draft = oilDrafts[oil.id] ?? oilDrafts[draftKey] ?? { percent: "", weight: "" };
          const selectableOils = featuredOilOptions.filter(
            (option): option is NonNullable<(typeof featuredOilOptions)[number]> =>
              Boolean(option) && (option.id === oil.id || !draftRecipe.oils.some((entry) => entry.id === option.id && entry.id !== oil.id)),
          );

          return (
            <div key={`${oil.id || "blank"}-${index}`} className="rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.85fr)_minmax(0,0.85fr)_auto] md:items-end">
                <div>
                  <p className="mb-2 text-sm font-medium text-[var(--text)]">Oil</p>
                  <Select value={oil.id} onChange={(event) => handleOilSelectionChange(index, oil.id, event.target.value)}>
                    <option value="">Choose an oil</option>
                    {selectableOils.map((option) => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </Select>
                  {definition ? <p className="mt-2 text-xs text-[var(--text-soft)]">SAP NaOH {definition.sapNaoh} / SAP KOH {definition.sapKoh}</p> : null}
                </div>
                <Field label="Percent">
                  <TextInput inputMode="decimal" value={entryMode === "weight" ? trimTrailingZeros(formatPercent(oil.percent)) : draft.percent} onChange={(event) => handleOilPercentChangeAt(index, event.target.value)} onBlur={() => normalizeOilBlurAt(index)} suffix="%" />
                </Field>
                <Field label={`Weight (${draftRecipe.unit})`}>
                  <TextInput inputMode="decimal" value={entryMode === "percent" ? trimTrailingZeros(formatWeight(draftRecipe.totalOilWeight * (oil.percent / 100), draftRecipe.unit)) : draft.weight} onChange={(event) => handleOilWeightChangeAt(index, event.target.value)} onBlur={() => normalizeOilBlurAt(index)} suffix={draftRecipe.unit} />
                </Field>
                <button type="button" onClick={() => removeOilAt(index)} className="pill-toggle pill-toggle--quiet rounded-2xl px-4 py-3 text-sm font-medium text-[var(--danger)]">
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <StepNavigation canGoBack onBack={stepBack} onNext={stepForward} nextLabel="Continue to Water Settings" />
    </>
  );

  const renderReviewStep = () => (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Total oils" value={formatRecipeWeight(draftResult.totals.oilWeight, draftRecipe.unit)} />
        <Stat label={draftResult.lye.label} value={formatRecipeWeight(draftResult.lye.displayAmount, draftRecipe.unit)} />
        <Stat label="Water" value={formatRecipeWeight(draftResult.totals.waterAmount, draftRecipe.unit)} />
        <Stat label="Fragrance" value={formatRecipeWeight(draftResult.totals.fragranceWeight, draftRecipe.unit)} hint={`${trimTrailingZeros(formatPercent(draftResult.totals.fragranceLoad))} g/kg`} />
        <Stat label="Total batch" value={formatRecipeWeight(draftResult.totals.totalBatch, draftRecipe.unit)} />
        <Stat label="Percent total" value={`${formatPercent(draftResult.totals.percent)}%`} hint={Math.abs(totalPercentDifference) > 0.01 ? "Needs balancing" : "Balanced at 100%"} />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Full recipe summary</p>
          <div className="mt-4 space-y-3">
            <SummaryRow label="Recipe name" value={draftRecipe.recipeName || "Untitled recipe"} />
            <SummaryRow label="Unit" value={draftRecipe.unit.toUpperCase()} />
            <SummaryRow label="Superfat" value={`${formatPercent(draftRecipe.superfat)}%`} />
            <SummaryRow label="Water method" value={getWaterModeLabel(draftRecipe, draftResult)} />
            <SummaryRow label="Fragrance loading" value={`${trimTrailingZeros(formatPercent(draftRecipe.fragranceLoad))} g/kg`} />
          </div>
          <div className="mt-5 space-y-2 border-t border-[var(--border)] pt-4">
            {draftResult.oils.map((oil) => (
              <SummaryRow key={oil.oilId} label={`${oil.name} (${formatPercent(oil.percent)}%)`} value={formatRecipeWeight(oil.weight, draftRecipe.unit)} />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Soap qualities</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {Object.entries(draftResult.qualities).map(([key, value]) => (
                <div key={key} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">{key}</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--text)]">{roundTo(value, 2).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Warnings</p>
            <div className="mt-4 space-y-3">
              {draftResult.warnings.length > 0 ? draftResult.warnings.map((warning) => (
                <div key={warning} className="warning-card rounded-2xl px-4 py-3 text-sm leading-6">{warning}</div>
              )) : (
                <p className="warning-empty rounded-2xl px-4 py-3 text-sm">No warning flags at the moment. This formula looks balanced and ready for final output.</p>
              )}
            </div>
          </div>
        </div>
      </div>
      <StepNavigation canGoBack onBack={stepBack} onNext={stepForward} nextLabel="Generate Recipe Output" />
    </>
  );

  const renderOutputStep = () => (
    finalizedRecipe && finalResult ? (
      <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Total oils" value={formatRecipeWeight(finalResult.totals.oilWeight, finalizedRecipe.unit)} />
          <Stat label={finalResult.lye.label} value={formatRecipeWeight(finalResult.lye.displayAmount, finalizedRecipe.unit)} />
          <Stat label="Water" value={formatRecipeWeight(finalResult.totals.waterAmount, finalizedRecipe.unit)} />
          <Stat label="Total batch" value={formatRecipeWeight(finalResult.totals.totalBatch, finalizedRecipe.unit)} />
        </div>
        <div className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Final recipe card</p>
          <h3 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text)]">{finalizedRecipe.recipeName}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">Ready for printing, saving as PDF, or editing. Use the step rail any time to refine the recipe and regenerate the output.</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Output summary</p>
              <div className="mt-4 space-y-3">
                <SummaryRow label="Superfat" value={`${formatPercent(finalizedRecipe.superfat)}%`} />
                <SummaryRow label="Water setting" value={getWaterModeLabel(finalizedRecipe, finalResult)} />
                <SummaryRow label="Fragrance loading" value={`${trimTrailingZeros(formatPercent(finalizedRecipe.fragranceLoad))} g/kg`} />
                <SummaryRow label="Fragrance amount" value={formatRecipeWeight(finalResult.totals.fragranceWeight, finalizedRecipe.unit)} />
              </div>
              <div className="mt-5 space-y-2 border-t border-[var(--border)] pt-4">
                {finalResult.oils.map((oil) => (
                  <SummaryRow key={oil.oilId} label={`${oil.name} (${formatPercent(oil.percent)}%)`} value={formatRecipeWeight(oil.weight, finalizedRecipe.unit)} />
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">Output actions</p>
              <div className="mt-4 grid gap-3">
                <button type="button" onClick={handlePrint} className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)]">Print / Save PDF</button>
                <button type="button" onClick={() => setCurrentStep("review")} className="pill-toggle pill-toggle--quiet rounded-2xl px-5 py-3 text-sm font-medium">Edit recipe</button>
                <button type="button" onClick={resetWizard} className="pill-toggle pill-toggle--quiet rounded-2xl px-5 py-3 text-sm font-medium">Start over</button>
              </div>
            </div>
          </div>
        </div>
        <StepNavigation canGoBack onBack={stepBack} onNext={handlePrint} nextLabel="Print / Save PDF" />
      </>
    ) : (
      <StepNavigation canGoBack onBack={stepBack} onNext={stepForward} nextLabel="Generate Recipe Output" />
    )
  );

  const renderLiveSummaryStrip = () => (
    <RevealSection reducedMotion={reducedMotion} as="div" delay={110} className="print-hidden">
      <div className="paper-card overflow-hidden p-4 md:p-5">
        <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--accent-strong)]">
              Live Batch Summary
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
              A compact pulse on the batch while the active step stays front and center.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsSummaryOpen(true)}
            className="pill-toggle pill-toggle--quiet inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium"
          >
            View full summary
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <Stat label="Total oils" value={formatRecipeWeight(draftResult.totals.oilWeight, draftRecipe.unit)} />
          <Stat label={draftResult.lye.label} value={formatRecipeWeight(draftResult.lye.displayAmount, draftRecipe.unit)} />
          <Stat label="Water" value={formatRecipeWeight(draftResult.totals.waterAmount, draftRecipe.unit)} />
          <Stat label="Fragrance" value={formatRecipeWeight(draftResult.totals.fragranceWeight, draftRecipe.unit)} hint={`${trimTrailingZeros(formatPercent(draftResult.totals.fragranceLoad))} g/kg`} />
          <Stat label="Total batch" value={formatRecipeWeight(draftResult.totals.totalBatch, draftRecipe.unit)} />
          <Stat label="Percent total" value={`${formatPercent(draftResult.totals.percent)}%`} hint={Math.abs(100 - draftResult.totals.percent) > 0.01 ? "Needs balancing" : "On target"} />
        </div>
      </div>
    </RevealSection>
  );

  return (
    <main
      className="lab-shell"
      data-loaded={pageLoaded}
      data-disclaimer-open={isDisclaimerOpen}
      style={{ "--parallax-x": `${parallaxOffset.x}px`, "--parallax-y": `${parallaxOffset.y}px` } as CSSProperties}
    >
      <div className="mx-auto max-w-6xl space-y-5 page-fade-shell" aria-hidden={isDisclaimerOpen}>
        <RevealSection reducedMotion={reducedMotion} className="paper-card p-6 md:p-8 print-hidden" delay={40}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-3">
                <a href={HOMEPAGE_URL} className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent-strong)] transition hover:text-[var(--accent)]">
                  <span aria-hidden="true">&lt;-</span>
                  <span>Back to tallowbethysoap.com</span>
                </a>
                <ThemeToggle />
              </div>
              <p className="mt-4 text-xs uppercase tracking-[0.24em] text-[var(--accent-strong)]">Guided Artisan Soap Calculator</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--text)] md:text-5xl">Tallow Be Thy Soap Lab</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-soft)]">Build your recipe one calm step at a time, review the full formula with warnings, then print or save a polished recipe card.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={loadSample} className="pill-toggle pill-toggle--quiet rounded-2xl px-4 py-3 text-sm font-medium">Load sample recipe</button>
                <button type="button" onClick={resetWizard} className="pill-toggle pill-toggle--quiet rounded-2xl px-4 py-3 text-sm font-medium">Start fresh</button>
              </div>
            </div>
            <ShareModule shareUrl={SHARE_URL} shareText={SHARE_TEXT} />
          </div>
        </RevealSection>

        <RevealSection reducedMotion={reducedMotion} as="div" delay={90} className="print-hidden">
          <StepIndicator currentStep={currentStep} onSelect={setCurrentStep} />
        </RevealSection>

        {renderLiveSummaryStrip()}

        <RevealSection reducedMotion={reducedMotion} as="div" delay={140}>
          <Card title={currentStepMeta.title} subtitle={currentStepMeta.subtitle}>
            {currentStep === "batch" ? renderBatchStep() : null}
            {currentStep === "oils" ? renderOilStep() : null}
            {currentStep === "water" ? renderWaterStep() : null}
            {currentStep === "lye" ? renderLyeStep() : null}
            {currentStep === "review" ? renderReviewStep() : null}
            {currentStep === "output" ? renderOutputStep() : null}
          </Card>
        </RevealSection>

        {finalizedRecipe && finalResult ? <PrintRecipeCard recipe={finalizedRecipe} result={finalResult} getWaterModeLabel={getWaterModeLabel} /> : null}
        <Footer />
      </div>
      {isSummaryOpen ? (
        <div
          className="disclaimer-overlay print-hidden"
          role="presentation"
          onClick={() => setIsSummaryOpen(false)}
        >
          <div
            className="disclaimer-card max-h-[85vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="live-batch-summary-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="disclaimer-eyebrow">Live Batch Snapshot</p>
                <h2 id="live-batch-summary-title" className="disclaimer-title">
                  Full batch summary
                </h2>
                <p className="disclaimer-copy">
                  A fuller view of the working batch while you move through the wizard.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSummaryOpen(false)}
                className="pill-toggle pill-toggle--quiet rounded-2xl px-4 py-3 text-sm font-medium"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Stat label="Total oils" value={formatRecipeWeight(draftResult.totals.oilWeight, draftRecipe.unit)} />
              <Stat label={draftResult.lye.label} value={formatRecipeWeight(draftResult.lye.displayAmount, draftRecipe.unit)} />
              <Stat label="Water" value={formatRecipeWeight(draftResult.totals.waterAmount, draftRecipe.unit)} />
              <Stat label="Fragrance" value={formatRecipeWeight(draftResult.totals.fragranceWeight, draftRecipe.unit)} hint={`${trimTrailingZeros(formatPercent(draftResult.totals.fragranceLoad))} g/kg`} />
              <Stat label="Total batch" value={formatRecipeWeight(draftResult.totals.totalBatch, draftRecipe.unit)} />
              <Stat label="Percent total" value={`${formatPercent(draftResult.totals.percent)}%`} hint={Math.abs(100 - draftResult.totals.percent) > 0.01 ? "Needs balancing" : "On target"} />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">
                  Recipe details
                </p>
                <div className="mt-4 space-y-3">
                  <SummaryRow label="Recipe name" value={draftRecipe.recipeName || "Untitled recipe"} />
                  <SummaryRow label="Unit" value={draftRecipe.unit.toUpperCase()} />
                  <SummaryRow label="Superfat" value={`${formatPercent(draftRecipe.superfat)}%`} />
                  <SummaryRow label="Water method" value={getWaterModeLabel(draftRecipe, draftResult)} />
                  <SummaryRow label="Fragrance loading" value={`${trimTrailingZeros(formatPercent(draftRecipe.fragranceLoad))} g/kg`} />
                </div>
                <div className="mt-5 space-y-2 border-t border-[var(--border)] pt-4">
                  {draftResult.oils.map((oil) => (
                    <SummaryRow
                      key={oil.oilId}
                      label={`${oil.name} (${formatPercent(oil.percent)}%)`}
                      value={formatRecipeWeight(oil.weight, draftRecipe.unit)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">
                    Soap qualities
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {Object.entries(draftResult.qualities).map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3"
                      >
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">
                          {key}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-[var(--text)]">
                          {roundTo(value, 2).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">
                    Warnings
                  </p>
                  <div className="mt-4 space-y-3">
                    {draftResult.warnings.length > 0 ? (
                      draftResult.warnings.map((warning) => (
                        <div key={warning} className="warning-card rounded-2xl px-4 py-3 text-sm leading-6">
                          {warning}
                        </div>
                      ))
                    ) : (
                      <p className="warning-empty rounded-2xl px-4 py-3 text-sm">
                        No warning flags at the moment. This formula looks balanced and ready to keep refining.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <DisclaimerModal open={isDisclaimerOpen} checked={disclaimerChecked} onCheckedChange={setDisclaimerChecked} onConfirm={handleAcceptDisclaimer} />
    </main>
  );
}
