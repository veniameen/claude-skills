---
description: Drive an already-built route to 1:1 with its Figma frame — adversarial per-section diff + auto-fix loop
argument-hint: <figma-node-id> <route> [extra-node-ids…]
allowed-tools: Bash, Read, Edit, Write, Workflow, Agent, mcp__playwright__browser_navigate, mcp__playwright__browser_resize, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_evaluate
---

You are running the **figma-1to1** loop: take an EXISTING built route and drive it to pixel-faithful 1:1
with its Figma frame(s), finding the mismatches yourself instead of waiting to be told. This is the
verify→critique→fix loop of the `figma-fluid-react` skill, made explicit and repeatable.

ARGUMENTS: `$ARGUMENTS` — first token(s) are Figma **node-id(s)** (dash form, e.g. `518-1238`), the last
token is the **route** to compare (e.g. `/internship/system-analysis`). If a node-id has a paired
mobile frame, accept both. If the route or node-id is missing, ask once, then proceed.

Read first (don't skip): `.claude/skills/figma-fluid-react/references/adaptive-layout-rules.md` and
`references/figma-extraction.md` — the hard rules + the lose-nothing/measure-don't-eyeball discipline.
This command does NOT build from scratch (that's `/figma-fluid-react`); it assumes the route exists and
fixes fidelity gaps.

## Loop (repeat until clean or 3 rounds)

1. **Ground truth.** Auto-load `FIGMA_TOKEN` from `.env`. Export each frame hi-res via REST
   (`/v1/images/<KEY>?ids=<id>&format=png&scale=2`, token in `X-Figma-Token` header only — never write
   it to a tracked file) into `.figma-reference/`. Also pull the node JSON
   (`/v1/files/<KEY>/nodes?ids=<ids>&geometry=paths`) so findings can be checked against real values.
   **Then, immediately, the background & glow sweep:** dump `root.fills` + every node with a
   `GRADIENT_*`/image fill or an `effect` (`LAYER_BLUR`/shadow) — band rectangles, glows, discs,
   streaks, halos — **export each and VIEW it** (this is where "missed Vector 6 / wrong-shaped circle"
   bugs hide). List them with bbox + effects before diffing sections.
2. **Render.** Ensure `npm run dev` is up (https://localhost:3000). Navigate to the route with the
   Playwright MCP; confirm it rendered. Full-page screenshot at the anchor widths **1440** and **360** → `.compare/`.
3. **Slice aligned bands.** With ImageMagick, cut the Figma frame and the app screenshot into the SAME
   per-section bands (by the section y-offsets from the node JSON, scaled). Keep desktop and mobile
   separate.
4. **Adversarial diff (Workflow, one agent per section).** Fan out: each agent reads its Figma crop +
   app crop + that section's node values, and returns structured findings —
   `{section, severity, kind, figma, app, fix}` where `kind ∈ {missing-element, wrong-component
   (grid-vs-slider/static-vs-loop), wrong-size/spacing, wrong-color/fill, missing-decoration,
   misalignment, overflow}`. Instruct agents to **cross-check every claim against the node JSON** and
   drop anything that only looks off due to crop compression (the reviewers-over-read caveat). Schema-
   force the output.
5. **Triage.** Collect, dedupe, sort by severity. Discard low-confidence/contradicted-by-node findings.
6. **Fix** (main loop, you): apply each confirmed finding, obeying the 10 rules (no fixed heights, flow
   primitives, tokens, one client island for Radix `useId`, masked-`::before` for transparent gradient
   borders, export composited halo groups, shaped glows as PNG, sliders that actually loop, etc.).
7. **Re-verify** the touched sections: re-screenshot, re-measure against the node (font-size, pad, gap,
   `getBoundingClientRect` edges vs the header logo), assert `scrollWidth <= innerWidth` at every width.
8. If confirmed findings remain and rounds < 3, loop. Else stop.

## Node-truth gate (do this BEFORE writing any CSS for a visual element — REQUIRED, not optional)
For every decorative/visual node (gradient, glow, disc/ellipse, streak, halo, ribbon, render, or
anything with an `effect`): **export the node as PNG, composite over its band colour, and VIEW it with
the Read tool**; also read `node.effects` (`LAYER_BLUR`/shadow). Reproduce to MATCH what you saw, then
put your app's crop next to the node export — they must match. NEVER reproduce from `fill.type`
(a `GRADIENT_LINEAR` ellipse + `LAYER_BLUR` is a defined soft disc, NOT a `radial-gradient(...,
transparent)` glow). CSS only for a shape you viewed and confirmed is a crisp, plain round/rect
gradient; anything blurred/shaped → ship the exported PNG. This guess-from-type mistake is the most
repeated defect — the gate exists to stop it.

## Hard checks every round (measure/look, never eyeball-and-assume)
- No horizontal overflow at 360 / 600 / 768 / 900 / 1024 / 1440 (the skill's canonical viewport set).
- Content left edge == header-logo left edge (desktop and mobile), by `getBoundingClientRect().left`.
- Tag/pill/heading/body font-size, padding, radius, gap == node values (`getComputedStyle`), per
  breakpoint — **measure every heading's `fontSize`** (a 16px-vs-56px heading is invisible on a crop;
  e.g. `cn("text-h1", "text-color")` silently drops the size token).
- **Decoration parity:** every glow/disc/streak/halo/render was export+viewed and matched (see the
  node-truth gate) — none reproduced from `fill.type`. List each node + its method.
- Every Figma node accounted for (rendered / exported-asset / explicitly decorative) — list anything dropped.
- A "slider" with arrows actually scrolls: if N cards fill the viewport, it can't — keep the frame's
  card size, make it a real slider (mobile scrolls), grey arrows where all fit; assert the inline
  track `translate3d` / leftmost card changes on an enabled arrow click.

## Report
Per round: confirmed findings + the fix applied, and what was declined (and why). End with a per-viewport
pass/fail table and the files changed. If a node was lost or a rule still fails, say so explicitly.
