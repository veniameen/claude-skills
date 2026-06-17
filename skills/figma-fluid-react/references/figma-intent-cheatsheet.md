# Figma → CSS / Tailwind Intent Cheatsheet

How to translate what you see in Figma's right-hand panel into flow-based CSS. Read the
**property**, not the coordinates.

## Auto-layout → flex

| Figma | CSS / Tailwind |
|---|---|
| Auto-layout, vertical | `flex flex-col` |
| Auto-layout, horizontal | `flex flex-row` |
| Auto-layout, wrap on | `flex flex-wrap` |
| Gap between items | `gap-<token>` (never `space-y`/sibling margins) |
| Padding | `p-*` / `px-*` / `py-*` from the spacing scale |

## Alignment & distribution

| Figma alignment | CSS / Tailwind |
|---|---|
| Align top / left | `items-start` / `justify-start` |
| Align center | `items-center` / `justify-center` |
| Align bottom / right | `items-end` / `justify-end` |
| Baseline | `items-baseline` |
| "Space between" distribution | `justify-between` (drop the gap) |
| "Packed" + gap | `gap-*` + a `justify-*` |

## Sizing mode (the most-misread panel)

| Figma resizing | CSS / Tailwind | Notes |
|---|---|---|
| **Hug contents** | `w-fit` / `h-fit` (or intrinsic) | element is as big as its content |
| **Fill container** | `flex-1` (in a flex parent) / `w-full` | element grows to share the row |
| **Fixed** | `w-[..]` / `h-[..]` | use ONLY for truly fixed UI: icon, avatar, logo, control |

A "Fixed 570" column on a desktop frame is almost always really **Fill** ("half the row"). A
"Fixed 267" text block is really **Fill** of the mobile content width. Convert before coding.

## Constraints (how a child responds when the frame resizes)

| Figma constraint | Intent | CSS / Tailwind |
|---|---|---|
| Left | pinned to left | default flow / `mr-auto` |
| Right | pinned to right | `ml-auto` |
| Left & Right | stretches with parent | `w-full` / `flex-1` |
| Center | stays centered | `mx-auto` |
| Scale | grows proportionally | fluid unit (`%`, `clamp()`, `aspect-*`) |
| Top / Bottom / Top & Bottom | vertical equivalents | flow / `my-auto` / `h-full` |

## Layout dimensionality

| Figma | CSS / Tailwind |
|---|---|
| One row/column of items | `flex` + `gap` |
| Real 2-D (text ↔ image, equal columns) | `grid grid-cols-2` or `grid-cols-[minmax(0,1fr)_minmax(0,1fr)]` |
| Responsive card grid | `grid grid-cols-[repeat(auto-fit,minmax(<min>,1fr))]` |
| Wrapping tags / pills | `flex flex-wrap gap-*`, items `w-fit` |
| Stack→side-by-side at a breakpoint | base `flex-col` → `lg:grid lg:grid-cols-2` |

## Type

| Figma text | CSS / Tailwind |
|---|---|
| Font size (varies mobile↔desktop) | fluid token: `text-h1` / `text-body` (`clamp()`), not `text-[..px] lg:text-[..px]` |
| Line height | `--text-*--line-height` modifier on the token |
| Letter spacing (e.g. −1.1%) | `--text-*--letter-spacing: -0.011em` modifier |
| Font weight | a weight class (`font-light`, …) — `text-*` tokens don't set weight |

## Fills, radius, effects

| Figma | CSS / Tailwind |
|---|---|
| Solid fill | existing color token (`bg-landing-*`, `text-landing-*`) |
| Linear gradient | a gradient utility class / token (`--landing-gradient-*`) |
| Corner radius | radius token (`--landing-radius-*`) |
| Image fill | `next/image` `fill` inside a `relative` + `aspect-*` box; set `sizes` to real rendered width |
| Drop shadow / blur | `shadow-*` / `blur-*` (keep decorative blurs in the decorative layer) |

## Absolute frames in Figma

A node placed with absolute X/Y in Figma is a **decision point**, not an instruction to write
`left/top`:

- Decorative streak/curve/glow crossing blocks → the **decorative layer** (`aria-hidden
  pointer-events-none absolute inset-0`).
- Badge/pictogram on a specific element → `absolute` **inside that element's `relative` box**,
  positioned with `%`/`inset`.
- Anything else (text, card, button) → it is not absolute. Put it in flow.
