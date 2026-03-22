import { RecipeState } from "@/lib/types";

export const FEATURED_OIL_IDS = [
  "beef-tallow",
  "olive-oil",
  "coconut-oil-76",
  "shea-butter",
  "castor-oil",
  "avocado-oil",
  "cocoa-butter",
  "mango-butter",
  "sweet-almond-oil",
  "sunflower-oil",
] as const;

export const DEFAULT_RECIPE: RecipeState = {
  recipeName: "Foundry Cream Bar",
  totalOilWeight: 1200,
  unit: "g",
  superfat: 5,
  water: {
    mode: "lyeConcentration",
    percentOfOils: 31.66,
    lyeConcentration: 0.33,
    waterLyeRatio: 2.03,
  },
  lyeType: "naoh",
  fragranceLoad: 18,
  oils: [
    { id: "beef-tallow", percent: 40 },
    { id: "olive-oil", percent: 25 },
    { id: "coconut-oil-76", percent: 20 },
    { id: "shea-butter", percent: 10 },
    { id: "castor-oil", percent: 5 },
  ],
};

export const EMPTY_RECIPE: RecipeState = {
  recipeName: "",
  totalOilWeight: 0,
  unit: "g",
  superfat: 5,
  water: {
    mode: "lyeConcentration",
    percentOfOils: 33,
    lyeConcentration: 0.33,
    waterLyeRatio: 2.03,
  },
  lyeType: "naoh",
  fragranceLoad: 0,
  oils: [
    { id: "beef-tallow", percent: 0 },
    { id: "olive-oil", percent: 0 },
    { id: "coconut-oil-76", percent: 0 },
  ],
};

export const SAMPLE_RECIPE: RecipeState = {
  recipeName: "Cottage Garden Facial Bar",
  totalOilWeight: 1000,
  unit: "g",
  superfat: 6,
  water: {
    mode: "waterLyeRatio",
    percentOfOils: 32.87,
    lyeConcentration: 0.341,
    waterLyeRatio: 1.93,
  },
  lyeType: "naoh",
  fragranceLoad: 22,
  oils: [
    { id: "olive-oil", percent: 32 },
    { id: "beef-tallow", percent: 28 },
    { id: "coconut-oil-76", percent: 18 },
    { id: "avocado-oil", percent: 10 },
    { id: "cocoa-butter", percent: 7 },
    { id: "castor-oil", percent: 5 },
  ],
};

export const STORAGE_KEY = "tallow-be-thy-soap-lab-v2";
