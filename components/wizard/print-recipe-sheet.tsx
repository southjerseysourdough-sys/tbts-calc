"use client";

import { formatPercent, formatWeight, roundTo } from "@/lib/calculations";
import { RecipeState, SoapCalculationResult, Unit } from "@/lib/types";

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
  const coreSettings = [
    { label: "Total oils", value: formatRecipeWeight(result.totals.oilWeight, recipe.unit) },
    { label: result.lye.label, value: formatRecipeWeight(result.lye.displayAmount, recipe.unit) },
    { label: "Water", value: formatRecipeWeight(result.totals.waterAmount, recipe.unit) },
    { label: "Superfat", value: `${formatPercent(recipe.superfat)}%` },
    { label: "Water setting", value: getWaterModeLabel(recipe, result) },
    { label: "Fragrance", value: result.totals.fragranceWeight > 0 ? formatRecipeWeight(result.totals.fragranceWeight, recipe.unit) : "Not used" },
  ];

  const solutionItems = [
    { label: result.lye.label, value: formatRecipeWeight(result.lye.displayAmount, recipe.unit) },
    { label: "Water", value: formatRecipeWeight(result.totals.waterAmount, recipe.unit) },
  ];

  const additiveItems =
    result.totals.fragranceWeight > 0
      ? [
          { label: "Fragrance", value: formatRecipeWeight(result.totals.fragranceWeight, recipe.unit) },
          { label: "Fragrance load", value: `${formatCompactNumber(recipe.fragranceLoad)} g/kg` },
        ]
      : [];

  return (
    <section
      className={`recipe-sheet${mode === "screen" ? " recipe-sheet--preview" : ""}`}
      aria-label="Printable recipe sheet"
    >
      <article className="recipe-sheet__paper">
        <header className="recipe-sheet__header">
          <p className="recipe-sheet__kicker">Workshop recipe sheet</p>
          <div className="recipe-sheet__title-block">
            <h1 className="recipe-sheet__title">{getRecipeTitle(recipe.recipeName)}</h1>
            <p className="recipe-sheet__subtitle">Formula-first printout for weighing, mixing, and saving as PDF.</p>
          </div>
          <p className="recipe-sheet__meta">Unit: {recipe.unit.toUpperCase()} | Pure alkali: {formatRecipeWeight(result.lye.pureAmount, recipe.unit)}</p>
        </header>

        <section className="recipe-sheet__section recipe-sheet__section--compact">
          <div className="recipe-sheet__section-heading">
            <h2 className="recipe-sheet__section-title">Core Batch Settings</h2>
          </div>
          <div className="recipe-sheet__summary-grid">
            {coreSettings.map((item) => (
              <div key={item.label} className="recipe-sheet__summary-row">
                <span className="recipe-sheet__summary-label">{item.label}</span>
                <strong className="recipe-sheet__summary-value">{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

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

        <div className="recipe-sheet__workbench-grid">
          <section className="recipe-sheet__section recipe-sheet__section--compact">
            <div className="recipe-sheet__section-heading">
              <h2 className="recipe-sheet__section-title">Lye Solution</h2>
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

          {additiveItems.length > 0 ? (
            <section className="recipe-sheet__section recipe-sheet__section--compact">
              <div className="recipe-sheet__section-heading">
                <h2 className="recipe-sheet__section-title">Additives / Notes</h2>
              </div>
              <div className="recipe-sheet__list">
                {additiveItems.map((item) => (
                  <div key={item.label} className="recipe-sheet__list-row">
                    <span className="recipe-sheet__list-label">{item.label}</span>
                    <strong className="recipe-sheet__list-value">{item.value}</strong>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {result.warnings.length > 0 ? (
          <section className="recipe-sheet__warnings">
            <div className="recipe-sheet__section-heading">
              <h2 className="recipe-sheet__section-title">Warnings</h2>
            </div>
            <ul className="recipe-sheet__warning-list">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </section>
  );
}
