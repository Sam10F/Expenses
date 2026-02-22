const MINUS_SIGN = '\u2212' // U+2212 MINUS SIGN (not a hyphen)

/**
 * Format a number as a Euro amount: €42.00
 */
export function formatCurrency(amount: number): string {
  return `€${Math.abs(amount).toFixed(2)}`
}

/**
 * Format a balance amount with sign and colour-ready string:
 *   positive → "+€42.00"
 *   negative → "−€18.50"  (U+2212)
 *   zero     → "€0.00"
 */
export function formatBalance(amount: number): string {
  if (amount > 0) return `+€${amount.toFixed(2)}`
  if (amount < 0) return `${MINUS_SIGN}€${Math.abs(amount).toFixed(2)}`
  return '€0.00'
}

/**
 * Returns 'positive' | 'negative' | 'neutral' for a balance amount.
 */
export function balanceClass(amount: number): 'positive' | 'negative' | 'neutral' {
  if (amount > 0.005) return 'positive'
  if (amount < -0.005) return 'negative'
  return 'neutral'
}
