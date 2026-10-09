const CURRENCY_SYMBOL = "₱";

export function formatCurrency(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  return `${CURRENCY_SYMBOL}${safeAmount.toFixed(2)}`;
}
