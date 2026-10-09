import type { Promotion } from "@/models/promotion";
import {
    getPromotionCache,
    savePromotionCache,
    type PromotionCache,
} from "@/repositories/promotionRepository";
import { API_CONFIG } from "../config/api";

const PROMOTIONS_ENDPOINT = `${API_CONFIG.baseUrl}/wp-json/laundry-pos/v1/promotions`;

// 12 hours.
//const CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

// 6 hours.
const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

type PromotionApiResponse = {
  enabled: boolean;
  promotions: Promotion[];
};

export type PromotionResult = {
  enabled: boolean;
  promotions: Promotion[];
  fetchedAt: string | null;
  isFromCache: boolean;
};

function isCacheFresh(cache: PromotionCache): boolean {
  const fetchedAt = new Date(cache.fetchedAt).getTime();

  if (Number.isNaN(fetchedAt)) {
    return false;
  }

  return Date.now() - fetchedAt < CACHE_MAX_AGE_MS;
}

function normalizeApiResponse(
  data: PromotionApiResponse,
): PromotionApiResponse {
  return {
    enabled: data.enabled === true,
    promotions: Array.isArray(data.promotions) ? data.promotions : [],
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
    throw new Error(`Promotion API request failed: ${response.status}`);
  }

  const data = (await response.json()) as PromotionApiResponse;

  const normalized = normalizeApiResponse(data);

  const fetchedAt = new Date().toISOString();

  await savePromotionCache(
    normalized.enabled,
    normalized.promotions,
    fetchedAt,
  );

  return {
    enabled: normalized.enabled,
    promotions: normalized.promotions,
    fetchedAt,
  };
}

export async function getPromotions(): Promise<PromotionResult> {
  const cache = await getPromotionCache();

  if (cache) {
    if (!isCacheFresh(cache)) {
      void refreshPromotions();
    }

    return {
      enabled: cache.enabled,
      promotions: cache.promotions,
      fetchedAt: cache.fetchedAt,
      isFromCache: true,
    };
  }

  try {
    const fresh = await fetchPromotionsFromServer();

    return {
      enabled: fresh.enabled,
      promotions: fresh.promotions,
      fetchedAt: fresh.fetchedAt,
      isFromCache: false,
    };
  } catch (error) {
    console.error("Failed to load promotions:", error);

    return {
      enabled: false,
      promotions: [],
      fetchedAt: null,
      isFromCache: false,
    };
  }
}

export async function refreshPromotions(): Promise<PromotionResult> {
  try {
    const fresh = await fetchPromotionsFromServer();

    return {
      enabled: fresh.enabled,
      promotions: fresh.promotions,
      fetchedAt: fresh.fetchedAt,
      isFromCache: false,
    };
  } catch (error) {
    console.error("Failed to refresh promotions:", error);

    const cache = await getPromotionCache();

    if (cache) {
      return {
        enabled: cache.enabled,
        promotions: cache.promotions,
        fetchedAt: cache.fetchedAt,
        isFromCache: true,
      };
    }

    return {
      enabled: false,
      promotions: [],
      fetchedAt: null,
      isFromCache: false,
    };
  }
}
