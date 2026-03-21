import { OilDefinition } from "@/lib/types";

export const OIL_DATA: OilDefinition[] = [
  {
    id: "beef-tallow",
    name: "Beef tallow",
    sapNaoh: 0.141,
    sapKoh: 0.198,
    qualities: { hardness: 50, cleansing: 0, conditioning: 50, bubbly: 0, creamy: 50, iodine: 43, ins: 157 },
  },
  {
    id: "olive-oil",
    name: "Olive oil",
    sapNaoh: 0.134,
    sapKoh: 0.188,
    qualities: { hardness: 17, cleansing: 0, conditioning: 82, bubbly: 0, creamy: 17, iodine: 85, ins: 105 },
  },
  {
    id: "coconut-oil-76",
    name: "Coconut oil 76",
    sapNaoh: 0.183,
    sapKoh: 0.257,
    qualities: { hardness: 79, cleansing: 67, conditioning: 10, bubbly: 67, creamy: 12, iodine: 10, ins: 258 },
  },
  {
    id: "shea-butter",
    name: "Shea butter",
    sapNaoh: 0.128,
    sapKoh: 0.18,
    qualities: { hardness: 45, cleansing: 0, conditioning: 55, bubbly: 0, creamy: 45, iodine: 59, ins: 116 },
  },
  {
    id: "castor-oil",
    name: "Castor oil",
    sapNaoh: 0.128,
    sapKoh: 0.179,
    qualities: { hardness: 1, cleansing: 0, conditioning: 98, bubbly: 90, creamy: 0, iodine: 86, ins: 95 },
  },
  {
    id: "avocado-oil",
    name: "Avocado oil",
    sapNaoh: 0.133,
    sapKoh: 0.187,
    qualities: { hardness: 20, cleansing: 0, conditioning: 78, bubbly: 0, creamy: 20, iodine: 86, ins: 99 },
  },
  {
    id: "sweet-almond-oil",
    name: "Sweet almond oil",
    sapNaoh: 0.136,
    sapKoh: 0.191,
    qualities: { hardness: 20, cleansing: 0, conditioning: 78, bubbly: 0, creamy: 20, iodine: 97, ins: 97 },
  },
  {
    id: "sunflower-oil",
    name: "Sunflower oil",
    sapNaoh: 0.135,
    sapKoh: 0.189,
    qualities: { hardness: 17, cleansing: 0, conditioning: 83, bubbly: 0, creamy: 17, iodine: 133, ins: 63 },
  },
  {
    id: "cocoa-butter",
    name: "Cocoa butter",
    sapNaoh: 0.137,
    sapKoh: 0.193,
    qualities: { hardness: 61, cleansing: 0, conditioning: 38, bubbly: 0, creamy: 61, iodine: 37, ins: 158 },
  },
  {
    id: "mango-butter",
    name: "Mango butter",
    sapNaoh: 0.137,
    sapKoh: 0.192,
    qualities: { hardness: 49, cleansing: 0, conditioning: 50, bubbly: 0, creamy: 49, iodine: 48, ins: 144 },
  },
];

export const OIL_MAP = new Map(OIL_DATA.map((oil) => [oil.id, oil]));
