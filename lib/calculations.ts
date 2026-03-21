import { OIL_MAP } from "@/lib/oil-data";
import {
  OilCalculation,
  RecipeOil,
  RecipeState,
  SoapCalculationResult,
  SoapQualityKey,
  SoapQualityProfile,
  Unit,
  WaterMode,
} from "@/lib/types";

const OUNCES_TO_GRAMS = 28.349523125;
const QUALITY_KEYS: SoapQualityKey[] = [
  "hardness",
  "cleansing",
  "conditioning",
  "bubbly",
  "creamy",
  "iodine",
  "ins",
];

export function roundTo(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

export function convertFromGrams(value: number, unit: Unit) {
  return unit === "g" ? value : value / OUNCES_TO_GRAMS;
}

export function formatWeight(value: number, unit: Unit) {
  return roundTo(convertFromGrams(value, unit), 2).toFixed(2);
}

export function formatPercent(value: number) {
  return roundTo(value, 2).toFixed(2);
}

export function parseLooseNumber(input: string) {
  const cleaned = input.trim().replace(/,/g, "");
  if (cleaned === "" || cleaned === "." || cleaned === "-" || cleaned === "-.") {
    return null;
  }
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function parseRatioInput(input: string) {
  const cleaned = input.trim();
  if (cleaned === "") {
    return null;
  }

  const ratioMatch = cleaned.match(/^(\d*\.?\d+)\s*:\s*1(?:\.0*)?$/i);
  if (ratioMatch) {
    return Number(ratioMatch[1]);
  }

  const direct = parseLooseNumber(cleaned);
  return direct !== null ? direct : null;
}

export function formatRatio(value: number) {
  return `${roundTo(value, 2).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}:1`;
}

export function getWaterFromMode(
  mode: WaterMode,
  oilWeight: number,
  lyeAmount: number,
  settings: RecipeState["water"],
) {
  if (lyeAmount <= 0 || oilWeight <= 0) {
    return 0;
  }

  switch (mode) {
    case "percentOfOils":
      return oilWeight * (settings.percentOfOils / 100);
    case "lyeConcentration": {
      const concentration = clamp(settings.lyeConcentration, 0.1, 0.95);
      return lyeAmount * ((1 - concentration) / concentration);
    }
    case "waterLyeRatio":
      return lyeAmount * settings.waterLyeRatio;
  }
}

function summarizeQuality(oils: OilCalculation[], totalOilWeight: number): SoapQualityProfile {
  const initial: SoapQualityProfile = {
    hardness: 0,
    cleansing: 0,
    conditioning: 0,
    bubbly: 0,
    creamy: 0,
    iodine: 0,
    ins: 0,
  };

  if (totalOilWeight <= 0) {
    return initial;
  }

  for (const oil of oils) {
    const share = oil.weight / totalOilWeight;
    for (const key of QUALITY_KEYS) {
      initial[key] += oil.qualities[key] * share;
    }
  }

  for (const key of QUALITY_KEYS) {
    initial[key] = roundTo(initial[key], 2);
  }

  return initial;
}

function getWarnings(oils: OilCalculation[], totals: SoapCalculationResult["totals"]) {
  const warnings: string[] = [];
  const coconut = oils.find((oil) => oil.oilId === "coconut-oil-76");
  const castor = oils.find((oil) => oil.oilId === "castor-oil");
  const percentTotalGap = Math.abs(totals.percent - 100);

  if (percentTotalGap > 0.01) {
    warnings.push(
      `Oil percentages currently total ${formatPercent(totals.percent)}%, so lye values may not reflect a balanced 100% formula.`,
    );
  }
  if (coconut && coconut.percent > 30) {
    warnings.push(
      "Coconut oil is above 30%, which can create a very cleansing or drying bar unless compensated carefully.",
    );
  }
  if (castor && castor.percent > 12) {
    warnings.push(
      "Castor oil is above 12%, which can make bars feel sticky or softer than expected.",
    );
  }
  if (totals.waterPercentOfOils > 40) {
    warnings.push(
      "Water is above 40% of oils, which may lengthen cure time and increase the risk of slower unmolding.",
    );
  }
  if (totals.waterPercentOfOils < 22) {
    warnings.push(
      "Water is below 22% of oils, which can accelerate trace and reduce time for intricate designs.",
    );
  }

  return warnings;
}

export function calculateRecipe(recipe: RecipeState): SoapCalculationResult {
  const totalOilWeight = Math.max(Number.isFinite(recipe.totalOilWeight) ? recipe.totalOilWeight : 0, 0);
  const fragranceWeight = Math.max(
    Number.isFinite(recipe.fragranceWeight) ? recipe.fragranceWeight : 0,
    0,
  );

  const oils: OilCalculation[] = recipe.oils
    .map((recipeOil: RecipeOil) => {
      const definition = OIL_MAP.get(recipeOil.id);
      if (!definition) {
        return null;
      }

      const percent = Math.max(recipeOil.percent, 0);
      const weight = totalOilWeight * (percent / 100);
      const baseNaoh = weight * definition.sapNaoh;
      const discountMultiplier = 1 - recipe.superfat / 100;

      return {
        oilId: definition.id,
        name: definition.name,
        percent: roundTo(percent, 4),
        weight: roundTo(weight, 6),
        sapNaoh: definition.sapNaoh,
        lyeNaoh: roundTo(baseNaoh * discountMultiplier, 6),
        qualities: definition.qualities,
      };
    })
    .filter((oil): oil is OilCalculation => oil !== null);

  const percentTotal = oils.reduce((sum, oil) => sum + oil.percent, 0);
  const lyeAmount = oils.reduce((sum, oil) => sum + oil.lyeNaoh, 0);
  const waterAmount = getWaterFromMode(recipe.water.mode, totalOilWeight, lyeAmount, recipe.water);
  const lyeConcentration = lyeAmount > 0 ? lyeAmount / (lyeAmount + waterAmount) : 0;
  const waterLyeRatio = lyeAmount > 0 ? waterAmount / lyeAmount : 0;
  const waterPercentOfOils = totalOilWeight > 0 ? (waterAmount / totalOilWeight) * 100 : 0;

  const totals = {
    oilWeight: roundTo(totalOilWeight, 6),
    fragranceWeight: roundTo(fragranceWeight, 6),
    percent: roundTo(percentTotal, 4),
    lyeAmount: roundTo(lyeAmount, 6),
    waterAmount: roundTo(waterAmount, 6),
    totalBatch: roundTo(totalOilWeight + lyeAmount + waterAmount + fragranceWeight, 6),
    lyeConcentration: roundTo(lyeConcentration, 6),
    waterLyeRatio: roundTo(waterLyeRatio, 6),
    waterPercentOfOils: roundTo(waterPercentOfOils, 6),
  };

  return {
    oils,
    totals,
    qualities: summarizeQuality(oils, totalOilWeight),
    warnings: getWarnings(oils, totals),
  };
}

export function normalizePercentages(oils: RecipeOil[]) {
  const cleaned = oils.map((oil) => ({ ...oil, percent: roundTo(Math.max(0, oil.percent), 4) }));
  const total = cleaned.reduce((sum, oil) => sum + oil.percent, 0);

  if (total <= 0) {
    return cleaned;
  }

  const normalized = cleaned.map((oil) => ({
    ...oil,
    percent: roundTo((oil.percent / total) * 100, 4),
  }));

  const normalizedTotal = normalized.reduce((sum, oil) => sum + oil.percent, 0);
  const remainder = roundTo(100 - normalizedTotal, 4);
  if (Math.abs(remainder) > 0.0001 && normalized.length > 0) {
    normalized[normalized.length - 1] = {
      ...normalized[normalized.length - 1],
      percent: roundTo(normalized[normalized.length - 1].percent + remainder, 4),
    };
  }

  return normalized;
}

export function deriveWaterSettingsFromCurrent(
  mode: WaterMode,
  currentResult: SoapCalculationResult,
) {
  return {
    percentOfOils: clamp(currentResult.totals.waterPercentOfOils, 0, 100),
    lyeConcentration: clamp(currentResult.totals.lyeConcentration || 0.33, 0.1, 0.95),
    waterLyeRatio: clamp(currentResult.totals.waterLyeRatio || 2, 0.5, 5),
    mode,
  };
}
