# Skill: /mockup

Generate a self-contained HTML prototype that visually matches the Expenses app design system
(PrimeVue Aura + Tailwind). Mockups live in `mockups/` and are iterated **before** any
Vue/Nuxt code is written.

---

## Invocation

```
/mockup <page-name> [--sidebar] [--modal] [--empty] [--loading]
```

| Argument | Effect |
|---|---|
| `<page-name>` | Kebab-case name of the screen (e.g. `group-dashboard`, `add-expense`) |
| `--sidebar` | Include a persistent left sidebar in the layout |
| `--modal` | Start with a modal/dialog open so it can be reviewed immediately |
| `--empty` | Render the empty/zero-state variant of the screen |
| `--loading` | Render skeleton loading placeholders instead of real content |

Output file: **`mockups/<page-name>.html`** (overwrite if it already exists).

---

## Step 0 — Always Ask First

**Before writing a single line of HTML**, ask the user at least these questions
(adapt based on context; skip only if the answer is completely obvious from the page name):

1. **Purpose / goal** — "What is the primary action a user should take on this screen?"
2. **Key content** — "What data / components must appear? (e.g. expense list, balance cards, member avatars)"
3. **Flags confirmation** — Confirm or suggest flags based on the description
   (e.g. "This sounds like it needs a sidebar — should I add `--sidebar`?")
4. **Anything special** — "Are there any edge cases or states you want to see in this first iteration?"

If the page name makes all four answers self-evident (e.g. `/mockup login-page`),
you may collapse this into a single short confirmation:
> "I'll generate a login screen with email + password fields and a submit button.
> Anything specific you want included or excluded?"

**Never skip user confirmation entirely.**

---

## Step 1 — Read Design System

Before generating, re-read:
- `CLAUDE.md` → **Design Tokens** section (colours, typography, radii, shadows, spacing)
- `.claude/rules/design.md` → Component anatomy, layout rules, a11y requirements — especially **§ 3 App Shell**

Apply every token exactly. Do not invent colours, fonts, or spacing that are not in the system.

---

## Step 1b — Confirm Shell Rules (same on every page)

The topbar and FAB are **identical on every page**. There are no variants or contexts. Before writing HTML, confirm:

| Element | Rule |
|---|---|
| **Topbar** | Logo + spacer + user avatar — nothing else, ever |
| **FAB** | `class="fab"` — always visible, no `sm:hidden`, no responsive hiding |
| **Topbar action buttons** | ❌ Never. The FAB is the only trigger for primary actions. |
| **Topbar settings/icons** | ❌ Never. Settings live in page content or secondary nav. |
| **Topbar mode toggles** | ❌ Never. |

For group navigation (switcher, section tabs) on group-detail pages: add a **secondary nav bar below the topbar** as a separate `<nav>` element — never inside `<header class="topbar">`.

Always copy the **Canonical Markup** snippets from `.claude/rules/design.md § 3 → Canonical Markup` for the logo, user avatar, and FAB. Never invent variations.

---

## Step 2 — Start from the Base Template

Copy `.claude/skills/mockup/templates/base.html` as the starting point.
Never start from a blank file.

The base template already provides:
- Tailwind CDN with custom config (project breakpoints: sm=563px, lg=1024px)
- CSS custom properties for all design tokens
- PrimeVue Aura–style component utility classes
- Responsive scaffold (mobile-first)
- Minimal JS utilities (modal open/close, sidebar toggle)

---

## Step 3 — Generation Rules

### Layout
- **Mobile-first**: the default layout must work at < 563 px with no horizontal scrolling.
- Add `sm:` classes for tablet (563–1023 px) and `lg:` classes for desktop (≥ 1024 px).
- Use the app shell from the base template: topbar + optional sidebar + `<main>`.
- Group switcher must always be accessible from the topbar (a compact dropdown or icon).

### Content & Data
- Use **realistic fake data** (real names, plausible amounts, meaningful dates).
  Bad: "User 1 paid €0.00". Good: "Ana paid €34.50 for Dinner at La Paloma on 18 Feb".
- Use the **full set of members**: show at least 3–4 people in any group view.
- Show **varied states** in lists: some positive balances, some negative, one settled.

### Components — follow `.claude/rules/design.md` exactly
- Buttons: use `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`.
- Inputs: use `.input` class; always pair with a `<label>`.
- Cards: use `.card` with optional `.card-header` / `.card-body` / `.card-footer`.
- Badges: use `.badge`, `.badge-positive`, `.badge-negative`, `.badge-neutral`.
- Avatars: use `.avatar` (circle, initials or image).
- Amount display: always suffix with `€`, 2 decimal places, colour-coded positive/negative.

### Accessibility (even for mockups)
- Every `<img>` has an `alt`.
- Every form control has a `<label for="…">`.
- Every interactive element is keyboard-reachable (native `<button>` / `<a>`).
- Focus ring is visible (provided by base template).
- Colour is never the only differentiator (add icons or text labels alongside).

### Self-contained
- Zero external network requests beyond the Tailwind CDN and Google Fonts.
- All icons use inline SVG or Unicode — no icon font CDN.
- The file must open correctly from the filesystem (double-click → works in browser).

---

## Step 4 — Save & Report

1. Write the file to `mockups/<page-name>.html`.
2. Confirm to the user:
   - File path written
   - Screens / states covered
   - Any assumptions made
   - Suggested next iteration (`/mockup <page-name> --modal` or a different screen)

---

## Step 5 — Iteration Loop

After delivering the first version, proactively ask:
> "What would you like to adjust? I can change the layout, add a state (empty, loading,
> modal open), tweak component styles, or move on to the next screen."

Keep iterating until the user says the mockup is approved. Only then is the mockup done.

---

## Screens Roadmap (for reference)

| Screen | File | Key components |
|---|---|---|
| Group list / Landing | `group-list.html` | Group cards, FAB, empty state |
| Group dashboard | `group-dashboard.html` | Balance cards, settlement list, expense preview |
| Expense list | `expense-list.html` | Paginated list, filters, add button |
| Add / Edit expense | `add-expense.html` | Form, split editor, member toggles |
| Group settings | `group-settings.html` | Name/color/description, member management |
| Member profile | `member-profile.html` | Avatar upload, name edit |

Use this as a guide when the user asks "what should we mockup next?".
