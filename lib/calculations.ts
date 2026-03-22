import { FALLBACK_OIL_MAP, normalizeOilSlug } from "@/lib/calculator/oils";
import {
  LyeType,
  OilCatalogItem,
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

export function convertToGrams(value: number, unit: Unit) {
  return unit === "g" ? value : value * OUNCES_TO_GRAMS;
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

  const ratioMatch = cleaned.match(/^(\d*\.?\d+)(?:\s*:\s*1(?:\.0*)?)?$/i);
  if (!ratioMatch) {
    return null;
  }

  const value = Number(ratioMatch[1]);
  return Number.isFinite(value) ? value : null;
}

export function formatRatio(value: number) {
  return `${roundTo(value, 2).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}:1`;
}

function getLyeProfile(lyeType: LyeType, naohAmount: number, kohAmount: number) {
  switch (lyeType) {
    case "naoh":
      return {
        type: lyeType,
        label: "NaOH",
        purity: 1,
        pureAmount: naohAmount,
        displayAmount: naohAmount,
        naohAmount,
        kohAmount,
      };
    case "koh":
      return {
        type: lyeType,
        label: "KOH",
        purity: 1,
        pureAmount: kohAmount,
        displayAmount: kohAmount,
        naohAmount,
        kohAmount,
      };
    case "koh90":
      return {
        type: lyeType,
        label: "KOH (90%)",
        purity: 0.9,
        pureAmount: kohAmount,
        displayAmount: kohAmount / 0.9,
        naohAmount,
        kohAmount,
      };
  }
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

function getWarnings(oils: OilCalculation[], result: SoapCalculationResult) {
  const warnings: string[] = [];
  const coconut = oils.find((oil) => oil.oilId === "coconut-oil-76" || oil.oilId === "coconut-oil-92");
  const castor = oils.find((oil) => oil.oilId === "castor-oil");
  const percentTotalGap = Math.abs(result.totals.percent - 100);

  if (percentTotalGap > 0.01) {
    warnings.push(
      `Oil percentages currently total ${formatPercent(result.totals.percent)}%, so lye values may not reflect a balanced 100% formula.`,
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
  if (result.totals.waterPercentOfOils > 40) {
    warnings.push(
      "Water is above 40% of oils, which may lengthen cure time and increase the risk of slower unmolding.",
    );
  }
  if (result.totals.waterPercentOfOils < 22 && result.totals.waterPercentOfOils > 0) {
    warnings.push(
      "Water is below 22% of oils, which can accelerate trace and reduce time for intricate designs.",
    );
  }
  if (result.lye.type === "koh90") {
    warnings.push(
      "KOH (90%) includes built-in water. Double-check your final liquid balance if you are matching a formula from a 100% purity calculator.",
    );
  }
  if (result.lye.type !== "naoh") {
    warnings.push(
      "This recipe is using potassium hydroxide. Make sure your intended soap style and curing process match the selected alkali.",
    );
  }
  if (result.totals.fragranceLoad > 40) {
    warnings.push(
      "Fragrance load is above 40 g/kg of oils. Verify IFRA guidance and the supplier's safe usage rate before making a full batch.",
    );
  }

  return warnings;
}

export function calculateRecipe(
  recipe: RecipeState,
  oilCatalog: Map<string, OilCatalogItem> = FALLBACK_OIL_MAP,
): SoapCalculationResult {
  const totalOilWeight = Math.max(Number.isFinite(recipe.totalOilWeight) ? recipe.totalOilWeight : 0, 0);
  const fragranceLoad = Math.max(Number.isFinite(recipe.fragranceLoad) ? recipe.fragranceLoad : 0, 0);

  const oils: OilCalculation[] = recipe.oils
    .map((recipeOil: RecipeOil) => {
      const definition = oilCatalog.get(normalizeOilSlug(recipeOil.id));
      if (!definition) {
        return null;
      }

      const percent = Math.max(recipeOil.percent, 0);
      const weight = totalOilWeight * (percent / 100);
      const discountMultiplier = 1 - recipe.superfat / 100;

      return {
        oilId: definition.slug,
        name: definition.name,
        percent: roundTo(percent, 4),
        weight: roundTo(weight, 6),
        sapNaoh: definition.sapNaoh,
        sapKoh: definition.sapKoh,
        lyeNaoh: roundTo(weight * definition.sapNaoh * discountMultiplier, 6),
        lyeKoh: roundTo(weight * definition.sapKoh * discountMultiplier, 6),
        qualities: definition.qualities,
      };
    })
    .filter((oil): oil is OilCalculation => oil !== null);

  const percentTotal = oils.reduce((sum, oil) => sum + oil.percent, 0);
  const naohAmount = oils.reduce((sum, oil) => sum + oil.lyeNaoh, 0);
  const kohAmount = oils.reduce((sum, oil) => sum + oil.lyeKoh, 0);
  const lye = getLyeProfile(recipe.lyeType, naohAmount, kohAmount);
  const fragranceWeight = totalOilWeight * (fragranceLoad / 1000);
  const waterAmount = getWaterFromMode(recipe.water.mode, totalOilWeight, lye.displayAmount, recipe.water);
  const lyeConcentration = lye.displayAmount > 0 ? lye.displayAmount / (lye.displayAmount + waterAmount) : 0;
  const waterLyeRatio = lye.displayAmount > 0 ? waterAmount / lye.displayAmount : 0;
  const waterPercentOfOils = totalOilWeight > 0 ? (waterAmount / totalOilWeight) * 100 : 0;

  const totals = {
    oilWeight: roundTo(totalOilWeight, 6),
    percent: roundTo(percentTotal, 4),
    fragranceLoad: roundTo(fragranceLoad, 4),
    fragranceWeight: roundTo(fragranceWeight, 6),
    lyeAmount: roundTo(lye.displayAmount, 6),
    lyePureAmount: roundTo(lye.pureAmount, 6),
    waterAmount: roundTo(waterAmount, 6),
    totalBatch: roundTo(totalOilWeight + lye.displayAmount + waterAmount + fragranceWeight, 6),
    lyeConcentration: roundTo(lyeConcentration, 6),
    waterLyeRatio: roundTo(waterLyeRatio, 6),
    waterPercentOfOils: roundTo(waterPercentOfOils, 6),
  };

  const result: SoapCalculationResult = {
    oils,
    totals,
    lye: {
      ...lye,
      displayAmount: roundTo(lye.displayAmount, 6),
      pureAmount: roundTo(lye.pureAmount, 6),
      naohAmount: roundTo(naohAmount, 6),
      kohAmount: roundTo(kohAmount, 6),
    },
    qualities: summarizeQuality(oils, totalOilWeight),
    warnings: [],
  };

  result.warnings = getWarnings(oils, result);

  return result;
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
