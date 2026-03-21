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
import { DEFAULT_RECIPE, SAMPLE_RECIPE, STORAGE_KEY } from "@/lib/defaults";
import { OIL_DATA, OIL_MAP } from "@/lib/oil-data";
import { EntryMode, RecipeState, WaterMode } from "@/lib/types";

type OilDraftMap = Record<string, { percent: string; weight: string }>;

const OUNCES_TO_GRAMS = 28.349523125;

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

function buildPrintHtml(recipe: RecipeState) {
  const result = calculateRecipe(recipe);
  const oilRows = result.oils
    .map(
      (oil) => `
        <div class="row">
          <span>${oil.name}</span>
          <span>${formatWeight(oil.weight, recipe.unit)} ${recipe.unit}</span>
        </div>`,
    )
    .join("");

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>${recipe.recipeName} | Tallow Be Thy Soap Lab</title>
      <style>
        body { margin: 0; background: #f6f0e7; color: #302219; font-family: Georgia, Cambria, "Times New Roman", serif; }
        .page { max-width: 760px; margin: 0 auto; padding: 32px; }
        .card { background: white; border: 1px solid #dbc9b1; border-radius: 22px; padding: 28px; box-shadow: 0 20px 50px rgba(69, 47, 19, 0.08); }
        .eyebrow { font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase; color: #8a6849; }
        h1 { margin: 10px 0 6px; font-size: 44px; line-height: 1; }
        .sub { margin: 0; color: #6d5848; font-size: 16px; }
        .section { margin-top: 28px; }
        .section h2 { margin: 0 0 12px; font-size: 15px; letter-spacing: 0.14em; text-transform: uppercase; color: #8a6849; }
        .row { display: grid; grid-template-columns: auto 1fr auto; gap: 10px; align-items: end; font-size: 16px; margin: 8px 0; }
        .row::before { content: ""; border-bottom: 2px dotted #ccb79d; order: 2; }
        .row span:first-child { order: 1; }
        .row span:last-child { order: 3; font-weight: 600; }
        .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 20px; margin-top: 24px; padding-top: 20px; border-top: 1px solid #eadfce; }
        .meta-item { font-size: 15px; color: #6d5848; }
        .meta-item strong { display: block; margin-top: 4px; color: #302219; font-size: 22px; }
        @media print { body { background: white; } .page { padding: 0; } .card { box-shadow: none; border-color: #d4c0a5; } }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="card">
          <p class="eyebrow">Tallow Be Thy Soap Lab</p>
          <h1>${recipe.recipeName}</h1>
          <p class="sub">Cold process recipe card</p>
          <div class="section">
            <h2>Oils</h2>
            ${oilRows}
          </div>
          <div class="section">
            <h2>Solution and Additives</h2>
            <div class="row"><span>Water</span><span>${formatWeight(result.totals.waterAmount, recipe.unit)} ${recipe.unit}</span></div>
            <div class="row"><span>NaOH</span><span>${formatWeight(result.totals.lyeAmount, recipe.unit)} ${recipe.unit}</span></div>
            <div class="row"><span>Fragrance</span><span>${formatWeight(result.totals.fragranceWeight, recipe.unit)} ${recipe.unit}</span></div>
            <div class="row"><span>Total batch</span><span>${formatWeight(result.totals.totalBatch, recipe.unit)} ${recipe.unit}</span></div>
          </div>
          <div class="meta">
            <div class="meta-item">Total oils<strong>${formatWeight(result.totals.oilWeight, recipe.unit)} ${recipe.unit}</strong></div>
            <div class="meta-item">Superfat<strong>${formatPercent(recipe.superfat)}%</strong></div>
            <div class="meta-item">Lye concentration<strong>${formatPercent(result.totals.lyeConcentration * 100)}%</strong></div>
            <div class="meta-item">Water : lye<strong>${formatRatio(result.totals.waterLyeRatio)}</strong></div>
          </div>
        </div>
      </div>
      <script>window.onload = () => window.print();</script>
    </body>
  </html>`;
}

export function SoapCalculator() {
  const [draftRecipe, setDraftRecipe] = useState<RecipeState>(DEFAULT_RECIPE);
  const [calculatedRecipe, setCalculatedRecipe] = useState<RecipeState | null>(DEFAULT_RECIPE);
  const [entryMode, setEntryMode] = useState<EntryMode>("percent");
  const [newOilId, setNewOilId] = useState("shea-butter");
  const [topLevelDrafts, setTopLevelDrafts] = useState(() => makeTopLevelDrafts(DEFAULT_RECIPE));
  const [oilDrafts, setOilDrafts] = useState<OilDraftMap>(() => makeOilDrafts(DEFAULT_RECIPE));
  const [copyMessage, setCopyMessage] = useState("");

  const result = useMemo(
    () => (calculatedRecipe ? calculateRecipe(calculatedRecipe) : null),
    [calculatedRecipe],
  );

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
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
    if (!copyMessage) return;
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
    if (parsed === null) return;
    updateDraft((current) => ({
      ...current,
      totalOilWeight: current.unit === "g" ? Math.max(parsed, 0) : Math.max(parsed, 0) * OUNCES_TO_GRAMS,
    }));
  };

  const handleFragranceWeightChange = (value: string) => {
    setTopLevelDrafts((current) => ({ ...current, fragranceWeight: value }));
    const parsed = parseLooseNumber(value);
    if (parsed === null) return;
    updateDraft((current) => ({
      ...current,
      fragranceWeight: current.unit === "g" ? Math.max(parsed, 0) : Math.max(parsed, 0) * OUNCES_TO_GRAMS,
    }));
  };

  const handleSuperfatChange = (value: string) => {
    setTopLevelDrafts((current) => ({ ...current, superfat: value }));
    const parsed = parseLooseNumber(value);
    if (parsed === null) return;
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
    if (parsed === null) return;
    updateDraft((current) => ({
      ...current,
      oils: current.oils.map((oil) => (oil.id === oilId ? { ...oil, percent: Math.max(parsed, 0) } : oil)),
    }));
  };

  const handleOilWeightChange = (oilId: string, value: string) => {
    updateOilDraft(oilId, "weight", value);
    const parsed = parseLooseNumber(value);
    if (parsed === null) return;
    updateDraft((current) => {
      const weightInGrams = current.unit === "g" ? parsed : parsed * OUNCES_TO_GRAMS;
      const percent = current.totalOilWeight > 0 ? (weightInGrams / current.totalOilWeight) * 100 : 0;
      return {
        ...current,
        oils: current.oils.map((oil) => (oil.id === oilId ? { ...oil, percent: Math.max(percent, 0) } : oil)),
      };
    });
  };

  const normalizeOilBlur = (oilId: string) => {
    const oil = draftRecipe.oils.find((item) => item.id === oilId);
    if (!oil) return;
    setOilDrafts((current) => ({
      ...current,
      [oilId]: {
        percent: trimTrailingZeros(formatPercent(oil.percent)),
        weight: trimTrailingZeros(formatWeight(draftRecipe.totalOilWeight * (oil.percent / 100), draftRecipe.unit)),
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
      if (parsed === null) return;
      updateDraft((current) => ({ ...current, water: { ...current.water, percentOfOils: clamp(parsed, 0, 100) } }));
      return;
    }

    if (mode === "lyeConcentration") {
      setTopLevelDrafts((current) => ({ ...current, lyeConcentration: value }));
      const parsed = parseLooseNumber(value);
      if (parsed === null) return;
      updateDraft((current) => ({ ...current, water: { ...current.water, lyeConcentration: clamp(parsed / 100, 0.1, 0.95) } }));
      return;
    }

    setTopLevelDrafts((current) => ({ ...current, waterLyeRatio: value }));
    const parsed = parseRatioInput(value);
    if (parsed === null) return;
    updateDraft((current) => ({ ...current, water: { ...current.water, waterLyeRatio: clamp(parsed, 0.5, 5) } }));
  };

  const normalizeWaterBlur = () => {
    setTopLevelDrafts((current) => ({
      ...current,
      waterPercentOfOils: trimTrailingZeros(formatPercent(draftRecipe.water.percentOfOils)),
      lyeConcentration: trimTrailingZeros(formatPercent(draftRecipe.water.lyeConcentration * 100)),
      waterLyeRatio: formatRatio(draftRecipe.water.waterLyeRatio),
    }));
  };

  const addOil = () => {
    if (!newOilId || draftRecipe.oils.some((oil) => oil.id === newOilId)) return;
    setDraftRecipe((current) => ({ ...current, oils: [...current.oils, { id: newOilId, percent: 0 }] }));
    setOilDrafts((current) => ({ ...current, [newOilId]: { percent: "", weight: "" } }));
  };

  const removeOil = (oilId: string) => {
    setDraftRecipe((current) => ({ ...current, oils: current.oils.filter((oil) => oil.id !== oilId) }));
    setOilDrafts((current) => {
      const next = { ...current };
      delete next[oilId];
      return next;
    });
  };

  const resetFormula = () => {
    setDraftRecipe(DEFAULT_RECIPE);
    setCalculatedRecipe(null);
    syncDraftsFromRecipe(DEFAULT_RECIPE);
    setEntryMode("percent");
  };

  const loadSample = () => {
    setDraftRecipe(SAMPLE_RECIPE);
    setCalculatedRecipe(null);
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
  };

  const handleCopy = async () => {
    if (!result || !calculatedRecipe) return;
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

  const handlePrint = () => {
    if (!calculatedRecipe) return;
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(buildPrintHtml(calculatedRecipe));
    printWindow.document.close();
  };

  const availableOilOptions = OIL_DATA.filter((oil) => !draftRecipe.oils.some((entry) => entry.id === oil.id));
  const totalPercentDifference = result ? roundTo(100 - result.totals.percent, 2) : 0;

  return (
    <main className="lab-shell">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="paper-card overflow-hidden p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--accent-strong)]">Artisan Cold Process Soap Calculator</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--text)] md:text-5xl">Tallow Be Thy Soap Lab</h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-[var(--text-soft)]">
                Enter your formula first, then calculate to generate a recipe summary and a printable batch card.
              </p>
            </div>
            {result ? (
              <div className="no-print flex flex-wrap gap-3">
                <button type="button" onClick={handleCopy} className="rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-strong)]">
                  Copy results
                </button>
                <button type="button" onClick={handlePrint} className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-strong)] px-4 py-3 text-sm font-medium text-[var(--text)]">
                  Open print card
                </button>
              </div>
            ) : null}
          </div>
          {copyMessage ? <p className="mt-4 text-sm text-[var(--accent-strong)]">{copyMessage}</p> : null}
        </section>

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
        </Card>

        <Card title="Oil composition" subtitle="Build the formula by percentage or by weight.">
          <div className="no-print mb-5 flex flex-col gap-3 rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 md:flex-row md:items-end">
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

        <div className="no-print flex justify-center">
          <button type="button" onClick={handleCalculate} className="rounded-2xl bg-[var(--accent)] px-8 py-4 text-base font-medium text-white transition hover:bg-[var(--accent-strong)]">
            Calculate recipe
          </button>
        </div>

        {result && calculatedRecipe ? (
          <>
            <Card title="Formula summary" subtitle="Calculated results from the current saved input set.">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Stat label="Total oils" value={`${formatWeight(result.totals.oilWeight, calculatedRecipe.unit)} ${calculatedRecipe.unit}`} />
                <Stat label="NaOH" value={`${formatWeight(result.totals.lyeAmount, calculatedRecipe.unit)} ${calculatedRecipe.unit}`} />
                <Stat label="Water" value={`${formatWeight(result.totals.waterAmount, calculatedRecipe.unit)} ${calculatedRecipe.unit}`} />
                <Stat label="Fragrance" value={`${formatWeight(result.totals.fragranceWeight, calculatedRecipe.unit)} ${calculatedRecipe.unit}`} hint="Optional" />
                <Stat label="Total batch" value={`${formatWeight(result.totals.totalBatch, calculatedRecipe.unit)} ${calculatedRecipe.unit}`} hint="Before cure" />
                <Stat label="Percent total" value={`${formatPercent(result.totals.percent)}%`} hint={totalPercentDifference === 0 ? "Balanced at 100%" : `${totalPercentDifference > 0 ? "Missing" : "Over by"} ${Math.abs(totalPercentDifference).toFixed(2)}%`} />
              </div>
            </Card>

            <Card title="Soap qualities" subtitle="Estimated from weighted oil profile data.">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(result.qualities).map(([key, value]) => <Stat key={key} label={key} value={roundTo(value, 2).toFixed(2)} />)}
              </div>
            </Card>

            <Card title="Warnings and notes" subtitle="Useful formulation flags before you make the batch.">
              {result.warnings.length === 0 ? (
                <p className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-soft)]">
                  No warning flags at the moment. This formula is balanced and ready for a print card.
                </p>
              ) : (
                <div className="space-y-3">
                  {result.warnings.map((warning) => (
                    <div key={warning} className="rounded-3xl border border-[rgba(149,109,47,0.18)] bg-[rgba(255,247,232,0.82)] p-4 text-sm leading-6 text-[var(--warning)]">
                      {warning}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        ) : null}
      </div>
    </main>
  );
}
