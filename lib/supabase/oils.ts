import { OilCatalogItem } from "@/lib/types";

type OilFetchResult = {
  oils: OilCatalogItem[];
  error: string | null;
};

const OILS_API_ROUTE = "/api/oils";

export async function fetchActiveOils(): Promise<OilFetchResult> {
  try {
    const response = await fetch(OILS_API_ROUTE, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const payload = (await response.json().catch(() => null)) as OilFetchResult | null;

    if (!response.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[oils] Local API request failed", {
          status: response.status,
          error: payload?.error ?? "Unknown oils API error",
        });
      }

      return {
        oils: [],
        error:
          payload?.error ??
          "The live oils catalog is unavailable right now. Using the local starter oils instead.",
      };
    }

    return {
      oils: Array.isArray(payload?.oils) ? payload.oils : [],
      error: payload?.error ?? null,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[oils] Local API request could not be reached", error);
    }

    return {
      oils: [],
      error:
        "The live oils catalog could not be reached. Falling back to the local starter oils.",
    };
  }
}
