# Design Rules — Expenses App

Mockup-specific design rules for the `/mockup` skill.
Read alongside `CLAUDE.md → Design Tokens` before generating any HTML prototype.

---

## 1. Visual Identity

The Expenses app uses **PrimeVue Aura** as its design language — clean, modern, low visual noise.

Key personality traits:
- **Minimal chrome** — let data breathe, avoid heavy borders or excessive shadows
- **High information density on desktop**, comfortable spacing on mobile
- **Financial clarity** — positive and negative balances must be instantly distinguishable
  (colour + sign + icon — never colour alone)
- **Trust signals** — consistent alignment, precise decimal formatting, no visual clutter

---

## 2. Component Anatomy

### Buttons

```
Primary    → Filled indigo, white text, md radius
Secondary  → White bg, gray border, gray-900 text
Ghost      → Transparent bg, gray-500 text (topbar icons, table actions)
Danger     → Filled red-500, white text (delete actions only)

Sizes:
  sm  → 4px 10px padding, 13px text  (table row actions, badge-like)
  md  → 8px 16px padding, 14px text  (default)
  lg  → 10px 20px padding, 15px text (primary CTA in empty states)
  icon→ equal padding, no label      (topbar, close buttons)
```

**Rules:**
- Always use `<button>` for actions, `<a>` for navigation.
- Destructive actions (Delete) always use `.btn-danger` — never primary.
- Never place two primary buttons side by side in the same context.
- Button labels: sentence case, action verb first ("Add expense", not "Expense add").

---

### Inputs & Forms

```
Height      → 36px (padding 8px 12px)
Border      → 1px solid gray-200, radius 6px
Focus ring  → indigo-500 border + 3px indigo/15% shadow
Error ring  → red-500 border + 3px red/15% shadow
Disabled    → gray-100 bg, 60% opacity
```

**Rules:**
- Every input has a visible `<label>` — no placeholder-only labels.
- Helper text (`.form-hint`) goes below the input in gray-500.
- Error text (`.form-error`) goes below the input in red-500, with an icon: ⚠ message.
- Numeric inputs (amounts) always show `€` prefix or suffix, never inside the input text.
- Date inputs: display as `DD MMM YYYY` in the UI (e.g. "18 Feb 2026").

---

### Cards

```
Background  → white
Border      → 1px solid gray-200
Radius      → 8px
Shadow      → 0 1px 2px rgb(0 0 0 / .05)
Inner pad   → 20px (card-body), 16px 20px (card-header/footer)
```

**Rules:**
- Never nest cards more than 1 level deep.
- Card header uses `font-weight: 600`, 15px.
- Card footer is gray-50 background — use for secondary actions or metadata.
- Use `card` without header/footer for simple content blocks.

---

### Balance Display

This is the most important UI element — follow strictly:

```
Positive (owed to user)  → green-500 text, "+" prefix, green-50 background pill
Negative (user owes)     → red-500 text, "−" prefix (minus sign, not dash), red-50 bg pill
Settled / neutral        → gray-500 text, "€0.00", no colour pill
```

Example markup pattern:
```html
<!-- Positive -->
<span class="amount amount-positive">+€42.00</span>

<!-- Negative -->
<span class="amount amount-negative">−€18.50</span>

<!-- Zero -->
<span class="amount amount-neutral">€0.00</span>
```

Rules:
- Always show 2 decimal places: `€42.00` not `€42`.
- Always include sign for non-zero amounts: `+€42.00` or `−€18.50`.
- Use the minus sign character `−` (U+2212) not a hyphen `-`.
- Font weight 600, tabular-nums to prevent layout shift.
- On balance cards: pair the amount with a small "is owed" / "owes" label.

---

### Avatars

```
sm → 28px   (list rows, avatar groups)
md → 36px   (balance cards, expense detail)
lg → 48px   (member profile card)
xl → 64px   (profile edit page hero)
```

**Rules:**
- Show initials (1–2 chars) when no image is set.
- Each member gets a consistent accent colour derived from their name —
  use the predefined set: indigo, amber, emerald, rose, sky, violet, orange.
- Avatar group (stacked): max 4 visible, then `+N` overflow badge.

---

### Expense List Row

Anatomy (left → right):
```
[Avatar sm] [Title + payer · date] [Total amount / your share]  [⋮ menu]
```

Rules:
- Title: font-weight 500, truncate with ellipsis.
- Payer + date: 12px gray-500, same line, separator "·".
- Total: 14px font-weight 600, right-aligned.
- Your share: 12px gray-500, right-aligned below total.
- The `⋮` action menu is ghost button, appears on hover (desktop) or always on mobile.
- Tap/click the row → opens expense detail or edit.

---

### Settlement / Suggestion Row

```
[Avatar A]  [Name A]  →  [Name B]  [Avatar B]  pays  [Amount]  [Mark as settled btn]
```

Rules:
- Arrow `→` is a visual separator, not interactive.
- "Mark as settled" is `.btn-secondary.btn-sm`.
- Show at most 5 settlements; collapse the rest behind "Show more".
- Settled rows use strikethrough text and gray-400 colour.

---

## 3. App Shell — Common Elements

Every page shares the same structural shell (topbar + main). These elements are **identical across every mockup** — no page-specific variations are allowed.

---

### Topbar

Always 56 px tall, sticky at the top. **The same on every page, no exceptions:**

```
[Logo]  ···spacer···  [User avatar]
```

Rules:
- **No primary action button** in the topbar — ever. The FAB is the sole trigger for any primary action.
- **No settings icon** in the topbar — ever. Settings are accessed through in-page navigation or tabs.
- **No mode toggles** (dark/light) in the topbar — ever.
- The only elements are: logo (left), spacer (flex-grow), user avatar (right).
- Group-specific navigation (group switcher, section tabs) lives in a **separate secondary nav bar** below the topbar, never inside it.

---

### FAB (Floating Action Button)

The FAB is the **sole trigger** for the page's primary action on **all screen sizes**.

```
class="fab"   ← always — no sm:hidden, no responsive hiding
```

Rules:
- **Always visible** — on mobile, tablet, and desktop alike.
- There is **no topbar button** paired with it. The FAB is the only entry point.
- One FAB per page maximum. If a page has no primary action, omit it entirely.
- `aria-haspopup="dialog"` when the action opens a modal.

---

### User Avatar (topbar)

- Always the rightmost element in the topbar.
- 28 px circle (`.avatar.avatar-sm`), shows the current user's initials.
- `aria-label="Your profile"`.
- Clicking opens a profile/account menu — use `alert()` as placeholder in mockups.

---

### Canonical Markup — Copy These Exactly

These are the exact HTML snippets that must be used unchanged across **every** mockup. Treat them as frozen components — do not add icons, change class names, or invent attributes.

#### Logo

```html
<a href="#" class="topbar-logo" aria-label="Expenses — home">Expenses</a>
```

Rules: text-only, no icons, no `<img>`. Primary colour comes from `.topbar-logo` CSS.

#### User Avatar (topbar)

```html
<button
  class="avatar avatar-sm"
  aria-label="Your profile"
  style="background:#6366f1;color:#fff;border:none;cursor:pointer;font-size:11px;font-weight:600;"
>SD</button>
```

Rules: initials reflect the current user (use "SD" in mockups). Background is the user's accent colour — default indigo.

#### FAB (every page with a primary action)

```html
<button class="fab" aria-label="<action label>" aria-haspopup="dialog" onclick="openModal('<modal-id>')">
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
</button>
```

Rules: no responsive class — always visible. `aria-label` describes the action ("Add expense", "Create new group", etc.).

---

## 4. Layout Patterns

### Mobile (< 563 px)

- Single column, full-width cards.
- Topbar: follows context A or B above (see § 3).
- No sidebar — use bottom-anchored FAB for primary action.
- Balance cards: 1 per row, compact padding (16px).
- Expense list: full width, 12px left/right padding.

### Tablet (563–1023 px)

- Topbar (Context B): gains "Add expense" button (`hidden sm:inline-flex`); FAB hides (`sm:hidden`).
- Balance cards: 2-column grid.
- Expense list: 24px padding, show payer avatar.
- No sidebar still — nav via topbar tabs or group switcher.

### Desktop (≥ 1024 px)

- Left sidebar (240px): group nav, settings link.
- Balance cards: 3-column grid.
- Expense list: 32px padding, full row anatomy visible.
- Topbar: "Add expense" primary button always visible (inherited from `sm:`).

---

## 5. Spacing Rules

- Section gaps (between major sections): `mb-6` (24px).
- Between list items: handled by border-bottom — no extra gap.
- Between form fields: `gap-4` (16px) in flex/grid.
- Page heading to first section: `mb-6`.
- Card inner body: 20px padding (use `.card-body`).
- Tight intra-component gap (icon + label): `gap-2` (8px).

---

## 6. Iconography

Use **inline SVG** only — no icon font, no external CDN.
Recommended icon set style: Lucide (stroke, 1.5–2px stroke-width, 24×24 viewBox).

| Context | Size |
|---|---|
| Topbar actions | 18×18 |
| Button with label | 16×16 |
| List row actions | 16×16 |
| Empty state illustration | 48×48 |
| Form field prefix | 16×16 |

Rules:
- All icons have `aria-hidden="true"` — the surrounding button/label provides context.
- Never use emoji as icons in production-facing mockups.
- Colour: inherit from parent (`currentColor`), unless a specific semantic colour is needed.

---

## 7. Colour Usage Rules

- **Never use colour as the sole differentiator** — always pair with text or icon.
- Group accent colours are used for: card left-border, color-dot in switcher, avatar background.
- Positive green + Negative red are **reserved for balance amounts only** — do not repurpose.
- Gray-500 is the default for secondary/helper text — never go lighter than gray-400 for body text.
- Primary indigo is for interactive elements (buttons, links, active nav) — not decorative use.

---

## 8. Motion & Transitions

Keep it subtle — this is a financial tool, not a game:

- Button hover/active: `120ms ease` background change.
- Modal open/close: `200ms ease` opacity + scale (from 0.96 to 1).
- Sidebar slide-in: `200ms ease` translateX.
- Skeleton shimmer: `1.5s infinite` gradient animation.
- No bounce, spring, or exaggerated easing.

---

## 9. Empty States

Every list/section must have an empty state. Follow this pattern:

```html
<div class="empty-state">
  <div class="empty-state-icon" aria-hidden="true">💸</div>
  <div class="empty-state-title">No expenses yet</div>
  <p class="empty-state-desc">Add your first expense to start tracking who owes what.</p>
  <button class="btn btn-primary mt-2">Add expense</button>
</div>
```

Rules:
- Use a simple, relevant emoji or inline SVG illustration (max 48px).
- Title: 16px semibold.
- Description: max 2 lines, max 280px wide, centered.
- Include a CTA button when there's a clear next action.

---

## 10. Accessibility Checklist (for every mockup)

- [ ] All images have `alt` text.
- [ ] All form controls have associated `<label for="…">`.
- [ ] All icon-only buttons have `aria-label`.
- [ ] Color contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text.
- [ ] Interactive elements are reachable by keyboard (Tab order makes sense).
- [ ] Modal has `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.
- [ ] Lists use `<ul>`/`<ol>` with `role="list"` where appropriate.
- [ ] Active nav item has `aria-current="page"`.
- [ ] Toggle buttons have `aria-pressed` state.
- [ ] No `tabindex` values other than 0 and -1.
