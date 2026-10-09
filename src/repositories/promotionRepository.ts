import { getDatabase } from "@/database/database";
import type { Promotion } from "@/models/promotion";

export type PromotionCache = {
  enabled: boolean;
  promotions: Promotion[];
  fetchedAt: string;
};

type PromotionCacheRow = {
  enabled: number;
  promotions_json: string;
  fetched_at: string;
};

const CACHE_ID = 1;

export async function getPromotionCache(): Promise<PromotionCache | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<PromotionCacheRow>(
    `
      SELECT
        enabled,
        promotions_json,
        fetched_at
      FROM promotion_cache
      WHERE id = ?
      LIMIT 1;
    `,
    CACHE_ID,
  );

  if (!row) {
    return null;
  }

  try {
    const promotions = JSON.parse(row.promotions_json) as Promotion[];

    return {
      enabled: row.enabled === 1,
      promotions,
      fetchedAt: row.fetched_at,
    };
  } catch (error) {
    console.error("Failed to parse cached promotions:", error);

    return null;
  }
}

export async function savePromotionCache(
  enabled: boolean,
  promotions: Promotion[],
  fetchedAt: string = new Date().toISOString(),
): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
      INSERT INTO promotion_cache (
        id,
        enabled,
        promotions_json,
        fetched_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        enabled = excluded.enabled,
        promotions_json = excluded.promotions_json,
        fetched_at = excluded.fetched_at,
        updated_at = excluded.updated_at;
    `,
    CACHE_ID,
    enabled ? 1 : 0,
    JSON.stringify(promotions),
    fetchedAt,
    new Date().toISOString(),
  );
}

export async function clearPromotionCache(): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
      DELETE FROM promotion_cache
      WHERE id = ?;
    `,
    CACHE_ID,
  );
}
