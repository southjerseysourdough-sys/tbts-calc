"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
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
import { DEFAULT_RECIPE, EMPTY_RECIPE, SAMPLE_RECIPE, STORAGE_KEY } from "@/lib/defaults";
import { OIL_DATA, OIL_MAP } from "@/lib/oil-data";
import { EntryMode, RecipeState, SoapCalculationResult, WaterMode } from "@/lib/types";

type OilDraftMap = Record<string, { percent: string; weight: string }>;
type ResultTab = "summary" | "qualities" | "warnings";

const OUNCES_TO_GRAMS = 28.349523125;
const HOMEPAGE_URL = "https://tallowbethysoap.com/";
const SHARE_URL = "https://calc.tallowbethysoap.com/";
const SHARE_TEXT = "Tallow Be Thy Soap Lab | Cold process soap calculator";

function trimTrailingZeros(value: string) {
  return value.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

function sanitizeRecipe(input: Partial<RecipeState> | null | undefined): RecipeState {
  return {
    recipeName:
      typeof input?.recipeName === "string" && input.recipeName.trim()
        ? input.recipeName
        : DEFAULT_RECIPE.recipeName,
    totalOilWeight:
      typeof input?.totalOilWeight === "number" && Number.isFinite(input.totalOilWeight)
        ? input.totalOilWeight
        : DEFAULT_RECIPE.totalOilWeight,
    fragranceWeight:
      typeof input?.fragranceWeight === "number" && Number.isFinite(input.fragranceWeight)
        ? input.fragranceWeight
        : 0,
    unit: input?.unit === "oz" ? "oz" : "g",
    superfat:
      typeof input?.superfat === "number" && Number.isFinite(input.superfat)
        ? input.superfat
        : DEFAULT_RECIPE.superfat,
    water: {
      mode:
        input?.water?.mode === "percentOfOils" ||
        input?.water?.mode === "waterLyeRatio" ||
        input?.water?.mode === "lyeConcentration"
          ? input.water.mode
          : DEFAULT_RECIPE.water.mode,
      percentOfOils:
        typeof input?.water?.percentOfOils === "number" &&
        Number.isFinite(input.water.percentOfOils)
          ? input.water.percentOfOils
          : DEFAULT_RECIPE.water.percentOfOils,
      lyeConcentration:
        typeof input?.water?.lyeConcentration === "number" &&
        Number.isFinite(input.water.lyeConcentration)
          ? input.water.lyeConcentration
          : DEFAULT_RECIPE.water.lyeConcentration,
      waterLyeRatio:
        typeof input?.water?.waterLyeRatio === "number" &&
        Number.isFinite(input.water.waterLyeRatio)
          ? input.water.waterLyeRatio
          : DEFAULT_RECIPE.water.waterLyeRatio,
    },
    oils:
      Array.isArray(input?.oils) && input.oils.length > 0
        ? input.oils
            .filter((oil) => typeof oil?.id === "string" && typeof oil?.percent === "number")
            .map((oil) => ({ id: oil.id, percent: oil.percent }))
        : DEFAULT_RECIPE.oils,
  };
}

function makeOilDrafts(recipe: RecipeState) {
  const drafts: OilDraftMap = {};
  for (const oil of recipe.oils) {
    drafts[oil.id] = {
      percent: trimTrailingZeros(formatPercent(oil.percent)),
      weight: trimTrailingZeros(
        formatWeight(recipe.totalOilWeight * (oil.percent / 100), recipe.unit),
      ),
    };
  }
  return drafts;
}

function makeTopLevelDrafts(recipe: RecipeState) {
  return {
    recipeName: recipe.recipeName,
    totalOilWeight: trimTrailingZeros(formatWeight(recipe.totalOilWeight, recipe.unit)),
    fragranceWeight: trimTrailingZeros(formatWeight(recipe.fragranceWeight, recipe.unit)),
    superfat: trimTrailingZeros(formatPercent(recipe.superfat)),
    waterPercentOfOils: trimTrailingZeros(formatPercent(recipe.water.percentOfOils)),
    lyeConcentration: trimTrailingZeros(formatPercent(recipe.water.lyeConcentration * 100)),
    waterLyeRatio: formatRatio(recipe.water.waterLyeRatio),
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

function ResultTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="result-tab rounded-2xl px-4 py-3 text-sm font-medium"
      data-active={active}
      onClick={onClick}
    >
      {label}
    </button>
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
      className="pill-toggle inline-flex h-11 w-11 items-center justify-center rounded-2xl"
    >
      <span className="h-5 w-5 text-[var(--accent-strong)]">{children}</span>
    </a>
  );
}

function SummaryTab({
  recipe,
  result,
}: {
  recipe: RecipeState;
  result: SoapCalculationResult;
}) {
  const totalPercentDifference = roundTo(100 - result.totals.percent, 2);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Stat
          label="Total oils"
          value={`${formatWeight(result.totals.oilWeight, recipe.unit)} ${recipe.unit}`}
        />
        <Stat
          label="NaOH"
          value={`${formatWeight(result.totals.lyeAmount, recipe.unit)} ${recipe.unit}`}
        />
        <Stat
          label="Water"
          value={`${formatWeight(result.totals.waterAmount, recipe.unit)} ${recipe.unit}`}
        />
        <Stat
          label="Fragrance"
          value={`${formatWeight(result.totals.fragranceWeight, recipe.unit)} ${recipe.unit}`}
          hint="Optional"
        />
        <Stat
          label="Total batch"
          value={`${formatWeight(result.totals.totalBatch, recipe.unit)} ${recipe.unit}`}
          hint="Before cure"
        />
        <Stat
          label="Percent total"
          value={`${formatPercent(result.totals.percent)}%`}
          hint={
            totalPercentDifference === 0
              ? "Balanced at 100%"
              : `${totalPercentDifference > 0 ? "Missing" : "Over by"} ${Math.abs(totalPercentDifference).toFixed(2)}%`
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">
            Oil Breakdown
          </p>
          <div className="mt-3 space-y-2">
            {result.oils.map((oil) => (
              <div
                key={oil.oilId}
                className="dot-leader-row text-sm text-[var(--text-soft)]"
              >
                <span>
                  {oil.name} ({formatPercent(oil.percent)}%)
                </span>
                <span className="font-semibold text-[var(--text)]">
                  {formatWeight(oil.weight, recipe.unit)} {recipe.unit}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">
            Formula Settings
          </p>
          <div className="mt-3 grid gap-3 text-sm text-[var(--text-soft)]">
            <div className="flex items-center justify-between gap-3">
              <span>Superfat</span>
              <strong className="text-[var(--text)]">{formatPercent(recipe.superfat)}%</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Water setting</span>
              <strong className="text-right text-[var(--text)]">
                {getWaterModeLabel(recipe, result)}
              </strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Lye concentration</span>
              <strong className="text-[var(--text)]">
                {formatPercent(result.totals.lyeConcentration * 100)}%
              </strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Water : lye</span>
              <strong className="text-[var(--text)]">
                {formatRatio(result.totals.waterLyeRatio)}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QualitiesTab({ result }: { result: SoapCalculationResult }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Object.entries(result.qualities).map(([key, value]) => (
        <Stat key={key} label={key} value={roundTo(value, 2).toFixed(2)} />
      ))}
    </div>
  );
}

function WarningsTab({ result }: { result: SoapCalculationResult }) {
  if (result.warnings.length === 0) {
    return (
      <p className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-soft)]">
        No warning flags at the moment. This formula looks balanced and ready for a recipe card.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {result.warnings.map((warning) => (
        <div
          key={warning}
          className="rounded-3xl border border-[rgba(149,109,47,0.18)] bg-[rgba(255,247,232,0.82)] p-4 text-sm leading-6 text-[var(--warning)]"
        >
          {warning}
        </div>
      ))}
    </div>
  );
}

function PrintRecipeCard({
  recipe,
  result,
}: {
  recipe: RecipeState;
  result: SoapCalculationResult;
}) {
  return (
    <section className="recipe-print-card">
      <p className="print-eyebrow">Tallow Be Thy Soap Lab</p>
      <h1 className="print-title">{recipe.recipeName}</h1>
      <p className="print-subtitle">Cold process soap recipe card</p>

      <div className="print-section">
        <h2>Batch overview</h2>
        <div className="print-grid">
          <div>
            <span>Total oils</span>
            <strong>{formatWeight(result.totals.oilWeight, recipe.unit)} {recipe.unit}</strong>
          </div>
          <div>
            <span>Superfat</span>
            <strong>{formatPercent(recipe.superfat)}%</strong>
          </div>
          <div>
            <span>Water setting</span>
            <strong>{getWaterModeLabel(recipe, result)}</strong>
          </div>
          <div>
            <span>Total batch</span>
            <strong>{formatWeight(result.totals.totalBatch, recipe.unit)} {recipe.unit}</strong>
          </div>
        </div>
      </div>

      <div className="print-section">
        <h2>Oil breakdown</h2>
        <div className="space-y-2">
          {result.oils.map((oil) => (
            <div key={oil.oilId} className="dot-leader-row print-row">
              <span>{oil.name} ({formatPercent(oil.percent)}%)</span>
              <span>{formatWeight(oil.weight, recipe.unit)} {recipe.unit}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="print-section">
        <h2>Solution and additives</h2>
        <div className="space-y-2">
          <div className="dot-leader-row print-row">
            <span>NaOH</span>
            <span>{formatWeight(result.totals.lyeAmount, recipe.unit)} {recipe.unit}</span>
          </div>
          <div className="dot-leader-row print-row">
            <span>Water</span>
            <span>{formatWeight(result.totals.waterAmount, recipe.unit)} {recipe.unit}</span>
          </div>
          <div className="dot-leader-row print-row">
            <span>Fragrance</span>
            <span>{formatWeight(result.totals.fragranceWeight, recipe.unit)} {recipe.unit}</span>
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

export function SoapCalculator() {
  const [draftRecipe, setDraftRecipe] = useState<RecipeState>(DEFAULT_RECIPE);
  const [calculatedRecipe, setCalculatedRecipe] = useState<RecipeState | null>(DEFAULT_RECIPE);
  const [entryMode, setEntryMode] = useState<EntryMode>("percent");
  const [newOilId, setNewOilId] = useState("shea-butter");
  const [topLevelDrafts, setTopLevelDrafts] = useState(() => makeTopLevelDrafts(DEFAULT_RECIPE));
  const [oilDrafts, setOilDrafts] = useState<OilDraftMap>(() => makeOilDrafts(DEFAULT_RECIPE));
  const [copyMessage, setCopyMessage] = useState("");
  const [activeTab, setActiveTab] = useState<ResultTab>("summary");

  const result = useMemo(
    () => (calculatedRecipe ? calculateRecipe(calculatedRecipe) : null),
    [calculatedRecipe],
  );

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        return;
      }

      const parsed = sanitizeRecipe(JSON.parse(saved) as Partial<RecipeState>);
      setDraftRecipe(parsed);
      setCalculatedRecipe(parsed);
      setTopLevelDrafts(makeTopLevelDrafts(parsed));
      setOilDrafts(makeOilDrafts(parsed));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draftRecipe));
  }, [draftRecipe]);

  useEffect(() => {
    if (!copyMessage) {
      return;
    }
    const timeout = window.setTimeout(() => setCopyMessage(""), 1800);
    return () => window.clearTimeout(timeout);
  }, [copyMessage]);

  const syncDraftsFromRecipe = (nextRecipe: RecipeState) => {
    setTopLevelDrafts(makeTopLevelDrafts(nextRecipe));
    setOilDrafts(makeOilDrafts(nextRecipe));
  };

  const updateDraft = (updater: (current: RecipeState) => RecipeState) => {
    setDraftRecipe((current) => updater(current));
  };

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
      totalOilWeight:
        current.unit === "g" ? Math.max(parsed, 0) : Math.max(parsed, 0) * OUNCES_TO_GRAMS,
    }));
  };

  const handleFragranceWeightChange = (value: string) => {
    setTopLevelDrafts((current) => ({ ...current, fragranceWeight: value }));
    const parsed = parseLooseNumber(value);
    if (parsed === null) {
      return;
    }
    updateDraft((current) => ({
      ...current,
      fragranceWeight:
        current.unit === "g" ? Math.max(parsed, 0) : Math.max(parsed, 0) * OUNCES_TO_GRAMS,
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

  const normalizeTopLevelBlur = () => {
    setTopLevelDrafts(makeTopLevelDrafts(draftRecipe));
    setOilDrafts(makeOilDrafts(draftRecipe));
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

  const handleOilPercentChange = (oilId: string, value: string) => {
    updateOilDraft(oilId, "percent", value);
    const parsed = parseLooseNumber(value);
    if (parsed === null) {
      return;
    }
    updateDraft((current) => ({
      ...current,
      oils: current.oils.map((oil) =>
        oil.id === oilId ? { ...oil, percent: Math.max(parsed, 0) } : oil,
      ),
    }));
  };

  const handleOilWeightChange = (oilId: string, value: string) => {
    updateOilDraft(oilId, "weight", value);
    const parsed = parseLooseNumber(value);
    if (parsed === null) {
      return;
    }
    updateDraft((current) => {
      const weightInGrams = current.unit === "g" ? parsed : parsed * OUNCES_TO_GRAMS;
      const percent =
        current.totalOilWeight > 0 ? (weightInGrams / current.totalOilWeight) * 100 : 0;

      return {
        ...current,
        oils: current.oils.map((oil) =>
          oil.id === oilId ? { ...oil, percent: Math.max(percent, 0) } : oil,
        ),
      };
    });
  };

  const normalizeOilBlur = (oilId: string) => {
    const oil = draftRecipe.oils.find((item) => item.id === oilId);
    if (!oil) {
      return;
    }
    setOilDrafts((current) => ({
      ...current,
      [oilId]: {
        percent: trimTrailingZeros(formatPercent(oil.percent)),
        weight: trimTrailingZeros(
          formatWeight(draftRecipe.totalOilWeight * (oil.percent / 100), draftRecipe.unit),
        ),
      },
    }));
  };

  const handleUnitChange = (unit: RecipeState["unit"]) => {
    const nextRecipe = { ...draftRecipe, unit };
    setDraftRecipe(nextRecipe);
    syncDraftsFromRecipe(nextRecipe);
  };

  const handleWaterModeChange = (mode: WaterMode) => {
    const basis = calculateRecipe(draftRecipe);
    const nextWater = deriveWaterSettingsFromCurrent(mode, basis);
    const nextRecipe = { ...draftRecipe, water: nextWater };
    setDraftRecipe(nextRecipe);
    syncDraftsFromRecipe(nextRecipe);
  };

  const handleWaterValueChange = (mode: WaterMode, value: string) => {
    if (mode === "percentOfOils") {
      setTopLevelDrafts((current) => ({ ...current, waterPercentOfOils: value }));
      const parsed = parseLooseNumber(value);
      if (parsed === null) {
        return;
      }
      updateDraft((current) => ({
        ...current,
        water: { ...current.water, percentOfOils: clamp(parsed, 0, 100) },
      }));
      return;
    }

    if (mode === "lyeConcentration") {
      setTopLevelDrafts((current) => ({ ...current, lyeConcentration: value }));
      const parsed = parseLooseNumber(value);
      if (parsed === null) {
        return;
      }
      updateDraft((current) => ({
        ...current,
        water: { ...current.water, lyeConcentration: clamp(parsed / 100, 0.1, 0.95) },
      }));
      return;
    }

    setTopLevelDrafts((current) => ({ ...current, waterLyeRatio: value }));
    const parsed = parseRatioInput(value);
    if (parsed === null) {
      return;
    }
    updateDraft((current) => ({
      ...current,
      water: { ...current.water, waterLyeRatio: clamp(parsed, 0.5, 5) },
    }));
  };

  const normalizeWaterBlur = () => {
    setTopLevelDrafts((current) => ({
      ...current,
      waterPercentOfOils: trimTrailingZeros(formatPercent(draftRecipe.water.percentOfOils)),
      lyeConcentration: trimTrailingZeros(
        formatPercent(draftRecipe.water.lyeConcentration * 100),
      ),
      waterLyeRatio: formatRatio(draftRecipe.water.waterLyeRatio),
    }));
  };

  const addOil = () => {
    if (!newOilId || draftRecipe.oils.some((oil) => oil.id === newOilId)) {
      return;
    }
    setDraftRecipe((current) => ({
      ...current,
      oils: [...current.oils, { id: newOilId, percent: 0 }],
    }));
    setOilDrafts((current) => ({ ...current, [newOilId]: { percent: "", weight: "" } }));
  };

  const removeOil = (oilId: string) => {
    setDraftRecipe((current) => ({
      ...current,
      oils: current.oils.filter((oil) => oil.id !== oilId),
    }));
    setOilDrafts((current) => {
      const next = { ...current };
      delete next[oilId];
      return next;
    });
  };

  const resetFormula = () => {
    setDraftRecipe(DEFAULT_RECIPE);
    setCalculatedRecipe(null);
    setActiveTab("summary");
    syncDraftsFromRecipe(DEFAULT_RECIPE);
    setEntryMode("percent");
  };

  const clearAllFields = () => {
    setDraftRecipe(EMPTY_RECIPE);
    setCalculatedRecipe(null);
    setActiveTab("summary");
    syncDraftsFromRecipe(EMPTY_RECIPE);
    setEntryMode("percent");
    setNewOilId("shea-butter");
  };

  const loadSample = () => {
    setDraftRecipe(SAMPLE_RECIPE);
    setCalculatedRecipe(null);
    setActiveTab("summary");
    syncDraftsFromRecipe(SAMPLE_RECIPE);
    setEntryMode("percent");
  };

  const normalizeFormula = () => {
    const nextRecipe = { ...draftRecipe, oils: normalizePercentages(draftRecipe.oils) };
    setDraftRecipe(nextRecipe);
    syncDraftsFromRecipe(nextRecipe);
  };

  const handleCalculate = () => {
    setCalculatedRecipe(sanitizeRecipe(draftRecipe));
    setActiveTab("summary");
  };

  const handleCopy = async () => {
    if (!result || !calculatedRecipe) {
      return;
    }
    const lines = [
      calculatedRecipe.recipeName,
      `Total oils: ${formatWeight(result.totals.oilWeight, calculatedRecipe.unit)} ${calculatedRecipe.unit}`,
      `NaOH: ${formatWeight(result.totals.lyeAmount, calculatedRecipe.unit)} ${calculatedRecipe.unit}`,
      `Water: ${formatWeight(result.totals.waterAmount, calculatedRecipe.unit)} ${calculatedRecipe.unit}`,
      `Fragrance: ${formatWeight(result.totals.fragranceWeight, calculatedRecipe.unit)} ${calculatedRecipe.unit}`,
      `Total batch: ${formatWeight(result.totals.totalBatch, calculatedRecipe.unit)} ${calculatedRecipe.unit}`,
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyMessage("Summary copied");
    } catch {
      setCopyMessage("Copy unavailable");
    }
  };

  const handleEmail = () => {
    if (!result || !calculatedRecipe) {
      return;
    }

    const subject = encodeURIComponent(
      `${calculatedRecipe.recipeName || "Soap recipe"} | Tallow Be Thy Soap Lab`,
    );

    const bodyLines = [
      calculatedRecipe.recipeName || "Soap recipe",
      "",
      `Total oils: ${formatWeight(result.totals.oilWeight, calculatedRecipe.unit)} ${calculatedRecipe.unit}`,
      `Superfat: ${formatPercent(calculatedRecipe.superfat)}%`,
      `Water setting: ${getWaterModeLabel(calculatedRecipe, result)}`,
      `NaOH: ${formatWeight(result.totals.lyeAmount, calculatedRecipe.unit)} ${calculatedRecipe.unit}`,
      `Water: ${formatWeight(result.totals.waterAmount, calculatedRecipe.unit)} ${calculatedRecipe.unit}`,
      `Fragrance: ${formatWeight(result.totals.fragranceWeight, calculatedRecipe.unit)} ${calculatedRecipe.unit}`,
      `Total batch: ${formatWeight(result.totals.totalBatch, calculatedRecipe.unit)} ${calculatedRecipe.unit}`,
      "",
      "Oil breakdown:",
      ...result.oils.map(
        (oil) =>
          `- ${oil.name}: ${formatPercent(oil.percent)}% / ${formatWeight(oil.weight, calculatedRecipe.unit)} ${calculatedRecipe.unit}`,
      ),
      "",
      "Soap qualities:",
      ...Object.entries(result.qualities).map(
        ([key, value]) => `- ${key}: ${roundTo(value, 2).toFixed(2)}`,
      ),
      "",
      "Warnings and notes:",
      ...(result.warnings.length > 0
        ? result.warnings.map((warning) => `- ${warning}`)
        : ["- No warning flags."]),
    ];

    window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
  };

  const handlePrint = () => {
    if (!calculatedRecipe) {
      return;
    }
    window.print();
  };

  const availableOilOptions = OIL_DATA.filter(
    (oil) => !draftRecipe.oils.some((entry) => entry.id === oil.id),
  );

  return (
    <main className="lab-shell">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="paper-card p-6 md:p-8 print-hidden">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <a
                href={HOMEPAGE_URL}
                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent-strong)] transition hover:text-[var(--accent)]"
              >
                <span aria-hidden="true">←</span>
                <span>Back to tallowbethysoap.com</span>
              </a>
              <p className="mt-4 text-xs uppercase tracking-[0.24em] text-[var(--accent-strong)]">
                Artisan Cold Process Soap Calculator
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--text)] md:text-5xl">
                Tallow Be Thy Soap Lab
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-soft)]">
                Enter your formula, calculate when you are ready, then review or print a clean recipe card.
              </p>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 md:min-w-64">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">
                Share this calculator
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <SocialIcon
                  label="Share on Facebook"
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}`}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.5 21v-8.1h2.7l.4-3.2h-3.1V7.66c0-.93.26-1.56 1.59-1.56H16.6V3.24c-.27-.04-1.2-.12-2.28-.12-2.25 0-3.79 1.37-3.79 3.89v2.16H8v3.2h2.53V21h2.97Z" />
                  </svg>
                </SocialIcon>
                <SocialIcon
                  label="Share on X"
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(SHARE_URL)}&text=${encodeURIComponent(SHARE_TEXT)}`}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.9 2H22l-6.77 7.74L23 22h-6.1l-4.78-6.97L6.02 22H2.9l7.24-8.27L1 2h6.26l4.32 6.32L18.9 2Zm-1.07 18h1.7L6.33 3.9H4.5L17.83 20Z" />
                  </svg>
                </SocialIcon>
                <SocialIcon
                  label="Share on Pinterest"
                  href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(SHARE_URL)}&description=${encodeURIComponent(SHARE_TEXT)}`}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a10 10 0 0 0-3.64 19.31c-.05-1.64-.01-3.61.43-5.46l1.33-5.63S9.8 9.58 9.8 8.66c0-1.42.82-2.48 1.85-2.48.87 0 1.29.65 1.29 1.43 0 .87-.55 2.18-.84 3.39-.24 1.01.51 1.83 1.51 1.83 1.82 0 3.04-2.34 3.04-5.12 0-2.11-1.42-3.69-4.01-3.69-2.92 0-4.74 2.18-4.74 4.62 0 .84.25 1.44.65 1.9.18.21.21.29.14.53-.05.18-.15.6-.2.77-.07.26-.28.35-.52.25-1.46-.59-2.14-2.18-2.14-3.97 0-2.96 2.49-6.52 7.44-6.52 3.98 0 6.6 2.88 6.6 5.97 0 4.09-2.27 7.14-5.62 7.14-1.12 0-2.16-.61-2.52-1.29l-.69 2.73c-.42 1.7-1.25 3.4-2.01 4.72A10 10 0 1 0 12 2Z" />
                  </svg>
                </SocialIcon>
                <SocialIcon
                  label="Share by email"
                  href={`mailto:?subject=${encodeURIComponent(SHARE_TEXT)}&body=${encodeURIComponent(`Take a look at the Tallow Be Thy Soap Lab calculator: ${SHARE_URL}`)}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 6h16v12H4z" />
                    <path d="m4 7 8 6 8-6" />
                  </svg>
                </SocialIcon>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-5 print-hidden">
          <Card title="Batch setup" subtitle="Set your batch inputs first, then calculate when you're ready.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Recipe name">
                <TextInput value={topLevelDrafts.recipeName} onChange={(event) => handleRecipeName(event.target.value)} />
              </Field>
              <Field label="Total oils" hint={draftRecipe.unit === "g" ? "grams" : "ounces"}>
                <TextInput inputMode="decimal" value={topLevelDrafts.totalOilWeight} onChange={(event) => handleTotalOilWeightChange(event.target.value)} onBlur={normalizeTopLevelBlur} suffix={draftRecipe.unit} />
              </Field>
              <Field label="Unit">
                <div className="grid grid-cols-2 gap-2">
                  {(["g", "oz"] as const).map((unit) => (
                    <button key={unit} type="button" className="pill-toggle rounded-2xl px-4 py-3 text-sm font-medium uppercase" data-active={draftRecipe.unit === unit} onClick={() => handleUnitChange(unit)}>
                      {unit}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Superfat">
                <TextInput inputMode="decimal" value={topLevelDrafts.superfat} onChange={(event) => handleSuperfatChange(event.target.value)} onBlur={normalizeTopLevelBlur} suffix="%" />
              </Field>
              <Field label="Fragrance">
                <TextInput inputMode="decimal" value={topLevelDrafts.fragranceWeight} onChange={(event) => handleFragranceWeightChange(event.target.value)} onBlur={normalizeTopLevelBlur} placeholder="0" suffix={draftRecipe.unit} />
              </Field>
            </div>

            <div className="mt-5">
              <Field label="Recipe actions">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button type="button" onClick={resetFormula} className="pill-toggle rounded-2xl px-4 py-3 text-sm font-medium">Reset</button>
                  <button type="button" onClick={loadSample} className="pill-toggle rounded-2xl px-4 py-3 text-sm font-medium">Load sample</button>
                  <button type="button" onClick={normalizeFormula} className="pill-toggle rounded-2xl px-4 py-3 text-sm font-medium">Normalize to 100%</button>
                </div>
              </Field>
            </div>

            <div className="mt-3">
              <button type="button" onClick={clearAllFields} className="pill-toggle rounded-2xl px-4 py-3 text-sm font-medium">
                Clear all fields
              </button>
            </div>
          </Card>

          <Card title="Oil composition" subtitle="Build the formula by percentage or by weight.">
            <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 md:flex-row md:items-end">
              <Field label="Add oil" className="flex-1">
                <Select value={newOilId} onChange={(event) => setNewOilId(event.target.value)}>
                  {availableOilOptions.length === 0 ? <option value="">All available oils added</option> : availableOilOptions.map((oil) => <option key={oil.id} value={oil.id}>{oil.name}</option>)}
                </Select>
              </Field>
              <button type="button" onClick={addOil} disabled={availableOilOptions.length === 0} className="rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
                Add oil
              </button>
              <Field label="Entry mode" className="md:w-72">
                <div className="grid grid-cols-2 gap-2">
                  {(["percent", "weight"] as const).map((mode) => (
                    <button key={mode} type="button" className="pill-toggle rounded-2xl px-4 py-3 text-sm font-medium capitalize" data-active={entryMode === mode} onClick={() => setEntryMode(mode)}>
                      {mode}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <div className="table-grid">
              {draftRecipe.oils.map((oil) => {
                const definition = OIL_MAP.get(oil.id);
                if (!definition) return null;
                const draft = oilDrafts[oil.id] ?? { percent: "", weight: "" };

                return (
                  <div key={oil.id} className="rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] p-4">
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto] md:items-end">
                      <div>
                        <p className="text-base font-semibold text-[var(--text)]">{definition.name}</p>
                        <p className="mt-1 text-sm text-[var(--text-soft)]">NaOH SAP: {definition.sapNaoh}</p>
                      </div>
                      <Field label="Percent">
                        <TextInput inputMode="decimal" value={draft.percent} onChange={(event) => handleOilPercentChange(oil.id, event.target.value)} onBlur={() => normalizeOilBlur(oil.id)} suffix="%" />
                      </Field>
                      <Field label={`Weight (${draftRecipe.unit})`}>
                        <TextInput inputMode="decimal" value={draft.weight} onChange={(event) => handleOilWeightChange(oil.id, event.target.value)} onBlur={() => normalizeOilBlur(oil.id)} suffix={draftRecipe.unit} />
                      </Field>
                      <button type="button" onClick={() => removeOil(oil.id)} className="rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--danger)]">
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Water settings" subtitle="Choose one water method and keep the others in sync.">
            <Field label="Water calculation mode">
              <SegmentedControl
                value={draftRecipe.water.mode}
                onChange={handleWaterModeChange}
                options={[
                  { value: "percentOfOils", label: "Water % of oils" },
                  { value: "lyeConcentration", label: "Lye concentration" },
                  { value: "waterLyeRatio", label: "Water : lye ratio" },
                ]}
              />
            </Field>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <Field label="Water as % of oils">
                <TextInput inputMode="decimal" value={topLevelDrafts.waterPercentOfOils} onChange={(event) => handleWaterValueChange("percentOfOils", event.target.value)} onBlur={normalizeWaterBlur} suffix="%" />
              </Field>
              <Field label="Lye concentration">
                <TextInput inputMode="decimal" value={topLevelDrafts.lyeConcentration} onChange={(event) => handleWaterValueChange("lyeConcentration", event.target.value)} onBlur={normalizeWaterBlur} suffix="%" />
              </Field>
              <Field label="Water : lye ratio">
                <TextInput inputMode="text" value={topLevelDrafts.waterLyeRatio} onChange={(event) => handleWaterValueChange("waterLyeRatio", event.target.value)} onBlur={normalizeWaterBlur} placeholder="2:1" />
              </Field>
            </div>
          </Card>

          <section className="paper-card p-5 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-[var(--text)]">Calculate and Review</h2>
                <p className="mt-1 text-sm text-[var(--text-soft)]">Run the formula, then copy or print the recipe card.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={handleCalculate} className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)]">
                  Calculate recipe
                </button>
                <button type="button" onClick={handleCopy} disabled={!result} className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-strong)] px-5 py-3 text-sm font-medium text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50">
                  Copy results
                </button>
                <button type="button" onClick={handleEmail} disabled={!result} className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-strong)] px-5 py-3 text-sm font-medium text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50">
                  Email recipe
                </button>
                <button type="button" onClick={handlePrint} disabled={!result} className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-strong)] px-5 py-3 text-sm font-medium text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50">
                  Print card
                </button>
              </div>
            </div>
            {copyMessage ? <p className="mt-3 text-sm text-[var(--accent-strong)]">{copyMessage}</p> : null}
          </section>

          {result && calculatedRecipe ? (
            <section className="paper-card results-card p-5 md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent-strong)]">Calculated recipe</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text)]">{calculatedRecipe.recipeName}</h2>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">Review the formula, then print a clean batch card when you are ready.</p>
                </div>
                <div className="result-tab-row">
                  <ResultTabButton active={activeTab === "summary"} label="Formula Summary" onClick={() => setActiveTab("summary")} />
                  <ResultTabButton active={activeTab === "qualities"} label="Soap Qualities" onClick={() => setActiveTab("qualities")} />
                  <ResultTabButton active={activeTab === "warnings"} label="Warnings & Notes" onClick={() => setActiveTab("warnings")} />
                </div>
              </div>

              <div className="mt-5 results-panel">
                {activeTab === "summary" ? <SummaryTab recipe={calculatedRecipe} result={result} /> : null}
                {activeTab === "qualities" ? <QualitiesTab result={result} /> : null}
                {activeTab === "warnings" ? <WarningsTab result={result} /> : null}
              </div>
            </section>
          ) : null}
        </div>

        {result && calculatedRecipe ? <PrintRecipeCard recipe={calculatedRecipe} result={result} /> : null}
      </div>
    </main>
  );
}
