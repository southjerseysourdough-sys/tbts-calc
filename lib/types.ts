export type Unit = "g" | "oz";
export type WaterMode = "percentOfOils" | "lyeConcentration" | "waterLyeRatio";
export type EntryMode = "percent" | "weight";
export type LyeType = "naoh" | "koh" | "koh90";

export type SoapQualityKey =
  | "hardness"
  | "cleansing"
  | "conditioning"
  | "bubbly"
  | "creamy"
  | "iodine"
  | "ins";

export type SoapQualityProfile = Record<SoapQualityKey, number>;

export type OilCatalogItem = {
  id: string;
  slug: string;
  name: string;
  category: string;
  sapNaoh: number;
  sapKoh: number;
  isActive: boolean;
  sortOrder: number;
  notes: string | null;
  qualities: SoapQualityProfile;
};

export type RecipeOil = {
  id: string;
  percent: number;
};

export type WaterSettings = {
  mode: WaterMode;
  percentOfOils: number;
  lyeConcentration: number;
  waterLyeRatio: number;
};

export type RecipeState = {
  recipeName: string;
  totalOilWeight: number;
  unit: Unit;
  superfat: number;
  water: WaterSettings;
  lyeType: LyeType;
  fragranceLoad: number;
  oils: RecipeOil[];
};

export type OilCalculation = {
  oilId: string;
  name: string;
  percent: number;
  weight: number;
  sapNaoh: number;
  sapKoh: number;
  lyeNaoh: number;
  lyeKoh: number;
  qualities: SoapQualityProfile;
};

export type SoapCalculationResult = {
  oils: OilCalculation[];
  totals: {
    oilWeight: number;
    percent: number;
    fragranceLoad: number;
    fragranceWeight: number;
    lyeAmount: number;
    lyePureAmount: number;
    waterAmount: number;
    totalBatch: number;
    lyeConcentration: number;
    waterLyeRatio: number;
    waterPercentOfOils: number;
  };
  lye: {
    type: LyeType;
    label: string;
    purity: number;
    displayAmount: number;
    pureAmount: number;
    naohAmount: number;
    kohAmount: number;
  };
  qualities: SoapQualityProfile;
  warnings: string[];
};
