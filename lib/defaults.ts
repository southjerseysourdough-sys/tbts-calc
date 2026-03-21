import { RecipeState } from "@/lib/types";

export const DEFAULT_RECIPE: RecipeState = {
  recipeName: "Founder's Tallow Bar",
  totalOilWeight: 1000,
  fragranceWeight: 0,
  unit: "g",
  superfat: 5,
  lyeType: "naoh",
  water: {
    mode: "lyeConcentration",
    percentOfOils: 33,
    lyeConcentration: 0.33,
    waterLyeRatio: 2.03,
  },
  oils: [
    { id: "beef-tallow", percent: 50 },
    { id: "olive-oil", percent: 30 },
    { id: "coconut-oil-76", percent: 20 },
  ],
};

export const SAMPLE_RECIPE: RecipeState = {
  recipeName: "Workshop Conditioning Bar",
  totalOilWeight: 1200,
  fragranceWeight: 24,
  unit: "g",
  superfat: 6,
  lyeType: "naoh",
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
