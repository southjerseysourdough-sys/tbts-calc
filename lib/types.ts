export type Unit = "g" | "oz";
export type LyeType = "naoh" | "koh";
export type WaterMode = "percentOfOils" | "lyeConcentration" | "waterLyeRatio";
export type EntryMode = "percent" | "weight";

export type SoapQualityKey =
  | "hardness"
  | "cleansing"
  | "conditioning"
  | "bubbly"
  | "creamy"
  | "iodine"
  | "ins";

export type SoapQualityProfile = Record<SoapQualityKey, number>;

export type OilDefinition = {
  id: string;
  name: string;
  sapNaoh: number;
  sapKoh: number;
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
  fragranceWeight: number;
  unit: Unit;
  superfat: number;
  lyeType: LyeType;
  water: WaterSettings;
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
    fragranceWeight: number;
    percent: number;
    lyeAmount: number;
    waterAmount: number;
    totalBatch: number;
    lyeConcentration: number;
    waterLyeRatio: number;
    waterPercentOfOils: number;
  };
  qualities: SoapQualityProfile;
  warnings: string[];
};
