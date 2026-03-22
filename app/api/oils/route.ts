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

type OilApiResponse = {
  oils: OilCatalogItem[];
  error: string | null;
};

type SupabaseErrorPayload = {
  code?: string;
  details?: string | null;
  hint?: string | null;
  message?: string;
};

const OILS_SELECT =
  "id,slug,name,category,naoh_sap,koh_sap,is_active,sort_order,notes";

export const dynamic = "force-dynamic";

function jsonNoStore(body: OilApiResponse, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      ...init?.headers,
    },
  });
}

function getSupabaseConfig() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    null;

  if (!url || !anonKey) {
    return {
      url: null,
      anonKey: null,
      error:
        "The live oils catalog is unavailable right now. Using the local starter oils instead.",
    };
  }

  try {
    return {
      url: new URL(url).toString(),
      anonKey,
      error: null,
    };
  } catch {
    return {
      url: null,
      anonKey: null,
      error:
        "The live oils catalog is unavailable right now. Using the local starter oils instead.",
    };
  }
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

async function readErrorPayload(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json().catch(() => null)) as SupabaseErrorPayload | null;
  }

  const text = await response.text().catch(() => "");
  if (!text) {
    return null;
  }

  return { message: text };
}

export async function GET() {
  const config = getSupabaseConfig();

  if (!config.url || !config.anonKey) {
    console.error("[oils] Missing or invalid Supabase runtime configuration");
    return jsonNoStore(
      {
        oils: [],
        error:
          config.error ??
          "The live oils catalog is unavailable right now. Using the local starter oils instead.",
      },
      { status: 500 },
    );
  }

  const endpoint = new URL("/rest/v1/oils", config.url);
  endpoint.searchParams.set("select", OILS_SELECT);
  endpoint.searchParams.set("is_active", "eq.true");
  endpoint.searchParams.set("order", "sort_order.asc,name.asc");

  try {
    const response = await fetch(endpoint.toString(), {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
    });

    if (!response.ok) {
      const payload = await readErrorPayload(response);

      console.error("[oils] Supabase request failed", {
        status: response.status,
        statusText: response.statusText,
        code: payload?.code ?? null,
        message: payload?.message ?? null,
        details: payload?.details ?? null,
        hint: payload?.hint ?? null,
      });

      return jsonNoStore(
        {
          oils: [],
          error:
            "The live oils catalog is unavailable right now. Using the local starter oils instead.",
        },
        { status: 502 },
      );
    }

    const rows = (await response.json()) as SupabaseOilRow[];

    if (!Array.isArray(rows)) {
      console.error("[oils] Supabase returned an unexpected oils payload");
      return jsonNoStore(
        {
          oils: [],
          error:
            "The live oils catalog is unavailable right now. Using the local starter oils instead.",
        },
        { status: 502 },
      );
    }

    return jsonNoStore({
      oils: rows.map(mapRowToOilCatalogItem),
      error: null,
    });
  } catch (error) {
    console.error("[oils] Supabase oils request threw", error);

    return jsonNoStore(
      {
        oils: [],
        error:
          "The live oils catalog could not be reached. Falling back to the local starter oils.",
      },
      { status: 502 },
    );
  }
}
