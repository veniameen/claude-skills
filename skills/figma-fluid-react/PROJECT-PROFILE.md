# Project profile — fill this ONCE per project

`figma-fluid-react` (and the `/figma-1to1` command) are **stack-agnostic** in their rules but need
a handful of per-project values: where components live, what your design tokens are named, how you
serve the app, etc. This file is that adapter. **Fill the "Your value" column once and the skill
retargets to your project** — every `{{PLACEHOLDER}}` in `SKILL.md` / the references resolves here.

The reference project is a **Next.js 16 + Turbopack + Tailwind v4 + shadcn** landing. If your stack
matches, most defaults work as-is; if not, change the rows that differ (and read the two
stack-specific notes at the bottom).

## Variables

| Placeholder | What it is | Reference-project value | Your value |
|---|---|---|---|
| `{{COMPONENTS_DIR}}` | Where feature/page components live | `src/components/landing` | _fill_ |
| `{{UI_PRIMITIVES_DIR}}` | Input/control primitive library (shadcn etc.) | `src/components/ui` | _fill_ |
| `{{GLOBALS_CSS}}` | File holding `@theme` design tokens | `src/app/globals.css` | _fill_ |
| `{{TOKEN_PREFIX}}` | Your design-token families | `--color-landing-*`, `--text-*`, `--spacing-fl-*`, `--landing-radius-*`, `--font-pt` | _fill_ |
| `{{CONTAINER}}` | Shared content-container component + its utilities | `src/components/landing/container.tsx` (`max-w-content` + `px-page-x`) | _fill_ |
| `{{DECORATIVE_LAYER}}` | The `aria-hidden` cross-block decorative component | `src/components/landing/decorative-bg.tsx` | _fill_ |
| `{{REFERENCE_DIR}}` | Dir of exported Figma reference PNGs | `.figma-reference/` | _fill_ |
| `{{REFERENCE_NAMING}}` | Naming of those PNGs | `<page>-{desktop,mobile}.png` (e.g. `home-desktop.png`, `blog-mobile.png`) | _fill_ |
| `{{DEV_CMD}}` | Command that starts the dev server | `npm run dev` | _fill_ |
| `{{DEV_URL}}` | URL the app serves on | `https://localhost:3000` (self-signed via `--experimental-https`) | _fill_ |
| `{{VIEWPORTS}}` | Verify-loop widths (one canonical list, used by skill AND command) | `360 / 600 / 768 / 900 / 1024 / 1440` | _fill_ |
| `{{ASSET_DIR}}` | Where exported SVG/raster assets go | `public/<page>/{icons,decorative,photos}` | _fill_ |
| `{{MOTION_SYSTEM}}` | Animation lib + reduced-motion hook (or "none") | `motion` (framer) + `use-reveal.ts` wrapping `useReducedMotion` | _fill_ |
| `{{FIGMA_TOKEN_SOURCE}}` | Where the Figma PAT is read from | gitignored `.env` → `FIGMA_TOKEN=...` | _fill_ |

## How to derive the project-specific bits

- **UI-primitive → Figma map** (figma-extraction §5): don't trust the reference table — run
  `ls {{UI_PRIMITIVES_DIR}}` and map each Figma input/control to a real primitive + its import alias.
- **Token families** (`{{TOKEN_PREFIX}}`): open `{{GLOBALS_CSS}}` and read the `@theme` block —
  list the real `--color-*` / `--text-*` / `--spacing-*` / radius / font keys. Add fluid `clamp()`
  scales where the design needs them.
- **Reference naming**: whatever you name the exported frames, keep `<page>-desktop` / `<page>-mobile`
  so the compare step can pick the right one per width.

## Stack-specific notes (skip if your stack matches the reference)

- **Two gotchas in the rules reference are Turbopack-specific** and may not apply elsewhere: the
  `cqw` container-query unreliability and the `.next/dev/cache/images` stale-PNG cache bust. On
  Vite/Astro/Webpack, treat them as illustrative, not literal.
- **The verify loop assumes an HTTPS dev server with a self-signed cert** (Next `--experimental-https`)
  and Playwright HTTPS-error ignoring. On a plain-HTTP dev server, set `{{DEV_URL}}` to the `http://`
  origin and drop the TLS-interstitial handling.

> Everything else — the 10 hard rules, the node-truth export+view gate, the entire banked-gotcha
> library, the decorative absolute-coordinate math — is framework-portable (React + Tailwind v4) and
> needs **zero** edits.
