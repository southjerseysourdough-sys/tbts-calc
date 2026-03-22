import { getOilQualityProfile, normalizeOilSlug } from "@/lib/calculator/oils";
import { OilCatalogItem } from "@/lib/types";

type SupabaseOilRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  naoh_sap: number;
  koh_sap: number;
  is_active: boolean;
  sort_order: number;
  notes: string | null;
};

type OilFetchResult = {
  oils: OilCatalogItem[];
  error: string | null;
};

const OILS_SELECT =
  "id,slug,name,category,naoh_sap,koh_sap,is_active,sort_order,notes";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return {
      url: null,
      anonKey: null,
      error:
        "Supabase environment variables are missing. Falling back to the local starter oils.",
    };
  }

  return { url, anonKey, error: null };
}

function mapRowToOilCatalogItem(row: SupabaseOilRow): OilCatalogItem {
  const slug = normalizeOilSlug(row.slug);

  return {
    id: row.id,
    slug,
    name: row.name,
    category: row.category,
    sapNaoh: Number(row.naoh_sap),
    sapKoh: Number(row.koh_sap),
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order ?? 0),
    notes: row.notes ?? null,
    qualities: getOilQualityProfile(slug),
  };
}

export async function fetchActiveOils(): Promise<OilFetchResult> {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return { oils: [], error: config.error };
  }

  const endpoint = new URL("/rest/v1/oils", config.url);
  endpoint.searchParams.set("select", OILS_SELECT);
  endpoint.searchParams.set("is_active", "eq.true");
  endpoint.searchParams.set("order", "sort_order.asc,name.asc");

  try {
    const response = await fetch(endpoint.toString(), {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        oils: [],
        error:
          "The Supabase oils request did not succeed. Falling back to the local starter oils.",
      };
    }

    const rows = (await response.json()) as SupabaseOilRow[];
    return {
      oils: rows.map(mapRowToOilCatalogItem),
      error: null,
    };
  } catch {
    return {
      oils: [],
      error:
        "The live oils catalog could not be reached. Falling back to the local starter oils.",
    };
  }
}
