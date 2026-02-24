# Expenses — CLAUDE.md

Shared expense tracker (like Tricount / SettleUp). Groups of 1–10 people track, split, and settle expenses together.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Nuxt 4 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| UI Library | PrimeVue v4 — Aura theme |
| Database / Auth | Supabase (project already exists) |
| Testing | Playwright |
| Lint | ESLint + @nuxt/eslint |
| i18n | @nuxtjs/i18n — EN + ES |
| Package manager | npm |
| PWA | @vite-pwa/nuxt |

---

## Project Architecture

```
/
├── app/
│   ├── assets/
│   │   └── css/
│   │       └── main.css          # Tailwind directives + global tokens
│   ├── components/
│   │   ├── group/                # Group-scoped components
│   │   ├── expense/              # Expense-scoped components
│   │   ├── member/               # Member-scoped components
│   │   └── ui/                   # Generic reusable UI
│   ├── composables/              # Business logic composables
│   ├── layouts/
│   │   ├── default.vue
│   │   └── auth.vue
│   ├── middleware/               # Route guards
│   ├── pages/
│   │   ├── index.vue             # Group list / landing
│   │   ├── groups/
│   │   │   ├── [id]/
│   │   │   │   ├── index.vue     # Group dashboard (balance overview)
│   │   │   │   ├── expenses.vue  # Expense list
│   │   │   │   └── settings.vue  # Group settings
│   ├── plugins/
│   ├── stores/                   # Pinia stores
│   └── utils/                    # Pure helper functions
│       ├── memberColor.ts        # Member color hex lookup + name-hash fallback
│       └── categoryIcons.ts      # Category icon SVG paths + color hex map
├── server/
│   └── api/                      # Nuxt server routes (thin wrappers over Supabase)
├── supabase/
│   └── migrations/               # All DDL lives here, versioned
├── public/
│   ├── icons/                    # PWA icons (192×192, 512×512)
│   ├── apple-touch-icon.png
│   ├── favicon.png
│   └── icon.svg                  # Source SVG for icon generation
├── tests/
│   ├── e2e/                      # Playwright specs
│   │   ├── groups.spec.ts
│   │   ├── expenses.spec.ts
│   │   ├── members.spec.ts
│   │   ├── balance.spec.ts
│   │   ├── categories.spec.ts
│   │   └── settings.spec.ts
│   ├── helpers/
│   │   └── supabase.ts           # Test data helpers (createTestGroup, etc.)
│   └── global-setup.ts           # Stale data cleanup before test run
├── locales/
│   ├── en.json
│   └── es.json
├── types/
│   ├── app.ts                    # Domain types, payload types, color/icon constants
│   └── supabase.ts               # Auto-generated from Supabase schema
├── nuxt.config.ts
├── tailwind.config.ts
├── playwright.config.ts
└── eslint.config.mjs
```

---

## Responsive Breakpoints

| Name | Range | Tailwind prefix |
|---|---|---|
| Mobile | < 563 px | *(default / no prefix)* |
| Tablet | 563 px – 1023 px | `sm:` |
| Desktop | ≥ 1024 px | `lg:` |

> **Always code mobile-first.** Add `sm:` and `lg:` overrides on top.

Custom Tailwind breakpoints must be declared in `tailwind.config.ts`:

```ts
screens: {
  sm: '563px',
  lg: '1024px',
}
```

---

## Supabase

- The Supabase project **already exists**. Never recreate it.
- All schema changes go in `supabase/migrations/` as numbered SQL files.
- Never run raw DDL in the Supabase dashboard; always use migrations.
- Use RLS (Row Level Security) on every table.
- Typed client: regenerate types after every migration with:
  ```bash
  npx supabase gen types typescript --local > types/supabase.ts
  ```

### Environments

Two Supabase projects exist — one per environment:

| Environment | Project | Used when |
|---|---|---|
| Development | `Expenses - DEV` (`cjovafrwkbtllanqbapy`) | `npm run dev`, `npm run test` |
| Production | `Expenses` (`xkozeysyfamzeihtyilo`) | `npm run build` / deploy |

Nuxt/Vite loads `.env` in dev and `.env.production` in production builds. Both files are gitignored.

```
# .env  (development)
SUPABASE_URL=https://cjovafrwkbtllanqbapy.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # server-side only

# .env.production  (production)
SUPABASE_URL=https://xkozeysyfamzeihtyilo.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # server-side only
```

### Core Data Model (reference)

```
groups         id, name, description, color, created_at
members        id, group_id, name, color, avatar_url, created_at
categories     id, group_id, name, color, icon, is_default (bool), created_at
expenses       id, group_id, paid_by (member_id), category_id (FK → categories),
               title, amount, currency='EUR', date, created_at, updated_at
expense_splits id, expense_id, member_id, amount, is_included
```

### Migrations

| File | Description |
|---|---|
| `001_initial_schema.sql` | Groups, members, categories, expenses, expense_splits, RLS policies |
| `002_member_color.sql` | `ALTER TABLE members ADD COLUMN color TEXT NOT NULL DEFAULT 'indigo'` |

---

## Currency

All amounts are in **Euros (€)**. Store as `numeric(10,2)` in the database. Display with the `€` symbol, formatted to 2 decimal places.

---

## Theming

- PrimeVue **Aura** preset.
- **Light and dark mode** — toggle stored in user preferences (localStorage + `useColorMode`).
- All design tokens flow through PrimeVue's theming system; avoid hardcoding colours.
- Group colours are user-selectable and used as accent colour within the group context.

---

## Design Tokens

> These tokens are the single source of truth for both the real app and HTML mockups.
> Mockups consume them via Tailwind CDN + CSS custom properties. The app consumes them
> via PrimeVue's Aura theme configuration.

### Colour Palette

| Token | Value | Tailwind equiv | Usage |
|---|---|---|---|
| `--color-primary` | `#6366f1` | `indigo-500` | Buttons, links, active states |
| `--color-primary-hover` | `#4f46e5` | `indigo-600` | Button hover / pressed |
| `--color-primary-subtle` | `#eef2ff` | `indigo-50` | Badge backgrounds, highlights |
| `--color-surface` | `#ffffff` | `white` | Page background |
| `--color-surface-card` | `#f9fafb` | `gray-50` | Card / panel background |
| `--color-surface-hover` | `#f3f4f6` | `gray-100` | Row hover, list items |
| `--color-border` | `#e5e7eb` | `gray-200` | Dividers, input borders |
| `--color-border-focus` | `#6366f1` | `indigo-500` | Focused input ring |
| `--color-text` | `#111827` | `gray-900` | Primary body text |
| `--color-text-secondary` | `#6b7280` | `gray-500` | Labels, helper text |
| `--color-text-muted` | `#9ca3af` | `gray-400` | Placeholders, disabled |
| `--color-positive` | `#22c55e` | `green-500` | Positive balance (owed to you) |
| `--color-positive-bg` | `#f0fdf4` | `green-50` | Positive balance background |
| `--color-negative` | `#ef4444` | `red-500` | Negative balance (you owe) |
| `--color-negative-bg` | `#fef2f2` | `red-50` | Negative balance background |
| `--color-warning` | `#f59e0b` | `amber-500` | Warnings, pending states |
| `--color-info` | `#3b82f6` | `blue-500` | Informational |

### Typography

| Token | Value |
|---|---|
| Font family | `Inter, system-ui, sans-serif` |
| Base size | `14px` |
| Line height | `1.5` |
| Weight regular | `400` |
| Weight medium | `500` |
| Weight semibold | `600` |
| Weight bold | `700` |

### Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `4px` | Tags, badges |
| `--radius-md` | `6px` | Inputs, buttons |
| `--radius-lg` | `8px` | Cards, dropdowns |
| `--radius-xl` | `12px` | Modals, dialogs |
| `--radius-full` | `9999px` | Avatars, pill badges |

### Shadows

| Token | Value | Usage |
|---|---|---|
| `--shadow-card` | `0 1px 2px 0 rgb(0 0 0 / .05)` | Cards at rest |
| `--shadow-elevated` | `0 1px 3px 0 rgb(0 0 0 / .1), 0 1px 2px -1px rgb(0 0 0 / .1)` | Elevated panels |
| `--shadow-overlay` | `0 4px 6px -1px rgb(0 0 0 / .1), 0 2px 4px -2px rgb(0 0 0 / .1)` | Dropdowns |
| `--shadow-modal` | `0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1)` | Modals |

### Spacing Scale (Tailwind defaults, key values)

| Step | px | Usage |
|---|---|---|
| `1` | `4px` | Icon gap, tight padding |
| `2` | `8px` | Compact padding |
| `3` | `12px` | Input padding, small gaps |
| `4` | `16px` | Standard padding |
| `6` | `24px` | Section padding |
| `8` | `32px` | Large section gaps |
| `12` | `48px` | Page-level spacing |

---

## Internationalisation

- Supported locales: **`en`** (default) and **`es`**.
- All user-visible strings go in `locales/en.json` and `locales/es.json`. Never hardcode UI text.
- Use `const { t } = useI18n()` in components.

---

## Accessibility

Accessibility is a first-class requirement.

- Install and run **`axe-core`** (via `@axe-core/playwright`) in Playwright to audit every key page.
- Every Playwright spec must run an axe audit on the page under test and assert zero critical/serious violations.
- Use semantic HTML elements (`<main>`, `<nav>`, `<section>`, `<article>`, `<button>`, etc.).
- All interactive elements must have visible focus rings.
- All images and icons must have meaningful `alt` text or `aria-label`.
- Colour contrast must meet WCAG 2.1 AA.
- Forms must have associated `<label>` elements.

---

## PWA

The app is a Progressive Web App via `@vite-pwa/nuxt`.

- Manifest: auto-generated at `/manifest.webmanifest`, also linked manually in `app/app.vue` via `useHead` for dev mode compatibility.
- Service worker: Workbox `autoUpdate` strategy; network-first for Supabase API calls, precaches all static assets.
- Icons: `public/icons/pwa-192x192.png`, `public/icons/pwa-512x512.png`, `public/apple-touch-icon.png`, `public/favicon.png`.
- Source SVG: `public/icon.svg` — regenerate PNGs from this if the icon changes.
- Theme colour: `#6366f1` (primary indigo).
- `devOptions.enabled: true` so the manifest is injected during `npm run dev`.

To regenerate icons from the SVG on macOS:
```bash
qlmanage -t -s 512 -o /tmp public/icon.svg
sips -z 512 512 /tmp/icon.svg.png -o public/icons/pwa-512x512.png
sips -z 192 192 /tmp/icon.svg.png -o public/icons/pwa-192x192.png
sips -z 180 180 /tmp/icon.svg.png -o public/apple-touch-icon.png
```

---

## State Management

- Use **Pinia** for global state (groups, active group, members).
- Prefer composables (`useGroupExpenses`, `useSplitCalculator`, etc.) for feature-scoped logic.
- Keep stores thin — complex business logic belongs in composables.

---

## Code Standards

- **TypeScript strict mode** is enabled. No `any`, no `// @ts-ignore`.
- All components use `<script setup lang="ts">`.
- Props must be typed with `defineProps<{}>()`.
- Emits must be typed with `defineEmits<{}>()`.
- No barrel `index.ts` re-exports unless there are 4+ items.
- Max component file length: **300 lines**. Split if longer.
- Max function length: **40 lines**. Extract helpers if longer.
- Name composables with `use` prefix: `useGroups`, `useExpenses`.

---

## ESLint

Config lives in `eslint.config.mjs` using `@nuxt/eslint`. Run:

```bash
npm run lint          # report only
npm run lint:fix      # auto-fix
```

Zero lint errors or warnings are acceptable in a completed feature. The agent must fix all before marking done.

---

## Commands Reference

```bash
npm run dev           # development server
npm run build         # production build
npm run preview       # preview production build
npm run lint          # ESLint check
npm run lint:fix      # ESLint auto-fix
npm run typecheck     # npx nuxt typecheck (no errors, no warnings)
npm run test          # playwright test --reporter=dot
npm run test:ui       # playwright test --ui
npm run test:a11y     # playwright test --grep @a11y
```

> **Node.js requirement:** `npm run test` and `npm run typecheck` require Node ≥ 21.2.0.
> Use `nvm use 22` before running those commands.

---

## Git

The **agent must never create git commits**. Leave version control to the developer.

---

## Definition of Done — Checklist

An agent must verify every item below before considering any implementation complete:

- [ ] Feature works correctly in mobile (< 563 px), tablet (563–1023 px), and desktop (≥ 1024 px).
- [ ] **All Playwright tests pass** — `npm run test` exits with 0 failures.
- [ ] New Playwright tests cover the feature (happy path + key edge cases + axe a11y audit).
- [ ] `npx nuxt typecheck` — **zero errors, zero warnings**.
- [ ] `npm run lint` — **zero errors, zero warnings**.
- [ ] `npm run dev` — navigate to affected pages; **browser console has zero errors and zero warnings**.
- [ ] Dark mode renders correctly for the feature.
- [ ] Both `en` and `es` locales are covered (no missing translation keys).
- [ ] Accessibility: axe audit returns no critical or serious violations on affected pages.
- [ ] RLS policies exist and are tested for any new Supabase tables/columns.

---

## Key Business Rules

### Groups
- 1 to 10 members per group.
- Groups have: name, description, colour, members list.
- Users can switch between groups from any screen.
- All members have the same permissions (no roles).

### Expenses
- Fields: title, amount (€), date, paid by (one member), split among (subset of members).
- Default split: total divided equally among **all** group members.
- Custom split: per-member amounts are individually editable; must sum to the total.
- Members can be toggled in/out of a split (enabled/disabled).
- Any member can create, edit, or delete any expense.

### Balance
- Group balance overview must be **immediately visible and understandable**.
- Show each member's net balance (positive = owed money, negative = owes money).
- Show suggested settlements to minimise the number of transactions.
- Up to 5 settlements are shown by default; a "Show more" button reveals the rest.
- Clicking a settlement row opens the Add Expense modal pre-filled with the settlement amount and members, so it can be recorded as an expense.

### Members
- Each member has a name, a **color**, and an optional profile picture.
- **Member color** is chosen from a palette of 7: indigo, amber, emerald, rose, sky, violet, orange. Defaults to indigo.
- Color is set when adding a member during group creation, and can be changed at any time in group settings. Changes are saved immediately (no separate save button).
- The member's color is used as their avatar background throughout the app (balance cards, expense rows, settlement rows, recent expenses on the dashboard).
- Color is derived from `app/utils/memberColor.ts`. Always pass `:color="member.color"` to `<AppAvatar>` — never rely on the name-hash fallback for persisted members.
- Members can edit their own name and profile picture.

### Categories
- Every group has exactly one default category: **General** (locked — cannot be renamed, recoloured, or deleted).
- When a group is created, only the General category is created automatically.
- Users can add unlimited custom categories per group. Each category has: **name**, **color** (from a predefined palette), and **icon** (chosen from a predefined icon set).
- Every expense must belong to exactly one category. If no category is selected when adding an expense, it defaults to **General**.
- The category selector in the Add Expense form is a **pill/chip selector** showing all group categories; General is pre-selected by default.
- Categories are displayed in a **"By Category" section** on the group dashboard, directly below the Balances section.
- The By Category section shows a **donut pie chart** (static/decorative, no click interaction) with an **all-time** breakdown of total spending per category.
- The chart legend shows: colour dot · icon · category name · total amount (€) · percentage. Sorted by amount descending.
- A **"+ Add category"** button is placed inline next to the "By Category" section heading. It opens a modal.
- The Add Category modal contains: name input, colour picker (preset swatches), icon picker (predefined grid of SVG icons).
- **Icon set** (predefined, not user-extensible): General, Food, Home, Transport, Travel, Entertainment, Shopping, Health, Education, Utilities, Drinks, Work, Sports, Gifts, Tech.
- **Colour palette** for categories (10 presets): indigo, amber, emerald, rose, sky, violet, orange, teal, pink, slate. Cannot be General's gray (#9ca3af), which is reserved.

---

## Scalability Guidelines

- Paginate or use virtual scrolling for expense lists (expect 100+ expenses per group).
- Avoid N+1 queries — fetch related data in a single Supabase query using joins/`select`.
- Debounce search/filter inputs.
- Use Nuxt's `useLazyFetch` / `useAsyncData` for data fetching with proper loading/error states.
- Lazy-load heavy components with `defineAsyncComponent`.
- Images (member avatars) must be served via Supabase Storage with size constraints.

---

## Playwright Configuration Notes

- Base URL: `http://localhost:3000`.
- Tests run against a dev server started automatically (`webServer` in `playwright.config.ts`).
- `playwright.config.ts` loads `.env` via `dotenv` so Supabase credentials are available in `global-setup.ts` and test helpers.
- Each spec file is responsible for its own test data setup/teardown via Supabase admin client (`tests/helpers/supabase.ts`).
- `global-setup.ts` runs `cleanupStaleTestGroups()` before every test run to remove leftover data from crashed runs.
- Tag a11y tests with `@a11y` in the test title to allow running them in isolation.
- Screenshots on failure are saved to `tests/screenshots/`.

### Test helper functions (`tests/helpers/supabase.ts`)

| Function | Purpose |
|---|---|
| `createTestGroup(name, members[])` | Creates group + default General category + members. Returns `{ groupId, memberIds, defaultCategoryId }`. |
| `deleteTestGroup(groupId)` | Deletes group and all cascaded data. |
| `cleanupStaleTestGroups()` | Bulk-deletes groups matching known test name patterns. |
| `createTestExpense(groupId, paidById, categoryId, memberIds[], options)` | Creates an expense with equal splits. |
| `createTestExpensesBulk(groupId, paidById, categoryId, memberIds[], count)` | Batch-inserts N expenses (for pagination tests). |
| `createTestCategory(groupId, options)` | Creates a custom (non-default) category. Returns category ID. |
