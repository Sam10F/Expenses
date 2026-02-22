/**
 * SVG path data for each category icon (24×24 viewBox, stroke-based Lucide style).
 */
export const CATEGORY_ICON_PATHS: Record<string, string> = {
  general:       'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  food:          'M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3',
  home:          'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10',
  transport:     'M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2M9 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0',
  travel:        'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  entertainment: 'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM10 8l6 4-6 4V8z',
  shopping:      'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
  health:        'M22 12h-4l-3 9L9 3l-3 9H2',
  education:     'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
  utilities:     'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  drinks:        'M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8zM6 1v3M10 1v3',
  work:          'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12',
  sports:        'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 8v8M8 12h8',
  gifts:         'M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z',
  tech:          'M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18',
}

/**
 * Color values for category colors.
 */
export const CATEGORY_COLOR_HEX: Record<string, string> = {
  indigo:  '#6366f1',
  amber:   '#f59e0b',
  emerald: '#10b981',
  rose:    '#f43f5e',
  sky:     '#0ea5e9',
  violet:  '#8b5cf6',
  orange:  '#f97316',
  teal:    '#14b8a6',
  pink:    '#ec4899',
  slate:   '#64748b',
  gray:    '#9ca3af',
}

/**
 * Color values for group colors.
 */
export const GROUP_COLOR_HEX: Record<string, string> = {
  indigo:  '#6366f1',
  amber:   '#f59e0b',
  emerald: '#10b981',
  rose:    '#f43f5e',
  sky:     '#0ea5e9',
  violet:  '#8b5cf6',
  orange:  '#f97316',
}
