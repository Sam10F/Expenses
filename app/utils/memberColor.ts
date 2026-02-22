const COLOR_NAMES = [
  'indigo', 'amber', 'emerald', 'rose', 'sky', 'violet', 'orange',
] as const

// Darker shades to ensure ≥4.5:1 contrast with white text (WCAG AA) at 11px
const COLOR_HEX: Record<string, string> = {
  indigo:  '#4338ca', // indigo-700 — 8.02:1
  amber:   '#92400e', // amber-800  — 7.0:1
  emerald: '#047857', // emerald-700 — 5.17:1
  rose:    '#be123c', // rose-700   — 6.48:1
  sky:     '#0369a1', // sky-700    — 5.68:1
  violet:  '#6d28d9', // violet-700  — 7.07:1
  orange:  '#c2410c', // orange-700  — 5.25:1
}

/**
 * Returns a deterministic color name for a member based on their name.
 */
export function getMemberColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return COLOR_NAMES[hash % COLOR_NAMES.length] as string
}

/**
 * Returns the hex color value for a member.
 */
export function getMemberColorHex(name: string): string {
  return COLOR_HEX[getMemberColor(name)] ?? '#6366f1'
}

/**
 * Returns initials (1–2 chars) from a name.
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
  }
  return (parts[0]?.slice(0, 2) ?? '').toUpperCase()
}
