import { useMemo } from "react";

import { hasFeature } from "./entitlementService";
import type { Feature } from "./features";

export function useFeature(feature: Feature): boolean {
  return useMemo(() => hasFeature(feature), [feature]);
}
