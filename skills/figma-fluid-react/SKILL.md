---
name: figma-fluid-react
description: >-
  Turn a Figma frame into fluid, responsive React + Tailwind v4 code, or refactor
  existing absolute/fixed-pixel layouts into fluid ones, then verify visual fidelity
  against Figma references in a real browser. Use when the user references a Figma
  frame/node, asks to build or port a section/landing/page from a design, mentions
  .figma-reference exports, or asks to make a fixed/absolute layout responsive or
  fluid. Reads design INTENT (auto-layout, constraints, sizing, spacing) — never
  x/y/w/h — enforces a strict no-fixed-height / no-fixed-width / flow-primitive rule
  set, tokenizes via @theme clamp() scales, and runs a mandatory verify loop at
  360/600/768/900/1024/1440 using the Playwright MCP.
allowed-tools: >-
  Read, Glob, Grep, Edit, Write,
  Bash(npm run dev), Bash(npm run dev *), Bash(ls *), Bash(mkdir -p *), Bash(rg *),
  Bash(curl *), Bash(npx cwebp *), Bash(npx @squoosh/cli *),
  mcp__playwright__browser_navigate, mcp__playwright__browser_resize,
  mcp__playwright__browser_take_screenshot, mcp__playwright__browser_snapshot,
  mcp__playwright__browser_evaluate, mcp__playwright__browser_wait_for,
  mcp__playwright__browser_close, mcp__playwright__browser_console_messages,
  mcp__pencil__open_document, mcp__pencil__get_editor_state, mcp__pencil__batch_get,
  mcp__pencil__export_nodes, mcp__pencil__get_screenshot
---

# Figma → Fluid React

**Mental model — read this first.** A Figma frame is a *snapshot of ONE width* of a fluid
system. It is **not** a coordinate map to transcribe. Read the **intent** of every node —
auto-layout direction, constraints, sizing mode (hug/fill/fixed), alignment, spacing rhythm —
and rebuild it so **one component set reflows for all widths**. Desktop and mobile frames are
the same components at two widths, not two designs. Never copy `x / y / width / height` into
`left-[..] top-[..] w-[..] h-[..]`.

Bundled references are the source of truth — read them before building:
- **[references/adaptive-layout-rules.md](references/adaptive-layout-rules.md)** — the 10 hard
  rules, litmus tests, and worked examples.
- **[references/figma-intent-cheatsheet.md](references/figma-intent-cheatsheet.md)** — Figma
  property → exact CSS/Tailwind mapping tables.
- **[references/figma-extraction.md](references/figma-extraction.md)** — given a Figma URL +
  description, how to ingest the node tree deeply and **losslessly**, export vectors as SVG and
  photos as raster, and map form fields to the project's UI-primitive components.
- **[PROJECT-PROFILE.md](PROJECT-PROFILE.md)** — **read this FIRST.** The per-project adapter:
  component dirs, design-token prefix, container + decorative-layer files, reference-image dir +
  naming, dev command + URL, viewport list, and the UI-primitive→Figma map. Wherever a step below
  shows a concrete path / token / URL, that is the **reference project's** value shown as an
  example — substitute the value from this profile for your project.

If anything you are about to write violates a hard rule, stop and rewrite it. The rules are
strict on purpose; "it matched the mockup at one width" is not success.

---

## The 10 hard rules (summary — full text in the rules reference)

1. **Absolute positioning is allowed ONLY for:** (a) decorative elements that flow across/behind
   multiple content blocks, isolated in one `aria-hidden pointer-events-none` layer; (b) true
   overlays (modal, dropdown, sticky header, toast); (c) a badge/pictogram anchored inside a
   `relative` parent via `%`/`inset`. **Never** for headings, paragraphs, hero text, cards,
   buttons, nav, footer columns, or item grids. Litmus: *"if the text doubled or the font scaled,
   would it break?"* → if yes, it must be normal flow.
2. **No fixed section heights.** Height comes from content + padding. Media uses `aspect-[w/h]`.
3. **No fixed-width content container.** Center with fluid `max-w` + fluid horizontal padding.
4. **Flow primitives.** Figma auto-layout → `flex` + `gap`. Figma grid / true 2-D (text↔image,
   card grids) → CSS `grid` with `fr` / `minmax` / `repeat(auto-fit, minmax())`. Wrapping
   collections → `flex flex-wrap` + `w-fit` items — never per-item fixed pixel widths.
5. **Mobile-first, continuous.** Base styles = smallest width. Add `md:`/`lg:` ONLY for
   *structural* shifts (stack→row, hamburger→nav). No desktop-first, no single `lg:` cliff. The
   layout must not break anywhere in the 768–1023 tablet band.
6. **Fluid over stepped.** Typography, spacing, and section padding scale with `clamp()` from a
   defined token scale. Breakpoints change *structure*, not every pixel value.
7. **Sizing maps from Figma:** hug → `w-fit`/intrinsic; fill → `flex-1`/`w-full`; fixed → only
   for genuinely fixed UI (icon, avatar, logo).
8. **Gaps, not sibling margins,** in flex/grid; values from the spacing scale.
9. **Tokenize everything** (colors, radii, fonts, type scale, spacing scale, breakpoints) in
   `@theme`/CSS vars. Components consume tokens, not magic numbers.
10. **Verification is mandatory and continuous** — see Step 6.

---

## Step 0 — Inputs & mode detect

Typical invocation: **a Figma URL (or several) + a description** — "свёрстай страницу X 1:1 по
этому макету". Parse them:

- **Figma URL(s) → file key + node ids.** `figma.com/design/<KEY>/...?node-id=<NODE-ID>`; convert
  the node-id dash to a colon for the REST API (`518-399` → `518:399`). Collect every frame given
  (e.g. desktop `518-399` + mobile `1390-2242`) — they are the **same page at two widths**, one
  component set. Full parsing + extraction recipe: **[references/figma-extraction.md](references/figma-extraction.md)**.
- **Description = scope + intent** (which page/route, "1:1, the whole page"). The frames are the
  pixel truth; the description says what to build and where it lives.
- **Mode:** *greenfield 1:1 page* (build the full page from the frame), *single component*, or
  *refactor* (fix existing code — use the **Refactor mode** branch below). "build the whole page
  1:1" = greenfield full-page: build the decorative layer + every section top-to-bottom +
  wire the route, accounting for every node (Step 1's lose-nothing protocol).
- **Local ground truth:** the Figma file key + node ids the user gives you, plus any exported
  reference frames (e.g. `.figma-reference/<page>-{desktop,mobile}.png`, read with the Read tool).
- **Stack detect:** confirm the stack from `package.json` + the project's global CSS (e.g. a
  Tailwind v4 project using `@theme inline`, no JS config). Locate where this repo keeps its
  components (e.g. `src/components/<feature>/`) and design tokens (e.g. `src/app/globals.css`); if
  a UI primitive library is present (e.g. shadcn in `src/components/ui/*`), reuse it for form
  fields — see Step 5.

## Step 1 — Ingest the design (deep, lossless)

Follow **[references/figma-extraction.md](references/figma-extraction.md)** in full. The goal is to
parse the node tree **deeply and lose nothing**.

**FIRST ACTION — background & glow sweep (do this BEFORE building anything, at the same time as the
first scout screenshots).** Backgrounds and glows are separate layers that are repeatedly missed
(Vector 6, Ellipse 12 here — missed across multiple iterations). So, up front:
1. Dump `root.fills` AND every top-level child, and flag EVERY node that is a `RECTANGLE`/`VECTOR`/
   `ELLIPSE` with a `GRADIENT_*` fill, an image fill, or ANY `effect` (`LAYER_BLUR`, shadow) — these
   are the band gradients + glows/discs/streaks/halos.
2. **Export each flagged node as PNG and VIEW it** (composite over its band colour; a contact sheet
   is fine). Looking now — not from `fill.type` — is what catches "it's a shaped swoosh / a defined
   blurred disc, not a CSS radial". Record each in the node ledger as a first-class item with its
   frame-rel bbox + `effects`.
3. Note which sibling sections a single band `Rectangle` spans (one continuous gradient → one wrapper
   bg, sections transparent — see the rules reference).
This sweep is mandatory and gated at Step 7; don't defer glows to "polish later" — they're the page's
mood and the most common 1:1 miss.

- **Get the node tree** via the best available channel: Figma Dev Mode MCP → Figma REST API (needs
  `FIGMA_TOKEN`) → Pencil MCP (`.pen` mirror) → exported reference PNGs. If no token/MCP is
  available, say so and ask the user to set `FIGMA_TOKEN` or connect the Figma MCP; meanwhile work
  from the `.figma-reference` exports + description.
- **Walk the whole subtree** depth-first — never stop at a collapsed `"..."`; issue follow-up
  reads until every leaf is seen.
- **Build a node ledger** (`id · name · type · role`) and **account for every leaf**: each node is
  either rendered as content, exported as an asset, or explicitly marked decorative/skipped.
  Reconcile at the end (Step 6). If a node is unaccounted for, you lost it.
- For every node capture **intent**, not coordinates: auto-layout direction, alignment,
  distribution (packed+gap vs space-between), per-child sizing (hug/fill/fixed), constraints,
  padding/gap, text style, fills, radius, effects (see the intent cheatsheet).
- **Classify each layer:** decorative (ribbons, curves, glows, cross-block flourishes → the
  isolated decorative layer, Step 4) vs content (text, buttons, cards, images → flow, Step 5) vs
  **input/control** (→ shadcn, Step 5).
- **Export every asset now** (per figma-extraction §4): vectors → **SVG** (icons → `public/<page>/icons`,
  cross-block lines → decorative layer, maps → real `<svg>`); photos/raster fills → PNG@2x → WebP
  in `public/<page>/photos`. Never ship a screenshotted vector as PNG when an SVG export exists.
- **Extract token candidates:** enumerate distinct font sizes, line-heights, gaps, radii, colors;
  map each to an existing `@theme` token or flag a new one to add (Step 3).

## Step 2 — Layout contract

Before writing code, state in prose (a few lines per block) the intended responsive behavior:
the container strategy, the flex/grid choice, which breakpoints cause **structural** shifts
(`md`/`lg` only), and what must hold continuously across 768–1023. This is the contract you lint
against later. One component set must serve all widths — no separate mobile/desktop trees unless
a genuine structural reflow demands it.

## Step 3 — Tokens

Add or confirm fluid `clamp()` scales in your `{{GLOBALS_CSS}}` `@theme` (type + spacing +
container). Reuse the project's existing token families — `{{TOKEN_PREFIX}}` (e.g.
`--color-landing-*`, `--landing-radius-*`, `--font-pt` in the reference project). Tailwind v4
auto-generates utilities from `@theme` keys: `--text-*` → `text-*` (and `--text-*--line-height`
/ `--text-*--letter-spacing` modifiers), `--spacing-*` → `gap-*`/`p-*`/`m-*`, `--container-*` →
`max-w-*`. Never inline a raw px that should be a token (rule 9). Note: `text-*` utilities do not
set font-weight — keep the weight class (e.g. `font-light` or `landing-h1`) on the element.

## Step 4 — Decorative layer

Build/keep decorative art as a single isolated layer: `aria-hidden`, `pointer-events-none`,
`absolute inset-0`, low z-index, behind content. This is the ONLY sanctioned absolute-positioning
for cross-block flow. Your `{{DECORATIVE_LAYER}}` component is the canonical pattern (e.g.
`src/components/landing/decorative-bg.tsx` in the reference project). Caution: decorative offsets
pinned with `top-[..px]` are tuned to specific section
heights — if you change content heights, those offsets drift (see Step 6).

## Step 5 — Content build + rule-lint

Build content with flow primitives only (flex+gap / CSS grid), top-to-bottom through every section
in the ledger.

**Sliders/carousels** → use **Embla** (`embla-carousel-react`), arrows OUTSIDE the cards and
symmetric, card sized to the viewport so N-per-view scales continuously (no breakpoint jump). See
the "Banked patterns" section of [references/adaptive-layout-rules.md](references/adaptive-layout-rules.md)
— it also records the `--cw`+`calc()` proportional-card pattern and the `cqw`/Turbopack gotcha.

**Form fields → UI primitives.** Any input/control node uses the project's existing primitive
component from `{{UI_PRIMITIVES_DIR}}` (e.g. shadcn `Input`, `Textarea`, `Select`, `Checkbox`,
`Switch`, `Label`, `Dialog`/`Sheet`, … in the reference project; derive your real map with
`ls {{UI_PRIMITIVES_DIR}}`) — never a hand-rolled `<input>`.
**Restyle it to the design**: pass `className` with the Figma's height/radius/padding/border/focus
ring/placeholder colors (prefer tokens); the stock shadcn look is the start, not the finish. Keep
label association + `focus-visible`. Reuse the repo's `react-hook-form` + `zod` patterns for
plumbing. Full mapping table: [references/figma-extraction.md](references/figma-extraction.md) §5.

Then self-lint the diff:

```bash
# {{COMPONENTS_DIR}} / {{CONTAINER}} come from PROJECT-PROFILE.md
# (reference project: src/components/landing and .../container.tsx)
# Fixed section heights (component + call sites) — expect none on <section>
rg -n 'h-\[\d+px\]' {{COMPONENTS_DIR}}/<file>.tsx
# Fixed-width content container — expect none
rg -n 'w-\[\d+px\].*max-w-\[\d+px\]|w-\[\d+px\]' {{CONTAINER}}
# absolute outside the decorative layer — expect only sanctioned badge overlays
rg -nc 'absolute' {{COMPONENTS_DIR}}/<file>.tsx
# Re-introduced arbitrary px type/gap — expect zero
rg -n 'text-\[\d+px\]|gap-\[\d+px\]|leading-\[\d|tracking-\[0\]' {{COMPONENTS_DIR}}/<file>.tsx
# lg: structural utility with no md: companion — review (not a hard fail)
rg -n 'lg:(grid|flex-row|grid-cols|hidden|block)' {{COMPONENTS_DIR}}/<file>.tsx | rg -v 'md:'
```

Reject and rewrite anything the lint surfaces (the last check is a review prompt, not a fail).

## Node-truth protocol — NEVER reproduce a visual node from its properties; export it and LOOK

**This is mandatory and has bitten real builds repeatedly (Vector 6 swoosh, Ellipse 12 blurred
disc, both shipped wrong because they were guessed from `fill.type`).** A node's *type/fills/effects*
do NOT tell you how it renders. Before writing ANY CSS for a visual element — a gradient, glow,
disc/ellipse, streak, halo, ribbon, 3D render, or anything with an `effect` — you MUST:

1. **Export the node** as PNG (`/v1/images/<KEY>?ids=<id>&format=png&scale=2`).
2. **Composite it over its band colour** and **VIEW it with the Read tool** (look, don't assume).
3. **Read `node.effects`** too (`LAYER_BLUR`, shadows) — a `GRADIENT_LINEAR` ellipse + `LAYER_BLUR`
   renders as a *defined soft disc*, NOT a `radial-gradient(...,transparent)` glow.
4. **Reproduce to MATCH WHAT YOU SAW**, then re-export your app's region and put the two crops
   side-by-side. They must match — not "look plausible".

CSS is allowed ONLY for a shape you have viewed and confirmed is a crisp, unblurred, plain
round/rect gradient. Anything blurred, shaped, or that must read as a solid disc/curve → **ship the
exported PNG**. "I'll approximate this glow/circle with a radial-gradient" without exporting+viewing
first is the single most repeated defect — it is forbidden.

## Step 5b — Motion & reduced-motion intent

Figma frames are static, but a design still carries motion intent (a section that reveals on
scroll, a staggered card entrance, a Smart-Animate transition between frames). If the project has
an animation system (e.g. `motion`/`framer-motion` with a reveal-on-scroll hook), wire
reveals/transitions through it rather than ad-hoc CSS, and read the intended motion from the frame
names / prototype links where present. **Always gate motion behind `prefers-reduced-motion`**
(e.g. the project's `useReducedMotion` hook) so it degrades cleanly to no-motion — verify BOTH
states. If the project has no motion system, ship static and flag it; don't invent one unprompted.

## Step 6 — Verify loop (mandatory)

Built on the Playwright MCP; no pixel-diff library required.

1. **Serve.** Ensure the dev server is up: `{{DEV_CMD}}` → `{{DEV_URL}}` (reference project:
   `npm run dev` → `https://localhost:3000`, self-signed cert via `--experimental-https`).
   Navigate with `mcp__playwright__browser_navigate`, then
   **confirm the page actually rendered** with `mcp__playwright__browser_snapshot` or
   `mcp__playwright__browser_wait_for` on a known landing element before capturing. If a TLS
   interstitial blocks navigation, the Playwright MCP server needs HTTPS-error ignoring enabled.
2. **Capture** at each width in `{{VIEWPORTS}}` (reference set **360 / 600 / 768 / 900 / 1024 /
   1440**): `browser_resize` (height tall, e.g. 2400, or full-page) → `browser_take_screenshot` →
   save to `.compare/app-<W>.png` (this dir is gitignored). Use per-element screenshots when
   diagnosing one section.
3. **Compare** by reading both images with the Read tool: app shot vs
   `{{REFERENCE_DIR}}/<page>-mobile.png` (narrow widths) or `<page>-desktop.png` (wide widths).
   Intermediate widths have no direct Figma export — judge them for smooth interpolation (no
   breakage), not pixel match.
   Check proportion, spacing rhythm, alignment, type scale, color, and decorative placement.
4. **Continuity sweep.** Resize across the tablet band (768→850→950→1023), capturing each, and
   confirm nothing collapses, overflows, or jumps. At every width assert no horizontal overflow:
   `browser_evaluate` → `document.documentElement.scrollWidth <= window.innerWidth`.
5. **Pass criteria:** visual match at 360 & 1440 to the Figma exports; smooth continuity 768–1023;
   zero horizontal overflow at every width; rule-lint clean. If any fail, loop back to Step 5.

Optional: `scripts/compare-grid.mjs` stitches figma-left/app-right contact sheets, but only if
`sharp` is installed — it is gated behind a dependency check and never blocks. The MCP + Read
path is primary.

## Step 7 — Self-check & report

- **Lose-nothing reconcile:** walk the Step-1 node ledger and confirm every node is accounted for
  (rendered / exported-asset / explicitly-decorative). List anything dropped and go fix it.
- **Decoration-parity audit (GATE — cannot declare done without it):** list EVERY visual node
  (gradient fill, `LAYER_BLUR`/shadow effect, image fill, glow, disc/ellipse, streak, halo, render)
  and, for each, state its method: `exported-PNG+viewed+side-by-side-matched` OR
  `CSS (confirmed crisp plain round/rect after viewing the node)`. If ANY decoration was reproduced
  from `fill.type` without exporting+viewing it, that is a defect — export it, view it, fix it, and
  re-audit. No node may be marked done on assumption.
- **Measured-not-eyeballed check:** confirm you READ values from the browser (`getComputedStyle`
  `fontSize`/padding/gap/radius per breakpoint, `getBoundingClientRect` edges vs the header logo,
  `scrollWidth<=innerWidth`) — not judged by eye on a crop. A 16px-vs-56px heading or a
  glow-vs-disc is invisible on a compressed screenshot; only the measurement/export catches it.
- Run the 10-rule checklist explicitly.
- Produce a short report: per-viewport pass/fail, any continuity break in 768–1023, residual
  fixed-px, assets exported (SVG vs raster), form fields mapped to shadcn, and files changed.
- If any rule fails or a node was lost, return to Step 5.

---

## Refactor mode (existing code branch)

When the user points at an existing component (e.g. `hero-section.tsx`, `promo-section.tsx`):

1. **Read** the component and its call sites (props passed in `page.tsx` can override classes via
   tailwind-merge — check for height/width overrides at the call site, not just the component).
2. **Baseline.** Capture screenshots at all 6 widths *before* any change (Step 6 capture).
3. **Inventory violations** against the 10 rules (fixed heights, absolute-for-content,
   fixed-width container, per-item fixed px, stepped type with no fluid scale).
4. **Translate, don't transcribe.** For each fixed value, recover the *intent* it encodes (a
   570px column = "half the content row"; a `top-[391px]` text block = "the text column") and
   rebuild it with flow primitives + tokens, preserving the existing decorative layer.
5. **Re-verify** against the baseline shots AND the `.figma-reference` exports. The refactor must
   be **behavior-preserving at the two anchor widths** (~360 and ~1440) and **improve** every
   width in between.

---

## Composition with other design tooling

- This skill targets **React + Tailwind v4** output. If you also use an HTML/vanilla design tool,
  keep the two separate — different output substrate; don't reuse emitters across them.
- The Step 6 verify loop is a standard render→screenshot→critique→iterate discipline, specialized
  here to fixed Figma-export ground truth and the named viewports with a continuity sweep.
- Tokenize-first (Step 3): extend the project's existing `@theme` tokens with `clamp()` scales
  rather than inventing a new system.
