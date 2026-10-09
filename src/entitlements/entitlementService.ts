import { FEATURES, type Feature } from "./features";

const DEVELOPMENT_FEATURES: Feature[] = [
  FEATURES.CORE_POS,
  FEATURES.EXPENSE_MANAGEMENT,
  FEATURES.AUDIT_LOG,
  FEATURES.INVENTORY,
];

export function hasFeature(feature: Feature): boolean {
  return DEVELOPMENT_FEATURES.includes(feature);
}

export function getEnabledFeatures(): Feature[] {
  return [...DEVELOPMENT_FEATURES];
}
