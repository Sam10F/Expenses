const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/**
 * Format an ISO date string (YYYY-MM-DD) as "18 Feb 2026".
 */
export function formatDate(isoDate: string): string {
  // Parse as local date to avoid UTC offset issues
  const [year, month, day] = isoDate.split('-').map(Number)
  return `${day} ${MONTH_NAMES[(month ?? 1) - 1]} ${year}`
}

/**
 * Convert a Date object to ISO date string (YYYY-MM-DD).
 */
export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Returns today's date as ISO string (YYYY-MM-DD).
 */
export function todayISO(): string {
  return toISODate(new Date())
}
