# FH Gym Assistant

Coaches build workout programs. Trainees scan a QR code and see them.

Full product and technical plan: [PLAN.md](PLAN.md).
Connecting Supabase and Google sign-in: **[SETUP.md](SETUP.md)**.

**Current state:** Phase 0 complete (scaffold, design tokens, i18n + RTL, UI primitives).
Phase 1 (coach auth, gym onboarding, RLS) is code-complete but needs a Supabase project
before it can run. The exercise catalog and program builder are Phases 3–4.

## Getting started

```bash
pnpm install
pnpm dev
```

The app runs without Supabase credentials — env is validated lazily, so UI work is never
blocked on a project existing. The sign-in button stays disabled and says so.

To make sign-in work, follow [SETUP.md](SETUP.md), then:

```bash
cp .env.example .env.local   # then fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Vite dev server on :5173 |
| `pnpm build` | Typecheck then production build |
| `pnpm typecheck` | TypeScript only |
| `pnpm lint` | ESLint, including the RTL rule below |
| `pnpm lint:css` | Stylelint, including the physical-property ban |
| `pnpm test` | Vitest |

## The one rule that is not negotiable

This app ships Persian and English side by side. **Physical CSS directions are banned.**

- `ml-4` → `ms-4`, `pr-2` → `pe-2`, `text-left` → `text-start`, `left-0` → `start-0`
- In CSS: `margin-left` → `margin-inline-start`, and so on

Both linters fail the build on violations:
[`eslint-rules/no-physical-properties.js`](eslint-rules/no-physical-properties.js) covers
Tailwind classes in JSX and `cn()` calls; [`.stylelintrc.json`](.stylelintrc.json) covers raw CSS.
The ESLint rule has its own test suite, because if it silently stops firing the Persian
layout rots and nobody notices for a month.

## Fonts

| Role | Latin | Persian |
|---|---|---|
| Display | Bebas Neue (Google) | Morabba — **self-hosted, not yet added** |
| UI | Inter (Google) | Vazirmatn (Google) |

Druk Condensed and Neue Montreal from the brand reference are commercial; Bebas Neue and
Inter are the substitutes. Morabba is not on Google Fonts — drop `Morabba-Bold.woff2` and
`Morabba-Medium.woff2` into `public/fonts/morabba/` and the `@font-face` block in
`src/styles/global.css` picks them up. Until then Persian display falls back to Vazirmatn
and simply reads less condensed.

## Design tokens

Everything lives in [`src/styles/theme.css`](src/styles/theme.css) as a Tailwind v4 `@theme`
block. Three deliberate departures from the brand reference, all argued in PLAN.md §9:

1. Commercial fonts substituted (above).
2. Every display size is a `clamp()`. A fixed 317px headline is a desktop poster, not a
   phone screen.
3. Lavender is the primary action **on dark surfaces only**; on light surfaces it is a plum
   fill. The reference contradicts itself on this point and lavender-on-white fails contrast.

Language-dependent values (font stack, line-height, tracking, display clamps) are reassigned
per `[lang]` in `global.css`, so components never branch on locale.

## Layout

```
src/
  app/            providers, router
  components/ui/  design-system primitives
  lib/i18n/       typed translations, direction handling
  lib/            supabase client, dates, cn
  routes/         pages
supabase/
  migrations/     SQL, applied in order
scripts/          one-off tooling (exercise catalog seed)
eslint-rules/     the RTL rule and its tests
```
