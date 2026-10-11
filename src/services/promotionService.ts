import type { Promotion } from "@/models/promotion";
import {
  getPromotionCache,
  savePromotionCache,
  type PromotionCache,
} from "@/repositories/promotionRepository";
import { API_CONFIG } from "../config/api";

const PROMOTIONS_ENDPOINT = `${API_CONFIG.baseUrl}/wp-json/laundry-pos/v1/promotions`;

type PromotionApiResponse = {
  enabled?: boolean;
  promotions?: Promotion[];
};

export type PromotionResult = {
  enabled: boolean;
  promotions: Promotion[];
  fetchedAt: string | null;
  isFromCache: boolean;
};

function normalizeApiResponse(data: unknown): {
  enabled: boolean;
  promotions: Promotion[];
} {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid promotions API response.");
  }

  const response = data as PromotionApiResponse;

  if (typeof response.enabled !== "boolean") {
    throw new Error("Promotions API response is missing the enabled flag.");
  }

  if (!Array.isArray(response.promotions)) {
    throw new Error("Promotions API response is missing the promotions array.");
  }

  const promotions = response.promotions.filter(
    (item): item is Promotion =>
      !!item &&
      typeof item === "object" &&
      typeof item.id === "number" &&
      typeof item.title === "string" &&
      typeof item.description === "string" &&
      typeof item.businessName === "string",
  );

  return {
    enabled: response.enabled,
    promotions,
  };
}

async function fetchPromotionsFromServer(): Promise<PromotionCache> {
  const response = await fetch(PROMOTIONS_ENDPOINT, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Promotion API request failed: HTTP ${response.status}`);
  }

  const data: unknown = await response.json();
  const normalized = normalizeApiResponse(data);
  const fetchedAt = new Date().toISOString();

  await savePromotionCache(
    normalized.enabled,
    normalized.promotions,
    fetchedAt,
  );

  console.info("Promotions loaded from server:", {
    enabled: normalized.enabled,
    count: normalized.promotions.length,
    ids: normalized.promotions.map((item) => item.id),
  });

  return {
    enabled: normalized.enabled,
    promotions: normalized.promotions,
    fetchedAt,
  };
}

export async function getPromotions(): Promise<PromotionResult> {
  // Always check the server first so a stale empty cache cannot hide
  // a promotion that has since been published.
  try {
    const fresh = await fetchPromotionsFromServer();

    return {
      enabled: fresh.enabled,
      promotions: fresh.promotions,
      fetchedAt: fresh.fetchedAt,
      isFromCache: false,
    };
  } catch (error) {
    console.error("Failed to load promotions from server:", error);

    // If the server is unavailable, keep the app usable with cached data.
    try {
      const cache = await getPromotionCache();

      if (cache) {
        console.warn("Using cached promotions as a fallback:", {
          enabled: cache.enabled,
          count: cache.promotions.length,
          fetchedAt: cache.fetchedAt,
          ids: cache.promotions.map((item) => item.id),
        });

        return {
          enabled: cache.enabled,
          promotions: cache.promotions,
          fetchedAt: cache.fetchedAt,
          isFromCache: true,
        };
      }
    } catch (cacheError) {
      console.error("Failed to read cached promotions:", cacheError);
    }

    return {
      enabled: false,
      promotions: [],
      fetchedAt: null,
      isFromCache: false,
    };
  }
}

export async function refreshPromotions(): Promise<PromotionResult> {
  return getPromotions();
}
