import { RecipeState } from "@/lib/types";

export const DEFAULT_RECIPE: RecipeState = {
  recipeName: "",
  totalOilWeight: 0,
  fragranceWeight: 0,
  unit: "g",
  superfat: 0,
  water: {
    mode: "lyeConcentration",
    percentOfOils: 33,
    lyeConcentration: 0.33,
    waterLyeRatio: 2.03,
  },
  oils: [
    { id: "", percent: 0 },
    { id: "", percent: 0 },
    { id: "", percent: 0 },
  ],
};

export const EMPTY_RECIPE: RecipeState = {
  recipeName: "",
  totalOilWeight: 0,
  fragranceWeight: 0,
  unit: "g",
  superfat: 0,
  water: {
    mode: "lyeConcentration",
    percentOfOils: 33,
    lyeConcentration: 0.33,
    waterLyeRatio: 2.03,
  },
  oils: [
    { id: "", percent: 0 },
    { id: "", percent: 0 },
    { id: "", percent: 0 },
  ],
};

export const SAMPLE_RECIPE: RecipeState = {
  recipeName: "Workshop Conditioning Bar",
  totalOilWeight: 1200,
  fragranceWeight: 24,
  unit: "g",
  superfat: 6,
  water: {
    mode: "waterLyeRatio",
    percentOfOils: 33.18,
    lyeConcentration: 0.334,
    waterLyeRatio: 1.99,
  },
  oils: [
    { id: "beef-tallow", percent: 40 },
    { id: "olive-oil", percent: 25 },
    { id: "coconut-oil-76", percent: 20 },
    { id: "shea-butter", percent: 10 },
    { id: "castor-oil", percent: 5 },
  ],
};

export const STORAGE_KEY = "tallow-be-thy-soap-lab-v1";
