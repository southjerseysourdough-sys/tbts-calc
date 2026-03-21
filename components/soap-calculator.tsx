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
  getLyeLabel,
  normalizePercentages,
  parseLooseNumber,
  parseRatioInput,
  roundTo,
} from "@/lib/calculations";
import { DEFAULT_RECIPE, SAMPLE_RECIPE, STORAGE_KEY } from "@/lib/defaults";
import { OIL_DATA, OIL_MAP } from "@/lib/oil-data";
import { EntryMode, RecipeState, WaterMode } from "@/lib/types";

type OilDraftMap = Record<string, { percent: string; weight: string }>;

const OUNCES_TO_GRAMS = 28.349523125;

function trimTrailingZeros(value: string) {
  return value.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
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

export function SoapCalculator() {
  const [recipe, setRecipe] = useState<RecipeState>(DEFAULT_RECIPE);
  const [entryMode, setEntryMode] = useState<EntryMode>("percent");
  const [newOilId, setNewOilId] = useState("shea-butter");
  const [topLevelDrafts, setTopLevelDrafts] = useState(() => makeTopLevelDrafts(DEFAULT_RECIPE));
  const [oilDrafts, setOilDrafts] = useState<OilDraftMap>(() => makeOilDrafts(DEFAULT_RECIPE));
  const [copyMessage, setCopyMessage] = useState("");

  const result = useMemo(() => calculateRecipe(recipe), [recipe]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        return;
      }

      const parsed = JSON.parse(saved) as RecipeState;
      setRecipe(parsed);
      setTopLevelDrafts(makeTopLevelDrafts(parsed));
      setOilDrafts(makeOilDrafts(parsed));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(recipe));
  }, [recipe]);

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

  const handleRecipeName = (value: string) => {
    setTopLevelDrafts((current) => ({ ...current, recipeName: value }));
    setRecipe((current) => ({ ...current, recipeName: value }));
  };

  const handleTotalOilWeightChange = (value: string) => {
    setTopLevelDrafts((current) => ({ ...current, totalOilWeight: value }));
    const parsed = parseLooseNumber(value);
    if (parsed === null) {
      return;
    }

    setRecipe((current) => ({
      ...current,
      totalOilWeight:
        current.unit === "g" ? Math.max(parsed, 0) : Math.max(parsed, 0) * OUNCES_TO_GRAMS,
    }));
  };

  const handleSuperfatChange = (value: string) => {
    setTopLevelDrafts((current) => ({ ...current, superfat: value }));
    const parsed = parseLooseNumber(value);
    if (parsed === null) {
      return;
    }

    setRecipe((current) => ({
      ...current,
      superfat: clamp(parsed, 0, 20),
    }));
  };

  const handleFragranceWeightChange = (value: string) => {
    setTopLevelDrafts((current) => ({ ...current, fragranceWeight: value }));
    const parsed = parseLooseNumber(value);
    if (parsed === null) {
      return;
    }

    setRecipe((current) => ({
      ...current,
      fragranceWeight:
        current.unit === "g" ? Math.max(parsed, 0) : Math.max(parsed, 0) * OUNCES_TO_GRAMS,
    }));
  };

  const normalizeTopLevelBlur = () => {
    setTopLevelDrafts(makeTopLevelDrafts(recipe));
    setOilDrafts(makeOilDrafts(recipe));
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

    setRecipe((current) => ({
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

    setRecipe((current) => {
      const weightInGrams = current.unit === "g" ? parsed : parsed * OUNCES_TO_GRAMS;
      const percent = current.totalOilWeight > 0 ? (weightInGrams / current.totalOilWeight) * 100 : 0;
      return {
        ...current,
        oils: current.oils.map((oil) =>
          oil.id === oilId ? { ...oil, percent: Math.max(percent, 0) } : oil,
        ),
      };
    });
  };

  const normalizeOilBlur = (oilId: string) => {
    const oil = recipe.oils.find((item) => item.id === oilId);
    if (!oil) {
      return;
    }

    setOilDrafts((current) => ({
      ...current,
      [oilId]: {
        percent: trimTrailingZeros(formatPercent(oil.percent)),
        weight: trimTrailingZeros(
          formatWeight(recipe.totalOilWeight * (oil.percent / 100), recipe.unit),
        ),
      },
    }));
  };

  const handleUnitChange = (unit: RecipeState["unit"]) => {
    const nextRecipe = { ...recipe, unit };
    setRecipe(nextRecipe);
    syncDraftsFromRecipe(nextRecipe);
  };

  const handleLyeTypeChange = (lyeType: RecipeState["lyeType"]) => {
    setRecipe((current) => ({ ...current, lyeType }));
  };

  const handleWaterModeChange = (mode: WaterMode) => {
    const nextWater = deriveWaterSettingsFromCurrent(mode, result);
    const nextRecipe = { ...recipe, water: nextWater };
    setRecipe(nextRecipe);
    syncDraftsFromRecipe(nextRecipe);
  };

  const handleWaterValueChange = (mode: WaterMode, value: string) => {
    if (mode === "percentOfOils") {
      setTopLevelDrafts((current) => ({ ...current, waterPercentOfOils: value }));
      const parsed = parseLooseNumber(value);
      if (parsed === null) {
        return;
      }

      setRecipe((current) => ({
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

      setRecipe((current) => ({
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

    setRecipe((current) => ({
      ...current,
      water: { ...current.water, waterLyeRatio: clamp(parsed, 0.5, 5) },
    }));
  };

  const normalizeWaterBlur = () => {
    setTopLevelDrafts((current) => ({
      ...current,
      waterPercentOfOils: trimTrailingZeros(formatPercent(recipe.water.percentOfOils)),
      lyeConcentration: trimTrailingZeros(formatPercent(recipe.water.lyeConcentration * 100)),
      waterLyeRatio: formatRatio(recipe.water.waterLyeRatio),
    }));
  };

  const addOil = () => {
    if (!newOilId || recipe.oils.some((oil) => oil.id === newOilId)) {
      return;
    }

    setRecipe((current) => ({
      ...current,
      oils: [...current.oils, { id: newOilId, percent: 0 }],
    }));
    setOilDrafts((current) => ({ ...current, [newOilId]: { percent: "", weight: "" } }));
  };

  const removeOil = (oilId: string) => {
    setRecipe((current) => ({
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
    setRecipe(DEFAULT_RECIPE);
    syncDraftsFromRecipe(DEFAULT_RECIPE);
    setEntryMode("percent");
  };

  const loadSample = () => {
    setRecipe(SAMPLE_RECIPE);
    syncDraftsFromRecipe(SAMPLE_RECIPE);
    setEntryMode("percent");
  };

  const normalizeFormula = () => {
    const nextRecipe = { ...recipe, oils: normalizePercentages(recipe.oils) };
    setRecipe(nextRecipe);
    syncDraftsFromRecipe(nextRecipe);
  };

  const copySummary = async () => {
    const lines = [
      recipe.recipeName,
      `Total oils: ${formatWeight(result.totals.oilWeight, recipe.unit)} ${recipe.unit}`,
      `${getLyeLabel(recipe.lyeType)}: ${formatWeight(result.totals.lyeAmount, recipe.unit)} ${recipe.unit}`,
      `Water: ${formatWeight(result.totals.waterAmount, recipe.unit)} ${recipe.unit}`,
      `Fragrance: ${formatWeight(result.totals.fragranceWeight, recipe.unit)} ${recipe.unit}`,
      `Total batch: ${formatWeight(result.totals.totalBatch, recipe.unit)} ${recipe.unit}`,
      `Superfat: ${formatPercent(recipe.superfat)}%`,
      "Oils:",
      ...result.oils.map(
        (oil) =>
          `- ${oil.name}: ${formatPercent(oil.percent)}% / ${formatWeight(oil.weight, recipe.unit)} ${recipe.unit}`,
      ),
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyMessage("Summary copied");
    } catch {
      setCopyMessage("Copy unavailable");
    }
  };

  const availableOilOptions = OIL_DATA.filter(
    (oil) => !recipe.oils.some((entry) => entry.id === oil.id),
  );
  const totalPercentDifference = roundTo(100 - result.totals.percent, 2);

  return (
    <main className="lab-shell">
      <div className="lab-grid">
        <div className="space-y-5">
          <section className="paper-card overflow-hidden p-6 md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--accent-strong)]">
                  Artisan Cold Process Soap Calculator
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--text)] md:text-5xl">
                  Tallow Be Thy Soap Lab
                </h1>
                <p className="mt-3 max-w-xl text-base leading-7 text-[var(--text-soft)]">
                  A calm, premium formula bench for accurate lye, water, and oil profile
                  calculations in your browser.
                </p>
              </div>
              <div className="no-print flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={copySummary}
                  className="rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)]"
                >
                  Copy results
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-strong)] px-4 py-3 text-sm font-medium text-[var(--text)] transition hover:border-[var(--accent-soft)]"
                >
                  Print recipe
                </button>
              </div>
            </div>
            {copyMessage ? (
              <p className="mt-4 text-sm text-[var(--accent-strong)]">{copyMessage}</p>
            ) : null}
          </section>

          <Card title="Batch setup" subtitle="Core batch controls and unit preferences.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Recipe name">
                <TextInput
                  value={topLevelDrafts.recipeName}
                  onChange={(event) => handleRecipeName(event.target.value)}
                  placeholder="Founder's Tallow Bar"
                />
              </Field>

              <Field label="Total oils" hint={recipe.unit === "g" ? "grams" : "ounces"}>
                <TextInput
                  inputMode="decimal"
                  value={topLevelDrafts.totalOilWeight}
                  onChange={(event) => handleTotalOilWeightChange(event.target.value)}
                  onBlur={normalizeTopLevelBlur}
                  placeholder="1000"
                  suffix={recipe.unit}
                />
              </Field>

              <Field label="Unit">
                <div className="grid grid-cols-2 gap-2">
                  {(["g", "oz"] as const).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      className="pill-toggle rounded-2xl px-4 py-3 text-sm font-medium uppercase"
                      data-active={recipe.unit === unit}
                      onClick={() => handleUnitChange(unit)}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Superfat">
                <TextInput
                  inputMode="decimal"
                  value={topLevelDrafts.superfat}
                  onChange={(event) => handleSuperfatChange(event.target.value)}
                  onBlur={normalizeTopLevelBlur}
                  placeholder="5"
                  suffix="%"
                />
              </Field>

              <Field label="Fragrance">
                <TextInput
                  inputMode="decimal"
                  value={topLevelDrafts.fragranceWeight}
                  onChange={(event) => handleFragranceWeightChange(event.target.value)}
                  onBlur={normalizeTopLevelBlur}
                  placeholder="0"
                  suffix={recipe.unit}
                />
              </Field>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Lye type">
                <div className="grid grid-cols-2 gap-2">
                  {(["naoh", "koh"] as const).map((lyeType) => (
                    <button
                      key={lyeType}
                      type="button"
                      className="pill-toggle rounded-2xl px-4 py-3 text-sm font-medium uppercase"
                      data-active={recipe.lyeType === lyeType}
                      onClick={() => handleLyeTypeChange(lyeType)}
                    >
                      {getLyeLabel(lyeType)}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Recipe actions">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={resetFormula}
                    className="pill-toggle rounded-2xl px-4 py-3 text-sm font-medium"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={loadSample}
                    className="pill-toggle rounded-2xl px-4 py-3 text-sm font-medium"
                  >
                    Load sample
                  </button>
                  <button
                    type="button"
                    onClick={normalizeFormula}
                    className="pill-toggle rounded-2xl px-4 py-3 text-sm font-medium"
                  >
                    Normalize to 100%
                  </button>
                </div>
              </Field>
            </div>
          </Card>

          <Card
            title="Oil composition"
            subtitle="Add, remove, and fine-tune oils by percentage or by weight."
          >
            <div className="no-print mb-5 flex flex-col gap-3 rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 md:flex-row md:items-end">
              <Field label="Add oil" className="flex-1">
                <Select value={newOilId} onChange={(event) => setNewOilId(event.target.value)}>
                  {availableOilOptions.length === 0 ? (
                    <option value="">All starter oils added</option>
                  ) : (
                    availableOilOptions.map((oil) => (
                      <option key={oil.id} value={oil.id}>
                        {oil.name}
                      </option>
                    ))
                  )}
                </Select>
              </Field>
              <button
                type="button"
                onClick={addOil}
                disabled={availableOilOptions.length === 0}
                className="rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Add oil
              </button>
              <Field label="Entry mode" className="md:w-72">
                <div className="grid grid-cols-2 gap-2">
                  {(["percent", "weight"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className="pill-toggle rounded-2xl px-4 py-3 text-sm font-medium capitalize"
                      data-active={entryMode === mode}
                      onClick={() => setEntryMode(mode)}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <div className="table-grid">
              {recipe.oils.map((oil) => {
                const definition = OIL_MAP.get(oil.id);
                if (!definition) {
                  return null;
                }

                const draft = oilDrafts[oil.id] ?? { percent: "", weight: "" };
                const perOil = result.oils.find((item) => item.oilId === oil.id);

                return (
                  <div
                    key={oil.id}
                    className="rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] p-4"
                  >
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto] md:items-end">
                      <div>
                        <p className="text-base font-semibold text-[var(--text)]">
                          {definition.name}
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-soft)]">
                          SAP ({getLyeLabel(recipe.lyeType)}):{" "}
                          {recipe.lyeType === "naoh" ? definition.sapNaoh : definition.sapKoh}
                        </p>
                      </div>

                      <Field label="Percent">
                        <TextInput
                          inputMode="decimal"
                          value={draft.percent}
                          onChange={(event) => handleOilPercentChange(oil.id, event.target.value)}
                          onBlur={() => normalizeOilBlur(oil.id)}
                          placeholder="0"
                          suffix="%"
                        />
                      </Field>

                      <Field label={`Weight (${recipe.unit})`}>
                        <TextInput
                          inputMode="decimal"
                          value={draft.weight}
                          onChange={(event) => handleOilWeightChange(oil.id, event.target.value)}
                          onBlur={() => normalizeOilBlur(oil.id)}
                          placeholder="0"
                          suffix={recipe.unit}
                        />
                      </Field>

                      <button
                        type="button"
                        onClick={() => removeOil(oil.id)}
                        className="no-print rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--danger)] transition hover:border-[rgba(143,77,66,0.25)]"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--text-soft)]">
                      <span>
                        Live share:{" "}
                        <strong className="text-[var(--text)]">
                          {formatPercent(oil.percent)}%
                        </strong>
                      </span>
                      <span>
                        Live weight:{" "}
                        <strong className="text-[var(--text)]">
                          {formatWeight(recipe.totalOilWeight * (oil.percent / 100), recipe.unit)}{" "}
                          {recipe.unit}
                        </strong>
                      </span>
                      <span>
                        Lye for this oil:{" "}
                        <strong className="text-[var(--text)]">
                          {formatWeight(
                            recipe.lyeType === "naoh" ? perOil?.lyeNaoh ?? 0 : perOil?.lyeKoh ?? 0,
                            recipe.unit,
                          )}{" "}
                          {recipe.unit}
                        </strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card
            title="Water and lye settings"
            subtitle="Switch between water modes without losing the current formula relationship."
          >
            <Field label="Water calculation mode">
              <SegmentedControl
                value={recipe.water.mode}
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
                <TextInput
                  inputMode="decimal"
                  value={topLevelDrafts.waterPercentOfOils}
                  onChange={(event) => handleWaterValueChange("percentOfOils", event.target.value)}
                  onBlur={normalizeWaterBlur}
                  suffix="%"
                />
              </Field>

              <Field label="Lye concentration">
                <TextInput
                  inputMode="decimal"
                  value={topLevelDrafts.lyeConcentration}
                  onChange={(event) =>
                    handleWaterValueChange("lyeConcentration", event.target.value)
                  }
                  onBlur={normalizeWaterBlur}
                  suffix="%"
                />
              </Field>

              <Field label="Water : lye ratio">
                <TextInput
                  inputMode="text"
                  value={topLevelDrafts.waterLyeRatio}
                  onChange={(event) => handleWaterValueChange("waterLyeRatio", event.target.value)}
                  onBlur={normalizeWaterBlur}
                  placeholder="2:1"
                />
              </Field>
            </div>

            <div className="mt-4 rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-soft)]">
              Active mode:{" "}
              <strong className="text-[var(--text)]">
                {recipe.water.mode === "percentOfOils"
                  ? "Water as % of oils"
                  : recipe.water.mode === "lyeConcentration"
                    ? "Lye concentration"
                    : "Water to lye ratio"}
              </strong>
              . The other two fields stay in sync with the live calculation so you can switch modes
              cleanly.
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Formula summary" subtitle="Live totals for the current formula.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Stat
                label="Total oils"
                value={`${formatWeight(result.totals.oilWeight, recipe.unit)} ${recipe.unit}`}
              />
              <Stat
                label={getLyeLabel(recipe.lyeType)}
                value={`${formatWeight(result.totals.lyeAmount, recipe.unit)} ${recipe.unit}`}
              />
              <Stat
                label="Water"
                value={`${formatWeight(result.totals.waterAmount, recipe.unit)} ${recipe.unit}`}
              />
              <Stat
                label="Total batch"
                value={`${formatWeight(result.totals.totalBatch, recipe.unit)} ${recipe.unit}`}
                hint="Before cure"
              />
              <Stat
                label="Fragrance"
                value={`${formatWeight(result.totals.fragranceWeight, recipe.unit)} ${recipe.unit}`}
                hint="Optional"
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

            <div className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <div className="grid gap-3 text-sm text-[var(--text-soft)]">
                <div className="flex items-center justify-between gap-4">
                  <span>Lye concentration</span>
                  <strong className="text-[var(--text)]">
                    {formatPercent(result.totals.lyeConcentration * 100)}%
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Water : lye ratio</span>
                  <strong className="text-[var(--text)]">
                    {formatRatio(result.totals.waterLyeRatio)}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Water as % of oils</span>
                  <strong className="text-[var(--text)]">
                    {formatPercent(result.totals.waterPercentOfOils)}%
                  </strong>
                </div>
              </div>
            </div>
          </Card>

          <Card
            title="Soap qualities"
            subtitle="Estimated from weighted oil profile data for quick formulation guidance."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(result.qualities).map(([key, value]) => (
                <Stat key={key} label={key} value={roundTo(value, 2).toFixed(2)} />
              ))}
            </div>
          </Card>

          <Card title="Warnings and notes" subtitle="Helpful flags while building the recipe.">
            {result.warnings.length === 0 ? (
              <p className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-soft)]">
                No warning flags at the moment. Percentages are balanced and the water/lye
                settings are within common artisan ranges.
              </p>
            ) : (
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
            )}
          </Card>

          <Card title="Per-oil lye detail" subtitle="Each oil's contribution to the total lye demand.">
            <div className="space-y-3">
              {result.oils.map((oil) => (
                <div
                  key={oil.oilId}
                  className="rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--text)]">{oil.name}</p>
                      <p className="mt-1 text-sm text-[var(--text-soft)]">
                        {formatPercent(oil.percent)}% / {formatWeight(oil.weight, recipe.unit)}{" "}
                        {recipe.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">
                        {getLyeLabel(recipe.lyeType)}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[var(--text)]">
                        {formatWeight(
                          recipe.lyeType === "naoh" ? oil.lyeNaoh : oil.lyeKoh,
                          recipe.unit,
                        )}{" "}
                        {recipe.unit}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <section className="recipe-print-card">
            <p className="text-xs uppercase tracking-[0.2em] text-[#7c5d40]">Print Recipe Card</p>
            <h2 className="mt-2 text-3xl font-semibold">{recipe.recipeName}</h2>
            <p className="mt-2 text-sm text-[#6f5a49]">
              {getLyeLabel(recipe.lyeType)} | {formatPercent(recipe.superfat)}% superfat |{" "}
              {formatWeight(result.totals.oilWeight, recipe.unit)} {recipe.unit} oils
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#7c5d40]">
                  Oils
                </h3>
                <div className="space-y-2">
                  {result.oils.map((oil) => (
                    <div key={oil.oilId} className="dot-leader-row text-sm">
                      <span>{oil.name}</span>
                      <span>{formatWeight(oil.weight, recipe.unit)} {recipe.unit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#7c5d40]">
                  Water and Lye
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="dot-leader-row">
                    <span>Water</span>
                    <span>{formatWeight(result.totals.waterAmount, recipe.unit)} {recipe.unit}</span>
                  </div>
                  <div className="dot-leader-row">
                    <span>{getLyeLabel(recipe.lyeType)}</span>
                    <span>{formatWeight(result.totals.lyeAmount, recipe.unit)} {recipe.unit}</span>
                  </div>
                  <div className="dot-leader-row">
                    <span>Fragrance</span>
                    <span>{formatWeight(result.totals.fragranceWeight, recipe.unit)} {recipe.unit}</span>
                  </div>
                  <div className="dot-leader-row">
                    <span>Total batch</span>
                    <span>{formatWeight(result.totals.totalBatch, recipe.unit)} {recipe.unit}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
