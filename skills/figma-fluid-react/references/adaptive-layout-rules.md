# Adaptive Layout Rules

The strict rule set for building professional, fluid, responsive layouts from Figma. These rules
are deliberately hard: a violation is a defect, not a style preference.

## Mental model

**A Figma frame is a snapshot of ONE width of a fluid system.** It is not a coordinate map.

A professional frontender does not look at a 1440px frame and write `left-[579px] top-[316px]
w-[570px]`. They look at it and ask: *what is this element, what is it next to, how does it want
to grow or shrink, and what happens at 800px and at 360px?* The frame tells you **intent** —
auto-layout direction, alignment, spacing rhythm, sizing mode, constraints. You translate intent
into flow (flex/grid), not geometry into coordinates.

Desktop and mobile frames are **the same components at two widths**. You build **one** component
set that reflows. If you find yourself building a "mobile version" and a "desktop version" of the
same content, stop — that is two designs where there should be one.

## The 10 hard rules

### 1. Absolute positioning is reserved

`position: absolute` (Tailwind `absolute`/`fixed`) is allowed **only** for:

- **Decorative flow** — lines, curves, ribbons, glows that visually run across or behind multiple
  content blocks. These live in **one isolated layer**: `aria-hidden pointer-events-none
  absolute inset-0` at a low z-index, separate from all content.
- **True overlays** — modals, dropdowns, popovers, tooltips, sticky headers, toasts.
- **Anchored badges** — a pictogram/badge pinned to a corner of a specific element, positioned
  **inside a `relative` parent** using `%`/`inset`/`translate`, never page coordinates.

It is **forbidden** for: headings, paragraphs, hero text blocks, cards, buttons, form fields,
nav items, footer columns, and any grid/list of items.

> **Litmus test.** *"If this text doubled in length, or the user bumped the font size, or the
> locale switched to German — would absolute positioning break the layout?"* If yes, it must be
> normal flow.

```tsx
// ✗ content positioned by coordinates
<div className="absolute left-[579px] top-[316px] w-[570px]">…hero text…</div>

// ✓ content in flow; a badge anchored inside its relative parent
<div className="relative aspect-square">
  <Image fill … />
  <span className="absolute right-[8%] top-[6%] w-[12%]">badge</span>
</div>
```

### 2. No fixed section heights

A section's height is the sum of its content plus padding. Never `h-[450px]` / `h-[670px]` on a
`<section>`. Fixed heights clip on text reflow, browser zoom, and longer locales. Use vertical
padding (ideally fluid: `py-fl-section`). Media that needs a shape uses `aspect-[w/h]`, not a
height.

### 3. No fixed-width content container

The content column is centered with a fluid `max-width` and fluid horizontal padding — never a
hard `w-[267px]`. A fixed mobile width turns every tablet into a tiny centered strip.

```tsx
// ✗  <div className="w-[267px] lg:w-full lg:max-w-[1164px]">
// ✓  <div className="mx-auto w-full max-w-content px-page-x">
```

### 4. Flow primitives, chosen by dimensionality

- **1-D arrangement** (a row of buttons, a stack of text) ← Figma auto-layout → `flex` + `gap`.
- **2-D arrangement** (text beside image, a card grid) → CSS `grid` with `fr` / `minmax(0,1fr)`
  / `repeat(auto-fit, minmax(min, 1fr))`. Never fixed track widths like `grid-cols-[570px_570px]`.
- **Wrapping collection** (tags, city pills) → `flex flex-wrap gap-*` with `w-fit` items. Never a
  hand-measured per-item pixel width.

### 5. Mobile-first and continuous

Base (unprefixed) classes target the **smallest** width. Add `md:` / `lg:` **only** to change
*structure* — stack→side-by-side, hamburger→full nav, 1-col→multi-col. Do not restate every pixel
at `lg:`. Never desktop-first. Never a single `lg:` cliff with nothing below it. The layout must
remain correct at **every** width in 768–1023, not just at the two frame widths.

### 6. Fluid over stepped

Typography, spacing, and section padding scale continuously with `clamp(min, preferred, max)`
from a defined scale, so the design adapts at every width instead of jumping once. Breakpoints
are for structural change; sizing is fluid.

```
--text-h1: clamp(26px, 2.778vw + 16.67px, 56px);   /* 26 at 360px → 56 at 1440px */
--text-body: clamp(12px, 0.370vw + 10.67px, 16px);
```

Slope for `clamp(MIN, A·vw + B, MAX)` between viewports `Vmin→Vmax`:
`A = (MAX−MIN)/(Vmax−Vmin)·100`, `B = MIN − (MAX−MIN)·Vmin/(Vmax−Vmin)`.

### 7. Sizing maps straight from Figma

| Figma sizing | CSS / Tailwind |
|---|---|
| Hug contents | `w-fit` / `h-fit` (intrinsic) |
| Fill container | `flex-1` (in flex) / `w-full` |
| Fixed | only for genuinely fixed UI — an icon, avatar, or logo |

A "fixed" width in the frame is usually really "fill half the row" or "hug its label." Recover
the real intent before reaching for a pixel value.

### 8. Gaps, not sibling margins

Space between siblings in flex/grid comes from `gap-*`, drawn from the spacing scale. Avoid
`mt-*`/`mb-*` chains and `space-y-*` for layout rhythm, and avoid one-off arbitrary values like
`gap-[11px]` — promote them to a token.

### 9. Tokenize everything

Colors, radii, font family, the type scale, the spacing scale, the container width, and
breakpoints live as tokens (`@theme` / CSS variables). Components consume tokens. A magic number
in a component is a missing token.

### 10. Verification is mandatory and continuous

Render the running app at **360 / 600 / 768 / 900 / 1024 / 1440**, compare to the Figma
references, and resize-sweep the tablet band to confirm continuity. Assert no horizontal overflow
(`scrollWidth <= innerWidth`) at every width. A layout that matches at 375 and 1440 but breaks at
800 **fails**.

## Quick litmus checklist (run before declaring done)

- [ ] Is anything content positioned with `absolute` + coordinates? → fail (rule 1).
- [ ] Does any `<section>` have a hard `h-[..px]`? → fail (rule 2).
- [ ] Is the content container a fixed width? → fail (rule 3).
- [ ] Any `grid-cols-[..px_..px]` or per-item fixed pixel widths? → fail (rule 4).
- [ ] Any `lg:` structural jump with nothing for the tablet band? → review (rule 5).
- [ ] Any stepped `text-[..px] lg:text-[..px]` where a fluid token belongs? → fail (rule 6).
- [ ] Any arbitrary `gap-[..px]` / `mt-[..px]` not from the scale? → fix (rule 8).
- [ ] Did it survive the 6-width capture + continuity sweep with no overflow? → required (rule 10).

## Worked examples (reference project — illustrative)

### Hero text block
- **Before:** `absolute left-[2px] top-[391px] w-[267px] … lg:left-[579px] lg:top-[316px] lg:w-[570px]`.
- **Intent:** "the text column of a two-column hero; image/decoration fills the other half."
- **After:** a `flex flex-col gap-fl-1` text column inside a `lg:grid lg:grid-cols-2` hero;
  no section height; `text-h1`/`text-body` for fluid type. The decorative hero card stays in the
  decorative layer.

### Promo section (text ↔ image)
- **Before:** `absolute left-0 top-0 … lg:grid lg:grid-cols-[570px_570px]`, image `h-[267px]
  w-[267px] lg:h-[570px] lg:w-[570px]`, section `h-[450px] lg:h-[670px]`.
- **Intent:** "two equal columns on desktop; stacked on mobile; image is a square."
- **After:** `flex flex-col gap-fl-1` → `lg:grid lg:grid-cols-2 lg:items-center`; image is
  `relative aspect-square w-full max-w-[…] mx-auto` with `Image fill`; section uses
  `py-fl-section`, no height. The bug badge is `%`-anchored inside the relative image box.

### Stats carousel
- **Before:** per-card `w-[267px]`, arrows `absolute top-[80px] lg:top-[178px]`.
- **Intent:** "a row of equal cards; arrows centered on the row's vertical midline."
- **After:** `flex gap-fl-*` cards with a `basis`/`min-w` token (or scroll-snap on mobile); arrows
  anchored in a `relative` wrapper with `top-1/2 -translate-y-1/2`, not a measured pixel offset.

### Russia city pills
- **Before:** 14 hand-measured per-city widths (`81px`, `54px`, `109px`, …).
- **Intent:** "a wrapping set of pills that hug their label."
- **After:** `flex flex-wrap gap-fl-*` with each pill `w-fit px-* py-*`. The label decides the
  width; the row wraps naturally at any container width.

## Banked patterns & gotchas (transferable rules — keep adding; project specifics are illustrative `e.g.` only)

### Sliders / carousels
- Use a real library — **Embla** (`embla-carousel-react`; the same library shadcn's carousel uses).
  Don't hand-roll scroll/snap.
- Arrows live **OUTSIDE** the cards, **in flow** (`[arrow] [viewport flex-1] [arrow]`), with
  **symmetric** spacing on both sides (one gap token). Never overlay arrows on the cards; never
  let one side's gap differ from the other.
- To show **N cards per view at all desktop/tablet widths AND ~2 on mobile with NO breakpoint
  jump:** size the card to the viewport so the visible count changes *continuously* inside the
  scroller. Do **not** switch a fixed slides-per-view at a breakpoint — that makes the card size
  (and count) jump, which reads as "everything suddenly got smaller / shifted."

### Fixed-proportion cards that must scale as a single unit
- Drive the card from ONE CSS variable `--cw` (its width, a `clamp()`), then derive **every**
  inner size from it with `calc(var(--cw)*k)` — number, padding, radius, gap, caption. The card
  and its content then stay proportional at any width → 1:1 with Figma at both ends, and the card
  is never an empty outline.
- Clamp shape: `--cw: clamp(<mobileFloor>, calc(<N-up vw expression>), <desktopCap>)`. The floor
  sets the mobile count, the cap sets the desktop card size, the middle keeps N-up while scaling.
  Example (4-up desktop → ~2-up mobile): `clamp(140px, calc(25vw - 53px), 250px)`.

### Gotchas (Next/Turbopack + Tailwind v4)
- **Container-query units (`cqw`) can be UNRELIABLE.** If `@container` or
  `[container-type:inline-size]` fails to establish a context, `cqw` renders huge (pill/oval
  cards) or as `0px` (invisible text). Symptom → cause → fix: when sizes blow up or collapse,
  suspect a missing container context and switch to `clamp(vw)` or the `--cw` + `calc()` pattern instead.
- **Never fluid-scale a fixed-size card's text by the full viewport** (e.g. a global type token
  maxing at the design's max width) — the card box reaches full size earlier than the text, so the card looks
  empty. Scale the text *with the card* (via `--cw`).
- Arbitrary `clamp()`/`calc()` in Tailwind classes need **underscores for the spaces around
  `+`/`-`**: `min-h-[clamp(681px,21.76vw_+_602.7px,916px)]`, `w-[calc(25vw_-_53px)]`. `*` and `/`
  do not need spaces. (A missing space → invalid CSS → the utility silently does nothing.)
- Sections needing vertical breathing use a fluid **`min-h-[clamp(...)]`**, not a fixed height —
  keeps the design's rhythm and decorative-layer alignment while still growing with content.
- After changing section heights, **re-check the decorative layer** — streaks pinned with
  `top-[..px]` drift; match the new cumulative height or make their offsets fluid.

### Hero / decoration

- **Get a Figma token early.** Pixel-accurate placement of decoration is guesswork without node
  coords; with a token (`FIGMA_TOKEN`) read `absoluteBoundingBox` and export the real assets via the
  REST API, then place at the exact frame coords instead of nudging by eye.
- **Decoration drawn for a fixed frame (e.g. a 1920 design) must scale with the viewport** or it looks
  oversized on narrower screens: wrap it in `w-[<frameW>] origin-top-left` +
  `style={{transform:"scale(min(1, calc(100vw / <frameW>px)))"}}`. Content stays fluid; only the
  decoration scales — so it keeps the Figma proportion at any width.
- **Decoration that bleeds from one edge** (not centered) → anchor it to that edge
  (e.g. `left-[<offset>]`), not `calc(50%-X)`; center-anchor pushes it off-screen on widths below the
  frame. (Center-anchor only for decoration that should track centered content.)
- **Fixed-spec controls (buttons) → match the Figma height exactly** with `h-[clamp(<mobileH>, vw,
  <desktopH>)]` + `items-center` + fluid `px`; don't let padding+line-height "add up" to a guessed
  height (it drifts).
- **Horizontal nav must not wrap to 2 lines** in a narrow container: `whitespace-nowrap` on items
  + a fluid gap (`gap-[clamp(16px,1.6vw,28px)]`) + `justify-between` + `shrink-0` on logo/icons.
- **"Figma-spacious" side margins with fluid content** = a narrower container `max-w` + side
  padding that grows on wide screens (`px-[clamp(16px, ~2.4vw, ~32px)]`); keep tablet/mobile
  near-full-width so content stays usable. A header/nav may use a slightly wider container than
  the body if its content needs it — but prefer one shared `<Container>` for edge alignment.
- **Mobile side padding ≠ desktop.** Read the mobile frame's content padding from Figma (e.g. the
  padding on a 375 frame) and apply it; compensate the desktop `max-w` so desktop margins are
  unchanged. A slider can **bleed past** the content padding (negative margin / overlay arrows in
  the padding) so its cards aren't pushed inward — match the Figma slider's bleed.

### Decorations that span/connect FLUID sections → anchor to content, NOT frame-y
**Principle:** a decoration that visually relates to specific content must be anchored to that
content, not to a global coordinate. **Symptom:** a streak/line meant to connect two sections
(e.g. a graphic bridging two adjacent blocks) lines up at one viewport width but drifts on others.
**Cause:** it was pinned at a fixed Figma frame-y in a global decorative layer; frame-y only aligns
where the cumulative section heights happen to equal the frame's y. Because fluid section heights ≠
frame coordinates, it's right at one width and wrong elsewhere. **Fix:** anchor it to the sections
it connects.
- **Pattern:** wrap the connected sections in a `relative` div; place the decoration
  `absolute left-[<frameX>] top-1/2 -translate-y-1/2 z-0` so it's **centered on the section
  boundary** (and behind the content). Now it sits in the gap at every width.
- Global, top-anchored decorations (hero streaks) are fine in the shared decorative layer; only
  mid/lower decorations that relate to specific content need this content-anchoring.
- This is why a "scale the whole decorative layer" approach fails for mid/lower elements: scaling
  from the top shifts their y away from the (unscaled, fluid) content. Anchor instead.

### Footer / narrow centered cluster
**Principle:** a block whose content is a **compact centered cluster** much narrower than the page
(e.g. a footer cluster a few hundred px wide in a wide frame) is NOT the full-width container with
`justify-between` pushing items to the screen edges.

**Symptom:** the cluster ends up too narrow (gutter squeezing it inward) or its items splay to the
viewport edges instead of grouping in the centre.

**Cause:** baking the cluster width into the outer `max-w` *minus* the page gutter double-subtracts
the gutter; or assuming `justify-between` when the design is actually a centered group.

**Fix / detection:** read the Figma widths — measure the cluster's true left/right extent
(`node.absoluteBoundingBox` of the outermost content). If it's centered, `(left+right)/2 ≈ frameW/2`.
- **Pattern:** outer wrapper `mx-auto max-w-content px-page-x items-center` (so the page gutter +
  centering stay standard via the shared container), then the cluster itself is its **own**
  `w-full max-w-[<clusterW>]` child, centered by the wrapper's `items-center`. Do NOT subtract the
  gutter from the outer `max-w` to fit the cluster. Keep the outer wide (`max-w-content`) and cap
  the cluster directly.
- At larger breakpoints the cluster width is effectively **constant** (available width always exceeds
  its `max-w`), so fixed-px asset spacing inside it (e.g. `gap-8` between logo↔social, `gap-1` nav
  rows) is fine and rule-7-compliant — it never changes size, it just gains side margin. This is the
  "fluid content + bigger fields" choice applied to a fixed-design cluster.
- **Two unequal columns, bottom-aligned content:** when one column's content (e.g. logo/social) sits
  at the *bottom* of its column, level with the taller column's last item, reproduce with
  `flex items-stretch justify-between` on the row (shorter column stretches to the taller column's
  height) + `flex flex-col justify-between` on that column (top content pinned top, bottom content
  pinned bottom). No fixed heights, no absolute.
- **Verify text alignment from the node, not assumption:** a column can *look* right-aligned while
  every item shares the same *left* x in Figma → it's left-aligned, just positioned in the right
  column. Don't reach for `text-right` on a hunch. Always confirm alignment by comparing the items'
  left edges in the high-res export.
- **Per-breakpoint content swap:** when the mobile design reduces to a subset (e.g. just a centered
  logo/mark, dropping contacts/nav/social), keep the full cluster `hidden md:flex` and render the
  reduced mobile variant `md:hidden` — same component, two structural variants, not two pages.

### Restyling shadcn/UI form controls to a design (search bars / forms)
Don't hand-roll inputs — reuse the project's shadcn primitives (`Input`, `SelectTrigger`, …) and
restyle them to the design. The primitives compose classes via `cn()` (tailwind-merge) and pass
`className` LAST, so your overrides win conflicting utilities automatically
(`rounded-md`→`rounded-full`, `border-input`→`border-<accent>`, `h-9`→`h-[clamp…]`). Two traps
tailwind-merge does NOT resolve for you:
- **Variant defaults survive.** A primitive may ship a breakpoint default like `md:text-sm`; a base
  `text-body` won't override it at `md`. Add the `md:` form too (`text-body md:text-body`). Same for
  any `dark:` defaults — add e.g. `dark:bg-transparent` if you don't want the stock
  `dark:bg-input/30`.
- **`data-[…]` defaults out-specify plain utilities.** A trigger that sets `data-[size=default]:h-9`
  must be beaten with `data-[size=default]:h-[clamp…]`, not a plain `h-[…]`.
- Recolor a built-in icon (e.g. a select chevron) via the child selector:
  `[&_svg]:text-<accent> [&_svg]:opacity-80`. Dropdown/popover content renders in a portal — style
  it separately (`SelectContent`), since the stock popover often defaults to a light theme. Keep one
  shared field-class string so every control matches.
- A row that reflows (input + N selects + button): make the text input `md:flex-1 min-w-0` (grows),
  selects width-clamped, button `shrink-0`; wrap the trailing control pair in a `flex gap-2
  md:contents` div so they share the final MOBILE row (one design group) yet rejoin the single
  desktop flex row.

### Light "glass" cards with a 1px gradient border (over a tinted band)
Symptom: a card looks like a flat opaque panel and floats off its background. Cause: in Figma the card's
fill is *none* with a gradient *stroke* — it is NOT a solid panel but near-transparent glass that barely
separates from the band behind it; the faint gradient border is what defines it. Fix: build the 1px
gradient border with the padding-box/border-box trick in a utility class and fill near-transparent:
`background: linear-gradient(var(--card-fill),var(--card-fill)) padding-box, var(--border-grad) border-box; border:1px solid transparent;` with a low-alpha fill (e.g. `--card-fill: rgba(255,255,255,0.18)`) and a
*low-opacity* `--border-grad`. The first pass is almost always too opaque and too crisp; dial the fill to
~0.15–0.20 alpha and the border-gradient stops to ~0.4–0.55 alpha until it reads as glass, not a card.

### Reproduce backgrounds/halos/glows as CSS, export only true raster
Most "image" nodes on a page are decorative fills, not real raster. Symptom: you export every image-like node and end up with heavy, non-fluid PNGs for things that are just gradients. Cause: Figma represents panels, bands, halos, and buttons as fills/effects, not photos. Fix: export only the genuine 3D renders/photos (PNG@2x via the imageRef → `/v1/files/:key/images` map) and rebuild the rest as CSS tokens:
- Section panels → `linear-gradient`.
- The light page band → `radial-gradient`. Keep it WHITE-dominant: a centered radial reads far bluer than the mockup, so push white to ~50% and pale the outer stop.
- Figure halos → a blurred `radial-gradient` disc behind the render. Size them ~full figure box and **soft** — first pass is always too small/too hard-edged. Aim for something like `inset-[-2%] blur-[40px]`, radial fading to transparent, not a tight defined circle.
- Gradient buttons → CSS tokens too.

> **BUT a SHAPED glow is not CSS-able — export it.** A `VECTOR` node with a `GRADIENT_RADIAL`/`GRADIENT_LINEAR` fill is only a CSS `radial-gradient` if its geometry is a plain disc/rect. A node may *look* like a simple radial glow from its fill, yet its `fillGeometry` is a curved comma/swoosh or other asymmetric shape spanning the frame. A centered `radial-gradient` circle can NOT reproduce that — it reads as a flat blob and the page looks wrong. **Before approximating any glow as CSS, render the node** (`/v1/images?ids=<id>&format=png`) and LOOK at it (composite over the band colour to see the transparent glow); if the bright region is a curve/streak/asymmetric shape, ship the PNG in the decorative layer at its Figma bbox (`left-1/2 -translate-x-… w-[clamp(…,…vw,<frameWidth>px)]`, mobile bbox separately) instead. Only genuinely round/rectangular gradient fills are CSS.
>
> **This applies to plain ELLIPSES too — always check `node.effects`.** A circle decoration is *not*
> automatically a CSS `radial-gradient`. An `ELLIPSE` with a **`GRADIENT_LINEAR` fill + a `LAYER_BLUR`
> effect** renders as a *defined* disc with a soft-but-clear circular edge — NOT a glow fading to
> transparent. Approximating it with `radial-gradient(circle, …, transparent X%)` + `blur` deletes the
> circle (you get a faint blob with no edge → "круг без чёткой границы, не как на макете"). So: read
> the ellipse's `fills` (gradient kind + stops + handle direction) **and** `effects` (`LAYER_BLUR`
> radius); if there's a blur or the disc must read as a solid circle, **export the node as PNG** (the
> blur + gradient bake in with the exact edge) and place it — don't hand-build it. Reproduce in CSS
> only a crisp, unblurred, plain-gradient circle. Lesson learned the hard way over several iterations:
> render+LOOK at *every* decorative fill node (even a circle) before writing CSS for it.

### Re-export a composited node when an imageRef covers only one layer
**Symptom:** an illustration built from an image fill plus overlaid vectors (e.g. a textured shape with separate vector paths on top) renders incompletely — the node's `imageRef` gives you ONLY the fill layer, often on a transparent background that previews as black.
**Cause:** the `imageRef` is a single layer's raster, not the flattened composite of the group.
**Fix:** export the whole GROUP node as a PNG so the layers are composited together:

```
/v1/images?ids=<groupNodeId>&format=png&scale=3
```

**Then size it carefully:** the `imageRef` bbox can be smaller than the node's layout box (e.g. the visible artwork is `<artW>` wide but the layout box is `<boxW>` to leave room for a halo/glow/shadow). If you let the composited render fill the whole box it will look oversized. Scale the `object-contain` image down by the ratio of artwork-to-box so it sits inside the box at its true size — e.g. `scale-[0.84]` for an `<artW>`-in-`<boxW>` case. Oversized illustrations are a common review finding.

### Zoomed/cropped decorations on mobile must anchor toward their focal part, not away
**Principle:** when a wide decoration (ribbon/streak/blob) is shown zoomed + cropped on a narrow viewport, the crop must keep the meaningful (focal) part of the image in frame.

**Symptom → cause → fix.** *Symptom:* the focal detail of a decoration disappears off the edge on mobile, and/or an adjacent heading collides with the zoomed art. *Cause:* the image is anchored/translated toward the wrong side, so scaling pushes the focal part out of view; and the heading has no clearance below the enlarged decoration. *Fix:* read the design's mobile horizontal offset to learn which side bleeds — if it's negative (image bleeds left), the focal element is on the right, so anchor the image to the right (`ml-auto`) with a *small negative* translate so that part isn't clipped at the right edge. A *positive* translate would push the focal part off-screen. Mirror the logic if it bleeds the other way.

Also give any adjacent heading real top clearance below the zoomed decoration, e.g. `pt-[clamp(…big mobile floor…)]` — heading/decoration collision is a common mobile regression.

### Workflow shape for a full 1:1 page
scout (frames as hi-res PNG + node JSON + section map) → **parallel extract** (one agent per
component: exact colors/sizes/gaps + asset-export plan + token-delta, reading the node JSON via a
shared python helper) → build inline (tokens → leaf components → sections → page) → verify loop
(screenshots + overflow) → **parallel adversarial review** (one agent per section reads the Figma
crop vs the app screenshot and returns ranked mismatches) → fix. Cross-check every review finding
against the measured node values before acting — reviewers over-read compressed crops (e.g. "section
bg too dark" when the node fill matched exactly and the real cause was an undersized halo behind it).

### High-res Figma crops for 1:1 verification (token workflow)
Symptom: a comparison export is too coarse to judge a small region's alignment/spacing — cause: the default frame export is low-res (often ≈480px wide). Fix: re-export the whole frame at scale 1.5–2 via the REST images API (`/v1/images/:key?ids=<node>&format=png&scale=2`, token in the `X-Figma-Token` header only — never written to the repo), then crop the region with ImageMagick (`magick frame.png -crop WxH+X+Y +repage out.png`). `sips -c` crops *centered* and ignores `--cropOffset` on macOS — use `magick`/`convert` (or PIL) for offset crops. Always read the frame's real width from the export and compute crop offsets against that, not against the breakpoint you assumed (e.g. a desktop frame may be 1920, not 1440; mobile 375).

### Portaled overlays escape the styled page root — re-apply inherited context
Any portal-based overlay (dialog/modal, popover, dropdown, toast, tooltip) renders through a portal to `document.body`, so it sits **outside** your scoped page-root wrapper (e.g. a `<Container>` / root class that defines design-scoped styles). It therefore loses anything inherited there: the design `font-family` (falls back to the global body font), CSS custom properties, and any scoped utility classes/context. The most prominent symptom: the overlay's heading looks "heavier/bold" vs the design even though its weight class is correct — it's actually rendering the wrong font. Cause: inheritance is broken once the node lives outside the styled subtree. Fix: re-apply the needed font and design classes/vars directly on the overlay's content element (e.g. the portaled content `className`). Same applies to dropdowns/toasts/tooltips.

### tailwind-merge does NOT dedupe custom-token utilities vs arbitrary values
tailwind-merge (default config, with no project theme registered) doesn't know your custom design
tokens belong to a known utility group. So passing an arbitrary override like
`className="max-w-[<w>] px-[clamp(...)]"` to a shared component whose base already uses a token class
(e.g. `max-w-<token> px-<token>`) **silently fails**: merge keeps *both* the token class and the
arbitrary class, and the token one wins by source order — your override appears to "do nothing".
Fix: when you must override a custom-token element, don't override it in place; render a **plain
wrapper element using only standard/arbitrary utilities** (e.g.
`mx-auto w-full max-w-[<w>] px-[clamp(16px,3vw,40px)]`) so there's no token class for merge to
ambiguously collide with. Always verify the result with `getComputedStyle`/`clientWidth` in the
browser, not by eye.

> **The nastier inverse: tailwind-merge DROPS a custom `text-<size>` token when `cn()`'d with a
> `text-<color>`.** A custom font-size token like `text-h1` (from `@theme --text-h1`) is unknown to
> tailwind-merge's default config, so it classifies `text-h1` as a **text-COLOR**; then
> `cn("… text-h1 …", "text-landing-white")` sees two "colors", keeps the last, and **silently deletes
> the font-size** → the heading falls back to the inherited 16px while still looking otherwise styled.
> This bit 5 headings here (every promo/slider that set its colour via `cn(headingClasses, colorVar)`)
> and was invisible in low-res screenshots — only `getComputedStyle(h).fontSize` exposed it. **Fix:
> don't pass a `text-<color>` through `cn()` alongside a custom `text-<size>` token** — build that
> className as a plain template string (`` `landing-h1 text-h1 … ${colorClass}` ``), since a plain
> string isn't run through merge so both the size and the colour survive (the headings that used plain
> strings were all fine). **Verify-loop rule: MEASURE `fontSize` of every heading/body against the node
> per breakpoint — a 16px-vs-56px heading is trivial to miss by eye on a compressed crop.**

### Light pill form field — neutralise the UI-primitive defaults (every one)
Symptom: a styled form primitive (e.g. a shadcn `Input`/`Textarea`) won't match a flat light "pill" from the design — wrong height, dark/translucent fill, visible border, tinted focus ring, off placeholder. Cause: tailwind-merge keeps several baked-in utilities because they live under *different* keys/variants, so a single class doesn't win. Fix: override EVERY surviving default explicitly. Typically you must beat all of: `h-9`→a fluid height like `h-[clamp(44px,1vw_+_40px,50px)]`; `md:text-sm`→your token (a variant must be beaten by its own same-variant class, e.g. `md:text-body`); `dark:bg-input/30`→your solid fill token (e.g. `dark:bg-<surface>`); `border`→`border-0`; plus `focus-visible:ring-0`. Centre placeholders with `text-center placeholder:text-center placeholder:text-black`. Error state = conditionally add `border border-<error>`. A textarea's thin custom scrollbar (a Figma decoration) is real CSS, not an element to draw: `scrollbar-width:thin; scrollbar-color:<thumb> transparent` plus `::-webkit-scrollbar` rules.

### One shared form, internal success-swap; reused in a modal and inline
When the same form appears in multiple places (e.g. a modal and inline on a page) and each context shows a post-submit success state, don't fork the form per context — that drifts the two copies and duplicates the success markup. Make the form own its own `status: idle|submitting|success|error` and render the success view itself (heading + illustration + links + close). The dialog just wraps `<Form onClose=…/>` and supplies the panel chrome (e.g. `bg-<surface> rounded-<card> p-[clamp(24,6vw,60)]`); the inline placement renders the SAME form with no panel and `onClose` omitted (so no close affordance). Vary only the props that actually differ between the two design frames — e.g. a field label or button copy may differ between the modal and the inline version, so pass it as a prop (`nameLabel`, etc.); never hard-code copy that varies by context. A11y for the portaled dialog: it needs a `DialogTitle` (use `sr-only` if the visible heading lives inside the form) + a `Description`, and set `showCloseButton={false}` when the design supplies its own close control.

### Filter→empty-state needs lifted (colocated) state

When one UI state conditionally **replaces** another (a "no results" empty block swapping in for a populated grid/list), both the filter inputs and the rendered result list must read the same source of truth. Symptom: the empty state never appears, shows stale results, or the filter resets on toggle — because the filter control and the list are separate components each owning their own state, so neither sees the other's changes. Cause: split/duplicated state across sibling components. Fix: **lift state up** — make the filter control a controlled, presentational child that emits its value upward (e.g. an `onSearch(filters)` callback), and let a single parent **client component** own the filter state and decide which branch to render (grid ↔ empty). Keep that switching parent a client component since the conditional render depends on interactive state.

> **The empty/error/closed state is usually its OWN designed block — build it from the frame, not a text line.** Designs ship a real "nothing found" / "sold out" / "recruitment closed" composition (illustration on its halo + heading + subtext), not a one-liner. Treat it as a first-class section to reproduce (it's typically reachable in the frame list — look for a sibling artboard named "… ничего не найдено / empty / closed").

### A page's open/closed (available/unavailable) state is a FLAG-DRIVEN variant of ONE page, not a separate route
A design often ships two artboards of the same page — e.g. "recruitment open" vs "…closed", "in stock" vs "sold out". They are the SAME route in two data states, not two pages. Build ONE page that takes a flag (sourced from data in production; preview it with a `?status=…` search-param or prop) and branches the parts that differ — keep every shared section as the same component. The differences are usually: (a) the hero copy + figure, (b) the **action path** is removed when unavailable (drop the search/filter, the item grid, and the primary apply/buy CTA), and (c) an **alternative CTA + block** is swapped in (e.g. a "leave your contacts" button → a contacts modal, and a "join the community" block). Diff the two frames' section lists and ordering — the order can change too, not just presence. Don't fork a second route/page; one component, two branches.

### Blur a modal's backdrop via the overlay, with an `overlayClassName` escape hatch
When a design shows the page **blurred** behind a modal, that's the dialog **overlay**, not the panel. A shadcn/Radix `DialogContent` hardcodes its own `<DialogOverlay>` (e.g. `bg-black/50`, no blur) and gives no way to restyle it — add an optional `overlayClassName` prop that forwards to the overlay, then pass `bg-black/30 backdrop-blur-md` (tune the tint/blur to the frame). Backward-compatible: existing call sites omit it and keep the default. (Portaled dialogs also escape the styled page root — re-apply the page font/context on the panel, per the portaled-overlays note.)

### Fetch BOTH the desktop AND mobile frames — mobile often reorders/repositions, not just reflows
**Principle:** a single component reflowing across all widths is the goal, but a mobile frame frequently makes
*structural* changes the desktop frame can't reveal. **Symptom:** your desktop build looks right but the
mobile layout has wrong element order, a decoration in the wrong place, or an overflowing slider. **Cause:**
you assumed reflow when the design actually re-architects. **Fix:** before building, diff the mobile node
tree against the desktop one — read the mobile frame's `layoutMode` (it often switches HORIZONTAL→VERTICAL)
and its child order. Common structural shifts to look for:

1. **Order flips** — items reorder between breakpoints (e.g. desktop A→B→C, mobile A→C→B). Keep DOM order
   the same and reorder visually with flex utilities (`lg:flex-col-reverse`, or `order-*`).
2. **A decoration changes role** — e.g. an absolute top-right flourish on desktop becomes a big in-flow
   centered illustration on mobile. Render two elements — `hidden lg:block` absolute + `lg:hidden` in-flow —
   rather than fight absolute↔flow responsive switching on one node.
3. **A slider shows a different card count** (e.g. desktop 4-up, mobile 2-up) and the mobile track **bleeds
   past the content gutter** (`-mx-[16px] lg:mx-0`) to widen the cards. Build a smooth count ladder:
   `basis-[calc(50%-8px)] md:basis-[calc(33.333%-12px)] lg:basis-[calc(25%-14px)]`.

### Every section shares ONE content container — never widen a page to match a wider Figma frame
**Principle:** on the real site all pages share a single content column; content edges must line up with the menu/header across every page and breakpoint.

**Symptom:** a page's left/right edges drift away from the logo/nav — the first content element no longer starts where the header content does, and it's visibly off.

**Cause:** different Figma frames are drawn at different canvas widths (e.g. a *detail* frame drawn wider than the *listing* frame), and someone reproduces that by giving one page a custom wider wrapper (e.g. `max-w-[<wide>]`) to match its frame.

**Fix:** route every section on every page — hero, cards, form, steps, empty state — through the SAME shared `<Container>` (one `max-w-*` + horizontal page padding token), the same one the header uses. Do NOT introduce a per-page wider wrapper just because its Figma frame is drawn wider. If content feels cramped inside the shared container, fix it WITHIN the column — smaller pills, a real slider with fewer-but-wider cards, tighter gaps — not by widening the container.

**Verify:** measure `getBoundingClientRect().left` of the header logo vs each section's first content element at a wide AND a narrow breakpoint (e.g. 1440 and 360) — they must match.

### Read the ROOT frame's fills + the full top-level child list BEFORE building (backgrounds are layers)
The page background is frequently NOT the section's own fill — it's separate sibling layers behind the
content: a full-width `Rectangle` with a `GRADIENT_LINEAR` (a dark hero band), plus `VECTOR` nodes
with `GRADIENT_RADIAL` glows (e.g. a tinted glow over the hero, a white→`<wash>` wash behind a lighter
area). The root frame fill is often just a flat colour (e.g. `<pageBg>`) — building to *that* gives a flat,
wrong page. So: dump `root.fills` AND every top-level child's `name/type/fills/layoutMode/bbox`, read
the gradient **stops + handle positions**, and reproduce the glows as CSS (`radial-gradient(... at x%
y%, …)` / layered `background-image`). Missing these = "background looks wrong / not the right tone" feedback.
e.g. hero = `radial(<glow>) , linear(<darkTop>→<darkBottom>)`; light area = `radial(#fff→<wash>)`.

> **One band Rectangle spanning multiple sections = ONE continuous CSS background on a wrapper, NOT a
> per-section bg.** If a single `Rectangle` gradient covers, say, the hero AND the section below it,
> render that gradient ONCE on a wrapper `<div>` around both, and keep each `<section>` transparent.
> The classic seam bug: a shared hero component hardcodes its OWN bg gradient (e.g. `vac-detail-hero-bg`)
> and you wrap it + the next section in a *different* wrapper gradient → a visible horizontal seam where
> the two gradients meet ("один фон меняется другим, а в фигме один и тот же"). Fix: make the shared
> hero's background a **prop** (`bgClass`, default = its own bg) and pass `bgClass=""` when it sits on a
> continuous band, so the wrapper's single gradient shows through both. Verify by measuring: the wrapper
> has the gradient; each section's `getComputedStyle().backgroundImage === 'none'`.

### A "button" near a section boundary may belong to the ADJACENT frame — check its parent node
A section crop often includes an element that visually overlaps it but actually lives in the neighbouring frame — e.g. a submit/CTA pill at the *top* of one section's crop is really the **last child of the preceding form/section frame**, sitting just above the boundary. Symptom: you render the element inside the section it visually overlaps, and a reviewer flags it as a duplicate (the same CTA now appears twice). Cause: you trusted the visual crop instead of the node hierarchy. Fix: before placing any element, confirm its **parent frame** in the node JSON, and recursively search the whole tree for the label — if it returns exactly ONE node, render it ONCE in its true parent and don't re-emit it in the adjacent section. Counting occurrences of a label across the whole tree prevents duplicating a shared CTA.

### Arrow groups flanking a card row mean it's a CAROUSEL — build a real slider, not a static row
A row frame whose children include left/right arrow (chevron) groups as flex siblings on either
side of the cards (`[arrow, card, card, … card, arrow]`) is a slider, not a static row — the arrows
are the tell. Symptom: shipping it as a fixed grid loses the scroll affordance and reads as "just N
blocks." Build it with a real slider (e.g. embla / `embla-carousel-react`): viewport
`overflow-hidden` + flex track, slides `flex-[0_0_…]` (responsive basis, e.g. ~85% mobile → 50% sm →
`calc(25%-gap)` lg), arrows wired to `scrollPrev/Next` and enabled/disabled via
`canScrollPrev/Next` (subscribe to `on('select'|'reInit')`). Keep the arrows **visible at every
width** — even when all slides fit at the largest breakpoint, leave them shown but disabled/greyed if
the design depicts arrows there. Hiding arrows at `lg` and falling back to a static grid removes the
slider affordance.

> **A carousel whose N cards EXACTLY fill the view has ONE snap — arrows (even with `loop`) can't
> advance.** A row of exactly N cards sized to N-up (`basis: calc(100%/N - gap)` → sums to 100%) has a
> single scroll snap, so clicking the arrow does nothing and `loop` has nothing to loop — the "слайдер
> не скролится" symptom. A *tiny* overflow won't help (it rounds to one snap). **There is a real
> tension here and you cannot have both:** matching the frame's N-up card SIZE *and* a scrollable
> desktop are mutually exclusive when there are exactly N cards. Resolve it by PRIORITISING the frame's
> card size, NOT by shrinking the count:
> - **Keep the cards at the frame's N-up size** (`lg:basis-[calc(100%/N - gap)]`). Reducing per-view to
>   force a scroll (e.g. `basis-[30%]` → ~3.3 up) makes the cards visibly **bigger than the frame** —
>   a 1:1 regression a reviewer will catch ("карточки больше, чем в макете").
> - **Build a real slider anyway** (embla, no `loop`): it scrolls on the widths where the cards DON'T
>   all fit (mobile ~2-up overflows → functional), and on the width where all N fit (desktop) wire the
>   arrows to **`canScrollPrev/Next` and grey/disable them** (subscribe to `on('select'|'reInit')`).
>   Arrows present-but-disabled when everything fits is honest and matches a frame that simply *depicts*
>   arrows. Only drop to fewer-per-view if the frame clearly shows a peek/partial card at that width.
> **Verify by behaviour, not by eye:** after an enabled arrow click, assert the leftmost in-view card
> index advanced; read the track's **inline** `style.transform` (`translate3d(...)`), not
> `getComputedStyle().transform`, which can read stale/`none`.

### Adversarial-review caveats
Visual-diff reviewers (human or model) raise predictable false positives on full-page screenshots; verify the cause before "fixing", because the source is usually the capture environment or the reviewer's reading of a crop, not your layout.

1. **Framework dev overlays read as broken UI.** A dev-only badge baked into the page (e.g. the Next.js dev indicator — a dark "N" affordance fixed in a corner) gets mistaken for a stray carousel button or a misplaced control. Symptom: a "phantom control" appears only in dev shots. Cause: it's the framework's overlay, not your markup. Fix: confirm your real control is `display:none` at that width (or that the flagged element is the dev overlay) before changing anything.

2. **Over-read text alignment on compressed crops.** Symptom: a reviewer claims text is mis-aligned on a narrow/zoomed crop. Cause: scaling distorts apparent edges. Fix: settle it by the node's `textAlignHorizontal` plus pixel-span measurement — confirm whether two lines share the same left x — rather than by eyeballing the crop. Mixed alignment within one block (e.g. a heading left-aligned while an adjacent icon row is centred) is often intentional; check the design, don't normalise it.

3. **Don't touch shared, already-approved assets.** Decline changes to assets reused across sections (e.g. an inline SVG's glyph colour shared with another section) unless you re-verify the change in every place it appears — a local "fix" silently regresses the others.

### Radix `useId` drifts across SEPARATE client islands → hydration mismatch drops the islands
**Principle: every `useId`-consuming component (Radix `Select`, `Dialog`, etc.) that shares an SSR render must live in ONE client island, or their ids won't match on the client.** This bites when interactive pieces land in DIFFERENT islands — e.g. a search bar (Radix `Select`s in one client component) and application **dialogs** (Radix `Dialog`s) where the dialogs are passed as an `actions`/`children` prop into a **server** section component, so each becomes its own island. That makes `useId` drift: SSR numbers `useId` across the whole tree in order (Select1, Select2, …, Dialog1), but on the client each island re-numbers from its own root, so the dialog's `aria-controls` id no longer matches SSR. React reports a hydration mismatch AND **silently drops the mismatched islands** — symptom: SSR HTML has the triggers + `radix-…` ids, but the client DOM has **zero** `[data-slot="dialog-trigger"]` and `document.body.innerText` lacks the button labels; a red Next dev error badge appears mid-page (not the "N" indicator). Diagnose by diffing `curl` SSR HTML (`grep 'radix-'`) against `browser_evaluate` over the live DOM.
**Fix: keep every `useId`-consuming Radix component in ONE client island.** Wrap the whole interactive page body in a single `"use client"` component (one shared `<InteractiveView>`) instead of sprinkling client islands as props through server components. One island → one `useId` tree → ids match.

### Gradient border with a TRANSPARENT interior → masked `::before` ring (NOT the padding-box fill)
When a node's Figma fill is **none** and it has only a gradient **stroke**, the interior must stay transparent — whatever sits behind (band, image, page) shows through it, and just the 1px gradient border defines the shape. **Symptom:** reaching for the padding-box/border-box trick (`background: linear-gradient(fill,fill) padding-box, var(--grad) border-box`) breaks this two ways — a transparent `fill` lets the border gradient flood the WHOLE box (the element reads as a solid bright panel), and making the `fill` opaque to fix that **adds a background the design doesn't have**. **Cause:** that trick is for a *filled* panel; it can't produce a ring over a transparent interior. **Fix:** a masked pseudo-element ring — interior fully transparent, and it works with `border-radius` (unlike `border-image`):
```css
.card { position: relative; background: transparent; }
.card::before {
  content:""; position:absolute; inset:0; border-radius:inherit; padding:1px; pointer-events:none;
  background: var(--grad);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;   /* keeps only the 1px ring */
}
```
Put the gradient on `::before` (not the element), or the `mask` clips the element's CONTENT too. Use the opaque-padding-box trick ONLY when the design genuinely wants a filled/glass panel (e.g. a frosted card with a visible fill); for a "fill: none + gradient stroke" node, always the masked ring.

### A render/illustration sitting INSIDE a glow disc → export the whole composited GROUP, not the foreground alone
For any "subject on a glow disc/halo" motif, the cleanest 1:1 is to export the composited group, not to rebuild the glow in CSS. The Figma group is typically a backing `Ellipse` (the halo) + the foreground render, with the render sized to some fraction of the disc (e.g. an ~480px subject inside a ~570px ellipse, ~84%). Symptom: if you export only the foreground and rebuild the halo as a CSS `radial-gradient`, you get the ratio and look wrong — a too-small render floating on a too-prominent guessed circle. Cause: you've discarded the design's exact disc/render proportion and re-guessed it. Fix: export the **whole group** (`/v1/images?ids=<groupId>&format=png&scale=2`) so the render + its exact ellipse come baked together, and render it as ONE full-box `<Image fill object-contain>` — no separate halo div, no `scale-*`. The disc/render ratio is then the design's by construction. Verify by cropping the app vs the exported node side-by-side — they should be pixel-identical.
- This also auto-solves the **per-context halo colour**: the group bakes the correct `Ellipse` fill (e.g. a dark gradient on a dark band, a light gradient on a light band). Only fall back to a CSS halo (made context-aware, dark vs light) when there is no exportable disc node — a dark halo reused on a light background is a dark blob that hides the render.
- Unrelated but same family: a big decorative **glow** placed over a card grid **washes the cards lighter** — keep that glow small / high / low-opacity over the hero only.

### Composited figure-on-halo exports carry the halo's LAYER_BLUR bleed → the figure renders SMALL ("не на всю ширину"); CROP the PNG to fit the container
**This recurs on EVERY figure-on-halo (community cat-bubble, news woman, internship cat/man/envelope) — bank it; it's the most-repeated mobile defect after glows.** A `picture` group exported composited (render + an `Ellipse` halo with `LAYER_BLUR ~100`) bakes the blur's spread into the PNG as a large TRANSPARENT margin: a ~267-logical layout box exports as ~1540px with ~200px of dead padding each side. Rendered `<Image fill object-contain>` in a `w-full` box, the figure then sits at ~50% of its box with empty space around it — the user reads it as "картинка не на всю ширину / не растянута". **A `w-full` box that equals the container does NOT fix it** — the asset's own padding shrinks the figure inside the box.

**Fix depends on the band. On a DARK band, do NOT try to crop/scale the composite — split it.**

- **DARK band → figure-only render + a SEPARATE exported defined-disc halo (the `news.png`/community pattern). This is the only robust dark-band recipe.** The navy halo is a visible disc, so a baked composite has no good crop: end the crop *inside* the disc and its still-opaque edge (~36% alpha at the `-threshold 50%` bbox) **cuts as a hard disc/square wherever the band gradient is lighter than the halo** (desktop, beside the figure — invisible on the darker mobile band, so it slips through one-width checks); crop to the figure and the dense halo becomes a hard square; crop to the full soft extent (`-trim`) so it can't cut, but then the figure is ~57% and scaling the whole composite back up in CSS **pushes the halo onto adjacent text** (when text sits above/beside the figure — shipped all three: "обрезана", "квадратная", "заходит на текст"). Instead, **don't composite**: in Figma the `picture` group is `[Ellipse halo] + [Group figure]` — export the **figure group ALONE** (its node id, not the parent) as the render, and reuse an exported **defined-disc** PNG (`/landing/halo/*`, an Ellipse with GRADIENT + LAYER_BLUR — fades to ~0 well inside its own PNG) as a separate layer behind it. Stack like `community-cta.tsx`: box `relative aspect-square`; halo `<Image fill className="scale-[~1.2] object-contain">` (scale so the disc ≈ box: the disc fills ~78% of its PNG, so ~1.2–1.3× makes it ≈ box while still fading to 0 *within* the box → never spills onto text); figure `<Image fill className="relative scale-[~0.84] object-contain">` (≈ Figma's figure÷disc ratio, so the disc hugs the figure ~1:1). Figure fills, disc is contained, nothing cuts or bleeds — works the same whether text is above (mobile stack) or beside (desktop) the figure.
- **LIGHT band → first ASK whether the disc is actually invisible; usually it is NOT, so use the same split.** A *cyan/blue* disc on a *pale-grey* band is clearly visible — cropping the composite tight to the figure then squares that disc into a hard rectangle ("в квадрате", shipped exactly this). Only when the halo is the same hue as the band (a near-white disc on white) is the tight-crop composite safe. Otherwise treat it like the dark band: **figure-only render + separate exported defined-disc** (here the disc is Ellipse 11 = the cyan `community.png`, already clean & centered, disc ≈ 74% of its PNG → `haloScale ≈ 1.36` to fill the container; figure at its Figma ratio). Note the figure render often already bakes small accents (e.g. a coral squiggle under the man) — export the FIGURE node (`inf_pl_13`/the image rect), not the whole group, and those accents come with it; no separate decoration export needed. Litmus before choosing tight-crop: export the Ellipse, composite it over the band hex, and LOOK — if you can see a disc, you must split.
- **Measure the rendered FIGURE width vs the container** (`getBoundingClientRect`), NOT the box — the box can be full-width while the figure is half. That's the check that catches this. When "не на всю ширину" recurs even though `box.width == container.width`, the gap is the SCALES inside the box. **CRITICAL — what fills the container is the GLOW DISC, not the figure.** Read the Figma `picture` group: the halo Ellipse's width usually = the full content-frame width (node 2883:5409: Ellipse 12 = 269 = the 267 frame), while the figure sits at only **~68%** inside it (the glossy pill measured 736/1076 of the disc) with generous glow around it. So "make it full width / 1:1" = scale the HALO until its disc touches both container edges (`haloScale` so the disc ≈ box; for a disc that's ~76% of its PNG that's ≈1.3), and **leave the figure at its Figma ratio (`figureScale ≈ 0.68`)**. Do NOT enlarge the figure to fill the box — a big pill that fills the width is exactly what fails the 1:1 check ("не получается 1 в 1"); the design is a moderate figure in a big glow, not a figure-fills-frame. The earlier "не на всю ширину" complaints were the DISC not reaching the edges (under-scaled halo, 94%), never the figure being too small.
- **For true 1:1 of the glow gradient, export the actual halo Ellipse node** (e.g. 2883:5410), not a stand-in disc from another page — Ellipse 12 (cat) and Ellipse 13 (news) have different linear-gradient directions. It exports with its LAYER_BLUR bleed (~1876² for a 269 logical disc); the disc is asymmetric, so **crop it CENTERED on the disc's own bbox** (`-alpha extract -threshold 50%` → bbox centre), squared, then `haloScale = PNG ÷ discWidth` makes the disc fill the container.
- **The crop MUST include the FULL fade on EVERY side, or the cut side renders a hard line ("видная граница").** A gradient+blur Ellipse fades ASYMMETRICALLY (the linear gradient makes one side bright, the opposite side dark): the bright side's alpha can still be ~10–15% well past where the dark side has already hit 0. Don't trust one edge — measure ALL FOUR with the correct axis (`-gravity west/east -crop 6xH`, `north/south -crop Wx6`, read `maxima`); they must all be ≈0. Size the square from the **alpha>1% bbox** (`-threshold 1%`), not the 50% bbox, and centre it on the disc so no side clips the fade. (Shipped a left-edge line by cropping symmetrically around the disc when the gradient extended ~140px further left — north measured 0, but west was 28/255.) Bonus: because the gradient darkens the top, the disc's top fades to 0 on its own, so a full-width disc does NOT overlap text above it even in an `aspect-square` box hard against the heading.
- **Verify on the DESKTOP band too, not just mobile** — the cut/overlap that's invisible on the dark mobile band shows up against the lighter desktop gradient (and vice-versa for upward halo bleed onto text). Check both anchor widths.

**Cache gotcha (Next + Turbopack dev):** editing a PNG's *content* at the same path serves STALE — optimized images cache in **`.next/dev/cache/images`** (NOT `.next/cache/images`, which doesn't exist). Clear THAT dir (or rename the asset to a fresh URL) and hard-reload; a same-URL content change does not reliably revalidate in the browser's in-session cache, so renaming is the bullet-proof bust.

### Two desktop rows that look identical can have DIFFERENT mobile structure — confirm per section, per breakpoint
Desktop visual similarity does not imply structural similarity. Symptom: two sections that both render as "four numbered cards, one highlighted, arrows flanking" on desktop are assumed to behave the same on mobile, and you port both as the same primitive (e.g. both as sliders). Cause: arrows or a shared shape in the desktop tree get read as "this is a carousel," when in fact the mobile frame regroups the children differently. Fix: read the **mobile** frame's container per section, not the desktop one.

Two patterns that look alike on desktop but diverge on mobile:
- **Grid-wrap, no arrows on mobile** — the container simply wraps to two columns; arrows are decorative. → `grid-cols-2 lg:grid-cols-4`, arrows `aria-hidden` / `hidden lg:block`.
- **Single-row-with-arrows = real slider** — one group holds the cards plus an arrows group overlaid at the cards' vertical centre. → real embla with `basis-[calc(50%-_<gap>_)] lg:basis-[calc(25%-_<gap>_)]` (note the underscores around `-` inside the arbitrary `calc()`).

So: don't assume "arrows present in the desktop tree ⇒ both are sliders." Inspect each mobile container individually — grid-wrap vs single-row-with-arrows — and pick the primitive from that, per section and per breakpoint.

### A detail/inner page mostly REUSES the listing page's sections — parametrize by theme, don't duplicate
An inner page reached from a listing (a "Подробнее"/"detail" link) is usually built from the same vocabulary as the listing: the same hero shape (title + pills + description), the same numbered-steps row, and literally the same shared blocks (an "info cards" grid, an FAQ accordion, a footer CTA). Build those once as prop-driven components and feed them per page; don't fork a near-identical copy. Two things that recur:
- **The same component appears on a DARK band on one page and a LIGHT band on another** — e.g. a numbered-steps row, or an info-card grid. Give it a `theme: 'light' | 'dark'` prop that flips text colour, border colour, and the **highlight gradient** (the accent card inverts to contrast its band: a light highlight on the dark band, a dark highlight on the light band). One component, both bands.
- **An inline form vs a modal form** are the same form in two shells — see the shared-form/internal-success-swap note above. The detail page renders it inline (no panel); a CTA elsewhere renders it in a dialog.
Wire the listing item's link to the detail route (`/section/[slug]`) and pass a slug; the detail content can be placeholder until real data exists, exactly as the listing cards are placeholders in the frame.

### A card that flips orientation (horizontal desktop ↔ vertical mobile) with a flush, edge-bleeding image
A list/grid card is frequently **landscape on desktop** (text column left, square image flush-right, e.g. 573×296 with a 296² image) and **portrait on mobile** (square-ish image flush-top, text below, e.g. 270×443 with a 270×266 image). It's ONE component, not two. Build it so:
- The card itself is the flex container: `flex flex-col md:flex-row-reverse`. DOM order is **`[image, content]`** — `flex-col` puts the image on top (mobile ✓); `md:flex-row-reverse` paints the image on the **right** while keeping content left (desktop ✓). (Plain `md:flex-row` would put the image left — wrong; reverse fixes it without reordering the DOM.)
- The image **bleeds to the card edges** (Figma: the image ignores the card's content padding). So the image is a **sibling of the padded content column**, not inside it: `overflow-hidden` on the card (to clip the radius), image `aspect-[wm/hm] w-full md:aspect-auto md:w-[<imgW/cardW>%] md:self-stretch object-cover`, content `flex flex-1 flex-col … p-card`. `self-stretch` makes the desktop image fill the card height so a `~51.7%` width reads as a square next to the text.
- Type/radius/padding are per-breakpoint tokens read off **both** frames (e.g. title 16→20, tag 8→10, pad 19→41, radius 19→41 — several of which already exist as `--text-tag`/`--spacing-card`/`--radius-card`). Tags = `flex flex-wrap` of `w-fit` bordered pills, grouped into the design's rows by two flex rows (meta row + topic row), not one big wrap that re-groups unpredictably.

### A featured carousel's arrows must OVERLAY the gutter (absolute), and their vertical anchor differs per breakpoint
When the same card sits in a 2-up/1-up **carousel** (not just a grid), do NOT put the arrows in flow flanking the track — on mobile (1-up) the two in-flow arrows + gaps **eat the track width and shrink the card** (measured 267→183 here; the card must stay full content-width to match the frame). Instead, like the stats/locations sliders: track fills the Container, arrows are `absolute` in the gutter (`left-[calc(-1*clamp(13px,3.5vw,50px))]` / `right-…`, `z-10`), bleeding past the content padding so the cards aren't pushed inward (Figma's slider bleed). **The arrow's vertical anchor changes with the card's orientation:** the card is *vertical on mobile* (image on top) so the arrows belong on the **image centre** (`top-[30%] -translate-y-1/2`), but *horizontal on desktop* (full-height image) so they belong on the **card centre** (`md:top-1/2`). One `top-[30%] … md:top-1/2` handles both. Keep arrows present-but-greyed (`canScrollPrev/Next`) where all cards fit.

### Decoration width must match the FRAME proportion — don't let the clamp cap at the frame-px too early
A render/glow sized `w-[clamp(<mobilePx>, <vw+b>, <desktopFramePx>)]` will hit its **1920-frame** pixel size (e.g. 430px) already at a 1440 viewport, rendering at **~30% of the viewport** when the design is **~22%** (nodeWidth/frameWidth). Symptom: the decoration looks oversized on desktop even though its position is exact. **Measure, don't eyeball:** compare `el.getBoundingClientRect().width / innerWidth` against `node.width / frame.width` at 1440; if the app % is bigger, lower the clamp's slope/cap so the desktop size scales to the frame proportion (here 430→~330px @1440, `clamp(202px, 12.2vw + 156px, 410px)`). Position (centre-x %, top) can be pixel-perfect while the size is 30% off — they're independent checks.

### A glow node that SPANS the hero→cards must be a PAGE-LEVEL layer, not confined to one section
**This is the recurring "снова Vector 7 / Vector 6 не сделал" miss — read it.** A big background glow
(e.g. Vector 7: a `GRADIENT_RADIAL` swoosh + `LAYER_BLUR 200`) is usually the FIRST/bottommost child of
the frame with a bbox that spans the **dark hero AND the light cards** (e.g. desktop `(-31,99,2072×2824)`
behind a dark band that ends at `1129`). In Figma it's covered by the opaque dark hero band and only its
**lower curl shows in the light cards area** — that lower curl IS the page's blue gradient wash. Two ways
people get this wrong and it reads as "no gradient background, page looks flat":
1. **Confining it to the cards `<section>` + `overflow-hidden`** clips the swoosh to that box (and to the
   section width) → it barely shows / is cut awkwardly. Fix: render it **page-level** — `aria-hidden
   absolute inset-0 overflow-hidden` on the page root (the one with the light bg), the glow `<Image>`
   positioned at the **node's own frame bbox** (`left-[-29px≈-31]`, `top-[~99px]`, `w-[~108vw]` desktop;
   `left-[-253]`, `w-[259vw]` mobile — separate per breakpoint). It then spans hero→cards behind
   everything: give the hero section an **opaque** bg so it covers the glow's top (as in Figma), and keep
   the cards/CTA sections **transparent** so the lower curl shows through. DOM-order the glow layer first
   so flow sections paint over it (no z-index needed).
2. **Reproducing it as a CSS `radial-gradient`** — it's a *shaped* swoosh (viewed over gray it's a
   white→pale-blue hook, not a centred disc), so it must be the exported PNG (node-truth gate).
**Verify by measuring** the glow's `getBoundingClientRect()` left/width against the node bbox (here app
left −29 vs node −31, width 1555≈108vw) AND that the hero's `getComputedStyle().backgroundImage` is an
opaque gradient whose `bottom` ≈ the band's frame-y — so the glow is provably covered up top and revealed
below. A glow that's "present in the DOM" but clipped/section-confined still reads as absent.

### Parametrize a shared CTA by `tone` + `bakedHalo` instead of forking it for a light band
The same "join the community" block (figure-on-halo + heading + subtext + socials) appears on a **dark** band on one page (white text, CSS halo) and a **light** band on another (black text — Figma fill `#020202` — and a *light* halo). Don't fork it: add `tone?: 'light'|'dark'` (flips the heading/subtext colour via a **plain template string**, never `cn(text-h1, colour)` which drops the size token) and `bakedHalo?: boolean` (renders a figure export that already includes its halo as one full-box `object-contain`, skipping the CSS `vac-halo` disc + `scale-[0.84]`). Per the "export the composited GROUP" rule, exporting the figure+ellipse group bakes the correct light-vs-dark halo automatically — the cleanest way to get a per-band halo colour.
