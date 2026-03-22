import { OilCatalogItem, SoapQualityProfile } from "@/lib/types";

type OilSeed = {
  slug: string;
  name: string;
  category: string;
  naohSap: number;
  kohSap: number;
  sortOrder: number;
  notes: string | null;
};

const EMPTY_QUALITY_PROFILE: SoapQualityProfile = {
  hardness: 0,
  cleansing: 0,
  conditioning: 0,
  bubbly: 0,
  creamy: 0,
  iodine: 0,
  ins: 0,
};

export const LEGACY_OIL_SLUG_ALIASES: Record<string, string> = {
  "beef-tallow": "tallow",
};

export function normalizeOilSlug(slug: string) {
  return LEGACY_OIL_SLUG_ALIASES[slug] ?? slug;
}

const STARTER_OIL_SEEDS: OilSeed[] = [
  { slug: "tallow", name: "Tallow", category: "animal-fat", naohSap: 0.141, kohSap: 0.198, sortOrder: 10, notes: "General rendered tallow profile for cold process soap." },
  { slug: "olive-oil", name: "Olive Oil", category: "liquid-oil", naohSap: 0.134, kohSap: 0.188, sortOrder: 20, notes: "Classic olive oil profile." },
  { slug: "coconut-oil-76", name: "Coconut Oil 76", category: "hard-oil", naohSap: 0.183, kohSap: 0.257, sortOrder: 30, notes: "76 degree coconut oil." },
  { slug: "shea-butter", name: "Shea Butter", category: "butter", naohSap: 0.128, kohSap: 0.18, sortOrder: 40, notes: "Refined shea butter profile." },
  { slug: "castor-oil", name: "Castor Oil", category: "liquid-oil", naohSap: 0.128, kohSap: 0.179, sortOrder: 50, notes: "Standard castor oil profile." },
  { slug: "avocado-oil", name: "Avocado Oil", category: "liquid-oil", naohSap: 0.133, kohSap: 0.187, sortOrder: 60, notes: "Avocado oil profile." },
  { slug: "cocoa-butter", name: "Cocoa Butter", category: "butter", naohSap: 0.137, kohSap: 0.193, sortOrder: 70, notes: "Natural cocoa butter profile." },
  { slug: "mango-butter", name: "Mango Butter", category: "butter", naohSap: 0.137, kohSap: 0.192, sortOrder: 80, notes: "Mango butter profile." },
  { slug: "sweet-almond-oil", name: "Sweet Almond Oil", category: "liquid-oil", naohSap: 0.136, kohSap: 0.191, sortOrder: 90, notes: "Sweet almond oil profile." },
  { slug: "sunflower-oil", name: "Sunflower Oil", category: "liquid-oil", naohSap: 0.135, kohSap: 0.189, sortOrder: 100, notes: "Conventional sunflower oil profile." },
  { slug: "rice-bran-oil", name: "Rice Bran Oil", category: "liquid-oil", naohSap: 0.128, kohSap: 0.179, sortOrder: 110, notes: "Rice bran oil profile." },
  { slug: "lard", name: "Lard", category: "animal-fat", naohSap: 0.138, kohSap: 0.194, sortOrder: 120, notes: "Standard lard profile." },
  { slug: "babassu-oil", name: "Babassu Oil", category: "hard-oil", naohSap: 0.175, kohSap: 0.246, sortOrder: 130, notes: "Babassu oil profile." },
  { slug: "kokum-butter", name: "Kokum Butter", category: "butter", naohSap: 0.138, kohSap: 0.194, sortOrder: 140, notes: "Kokum butter profile." },
  { slug: "apricot-kernel-oil", name: "Apricot Kernel Oil", category: "liquid-oil", naohSap: 0.135, kohSap: 0.19, sortOrder: 150, notes: "Apricot kernel oil profile." },
];

const STARTER_OIL_QUALITY_PROFILES: Record<string, SoapQualityProfile> = {
  tallow: { hardness: 50, cleansing: 0, conditioning: 50, bubbly: 0, creamy: 50, iodine: 43, ins: 157 },
  "olive-oil": { hardness: 17, cleansing: 0, conditioning: 82, bubbly: 0, creamy: 17, iodine: 85, ins: 105 },
  "coconut-oil-76": { hardness: 79, cleansing: 67, conditioning: 10, bubbly: 67, creamy: 12, iodine: 10, ins: 258 },
  "shea-butter": { hardness: 45, cleansing: 0, conditioning: 55, bubbly: 0, creamy: 45, iodine: 59, ins: 116 },
  "castor-oil": { hardness: 1, cleansing: 0, conditioning: 98, bubbly: 90, creamy: 0, iodine: 86, ins: 95 },
  "avocado-oil": { hardness: 20, cleansing: 0, conditioning: 78, bubbly: 0, creamy: 20, iodine: 86, ins: 99 },
  "cocoa-butter": { hardness: 61, cleansing: 0, conditioning: 38, bubbly: 0, creamy: 61, iodine: 37, ins: 158 },
  "mango-butter": { hardness: 49, cleansing: 0, conditioning: 50, bubbly: 0, creamy: 49, iodine: 48, ins: 144 },
  "sweet-almond-oil": { hardness: 20, cleansing: 0, conditioning: 78, bubbly: 0, creamy: 20, iodine: 97, ins: 97 },
  "sunflower-oil": { hardness: 17, cleansing: 0, conditioning: 83, bubbly: 0, creamy: 17, iodine: 133, ins: 63 },
  "rice-bran-oil": { hardness: 26, cleansing: 0, conditioning: 74, bubbly: 0, creamy: 26, iodine: 70, ins: 108 },
  lard: { hardness: 42, cleansing: 1, conditioning: 57, bubbly: 1, creamy: 41, iodine: 57, ins: 139 },
  "babassu-oil": { hardness: 70, cleansing: 50, conditioning: 20, bubbly: 50, creamy: 20, iodine: 17, ins: 230 },
  "kokum-butter": { hardness: 59, cleansing: 0, conditioning: 39, bubbly: 0, creamy: 59, iodine: 34, ins: 161 },
  "apricot-kernel-oil": { hardness: 18, cleansing: 0, conditioning: 81, bubbly: 0, creamy: 18, iodine: 99, ins: 91 },
};

export function getOilQualityProfile(slug: string) {
  return STARTER_OIL_QUALITY_PROFILES[normalizeOilSlug(slug)] ?? EMPTY_QUALITY_PROFILE;
}

export const FALLBACK_OILS: OilCatalogItem[] = STARTER_OIL_SEEDS.map((oil) => ({
  id: `local-${oil.slug}`,
  slug: oil.slug,
  name: oil.name,
  category: oil.category,
  sapNaoh: oil.naohSap,
  sapKoh: oil.kohSap,
  isActive: true,
  sortOrder: oil.sortOrder,
  notes: oil.notes,
  qualities: getOilQualityProfile(oil.slug),
}));

export function createOilCatalogMap(oils: OilCatalogItem[]) {
  return new Map(oils.map((oil) => [normalizeOilSlug(oil.slug), oil]));
}

export const FALLBACK_OIL_MAP = createOilCatalogMap(FALLBACK_OILS);

export function getInitialOilSlug(oils: OilCatalogItem[]) {
  return oils[0]?.slug ?? "";
}
