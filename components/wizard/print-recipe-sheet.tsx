"use client";

import { formatPercent, formatWeight, roundTo } from "@/lib/calculations";
import { RecipeState, SoapCalculationResult, SoapQualityKey, Unit } from "@/lib/types";

const QUALITY_ORDER: { key: SoapQualityKey; label: string }[] = [
  { key: "hardness", label: "Hardness" },
  { key: "cleansing", label: "Cleansing" },
  { key: "conditioning", label: "Conditioning" },
  { key: "bubbly", label: "Bubbly" },
  { key: "creamy", label: "Creamy" },
  { key: "iodine", label: "Iodine" },
  { key: "ins", label: "INS" },
];

type RecipePrintSheetProps = {
  recipe: RecipeState;
  result: SoapCalculationResult;
  getWaterModeLabel: (recipe: RecipeState, result: SoapCalculationResult) => string;
  mode?: "screen" | "print";
};

function formatRecipeWeight(value: number, unit: Unit) {
  return `${formatWeight(value, unit)} ${unit}`;
}

function formatCompactNumber(value: number, digits = 2) {
  return roundTo(value, digits)
    .toFixed(digits)
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1");
}

function getRecipeTitle(recipeName: string) {
  const trimmedName = recipeName.trim();
  return trimmedName.length > 0 ? trimmedName : "Untitled recipe";
}

export function RecipePrintSheet({
  recipe,
  result,
  getWaterModeLabel,
  mode = "print",
}: RecipePrintSheetProps) {
  const overviewItems = [
    { label: "Total oils", value: formatRecipeWeight(result.totals.oilWeight, recipe.unit) },
    { label: "Total batch", value: formatRecipeWeight(result.totals.totalBatch, recipe.unit) },
    { label: "Superfat", value: `${formatPercent(recipe.superfat)}%` },
    { label: "Water setting", value: getWaterModeLabel(recipe, result) },
    { label: result.lye.label, value: formatRecipeWeight(result.lye.displayAmount, recipe.unit) },
    { label: "Water", value: formatRecipeWeight(result.totals.waterAmount, recipe.unit) },
    { label: "Fragrance", value: formatRecipeWeight(result.totals.fragranceWeight, recipe.unit) },
  ];

  const solutionItems = [
    { label: result.lye.label, value: formatRecipeWeight(result.lye.displayAmount, recipe.unit) },
    { label: "Pure alkali", value: formatRecipeWeight(result.lye.pureAmount, recipe.unit) },
    { label: "Water", value: formatRecipeWeight(result.totals.waterAmount, recipe.unit) },
    { label: "Total solution", value: formatRecipeWeight(result.lye.displayAmount + result.totals.waterAmount, recipe.unit) },
  ];

  const additiveItems = [
    { label: "Superfat", value: `${formatPercent(recipe.superfat)}%` },
    { label: "Water setting", value: getWaterModeLabel(recipe, result) },
    { label: "Fragrance load", value: `${formatCompactNumber(recipe.fragranceLoad)} g/kg` },
    {
      label: "Fragrance",
      value: result.totals.fragranceWeight > 0 ? formatRecipeWeight(result.totals.fragranceWeight, recipe.unit) : "Not added",
    },
  ];

  return (
    <section
      className={`recipe-sheet${mode === "screen" ? " recipe-sheet--preview" : ""}`}
      aria-label="Printable recipe sheet"
    >
      <article className="recipe-sheet__paper">
        <header className="recipe-sheet__header">
          <div className="recipe-sheet__brandline">
            <p className="recipe-sheet__kicker">Tallow Be Thy Soap</p>
            <p className="recipe-sheet__document-label">Guided cold process soap recipe card</p>
          </div>
          <div className="recipe-sheet__title-block">
            <h1 className="recipe-sheet__title">{getRecipeTitle(recipe.recipeName)}</h1>
            <p className="recipe-sheet__subtitle">
              A clean, workshop-ready recipe sheet for mixing, pouring, and saving as PDF.
            </p>
          </div>
          <div className="recipe-sheet__meta">
            <span>Unit: {recipe.unit.toUpperCase()}</span>
            <span>Alkali: {result.lye.label}</span>
            <span>Pure alkali: {formatRecipeWeight(result.lye.pureAmount, recipe.unit)}</span>
          </div>
        </header>

        <section className="recipe-sheet__section">
          <div className="recipe-sheet__section-heading">
            <h2 className="recipe-sheet__section-title">Batch Overview</h2>
            <p className="recipe-sheet__section-kicker">Core batch settings at a glance</p>
          </div>
          <div className="recipe-sheet__overview-grid">
            {overviewItems.map((item) => (
              <div key={item.label} className="recipe-sheet__metric">
                <span className="recipe-sheet__metric-label">{item.label}</span>
                <strong className="recipe-sheet__metric-value">{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <div className="recipe-sheet__content">
          <div className="recipe-sheet__stack">
            <section className="recipe-sheet__section recipe-sheet__section--formula">
              <div className="recipe-sheet__section-heading">
                <h2 className="recipe-sheet__section-title">Formula</h2>
                <p className="recipe-sheet__section-kicker">Weigh these oils and fats first</p>
              </div>
              <div className="recipe-sheet__list">
                {result.oils.map((oil) => (
                  <div key={oil.oilId} className="recipe-sheet__list-row recipe-sheet__list-row--formula">
                    <span className="recipe-sheet__list-label recipe-sheet__list-label--formula">
                      {oil.name} <em>({formatPercent(oil.percent)}%)</em>
                    </span>
                    <strong className="recipe-sheet__list-value recipe-sheet__list-value--formula">
                      {formatRecipeWeight(oil.weight, recipe.unit)}
                    </strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="recipe-sheet__section">
              <div className="recipe-sheet__section-heading">
                <h2 className="recipe-sheet__section-title">Soap Qualities</h2>
                <p className="recipe-sheet__section-kicker">Support profile for the working formula</p>
              </div>
              <div className="recipe-sheet__qualities-grid">
                {QUALITY_ORDER.map(({ key, label }) => (
                  <div key={key} className="recipe-sheet__quality">
                    <span className="recipe-sheet__quality-label">{label}</span>
                    <strong className="recipe-sheet__quality-value">
                      {roundTo(result.qualities[key], 2).toFixed(2)}
                    </strong>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="recipe-sheet__stack">
            <section className="recipe-sheet__section">
              <div className="recipe-sheet__section-heading">
                <h2 className="recipe-sheet__section-title">NaOH and Water</h2>
                <p className="recipe-sheet__section-kicker">Measure the lye solution separately</p>
              </div>
              <div className="recipe-sheet__list">
                {solutionItems.map((item) => (
                  <div key={item.label} className="recipe-sheet__list-row">
                    <span className="recipe-sheet__list-label">{item.label}</span>
                    <strong className="recipe-sheet__list-value">{item.value}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="recipe-sheet__section">
              <div className="recipe-sheet__section-heading">
                <h2 className="recipe-sheet__section-title">Settings and Additives</h2>
                <p className="recipe-sheet__section-kicker">Keep these supports in view while batching</p>
              </div>
              <div className="recipe-sheet__list">
                {additiveItems.map((item) => (
                  <div key={item.label} className="recipe-sheet__list-row">
                    <span className="recipe-sheet__list-label">{item.label}</span>
                    <strong className="recipe-sheet__list-value">{item.value}</strong>
                  </div>
                ))}
              </div>
              <p className="recipe-sheet__note">
                {result.totals.fragranceWeight > 0
                  ? "No additional additives entered beyond fragrance."
                  : "No fragrance or additional additives entered."}
              </p>
            </section>

            <section className="recipe-sheet__warnings">
              <div className="recipe-sheet__section-heading">
                <h2 className="recipe-sheet__section-title">Warnings and Notes</h2>
                <p className="recipe-sheet__section-kicker">Final checks before making the batch</p>
              </div>
              {result.warnings.length === 0 ? (
                <p className="recipe-sheet__warning-empty">No warning flags.</p>
              ) : (
                <ul className="recipe-sheet__warning-list">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </article>
    </section>
  );
}
