# Lossless Figma/Design Ingestion + Asset Export + shadcn Mapping

How to take a **Figma URL + a description** and build the page **1:1**, parsing the node tree
deeply, **losing nothing**, exporting vectors as SVG and photos as raster, and turning form
fields into the project's shadcn components — restyled to the design.

---

## 1. Parse the Figma URL

A link looks like:
`https://www.figma.com/design/<FILE_KEY>/<slug>?node-id=<NODE-ID>&m=dev`

- `FILE_KEY` = the segment after `/design/` (e.g. `x5FBwu4vLWdb83Fb85dqnP`).
- `NODE-ID` from the query uses a dash; the REST API wants a colon: `518-399` → `518:399`.
- Collect **every** frame the user gives (e.g. desktop `518-399` + mobile `1390-2242`). They are the
  **same page at two widths** — one component set, not two builds.

The user also gives a **description** ("свёрстай страницу X 1:1") and which page/route it maps to.
Treat the description as scope + intent; treat the frames as the pixel truth.

---

## 2. Get the node tree — pick the best available channel (in order)

**Tier A — Figma Dev Mode MCP** (if a `mcp__figma__*` / dev-mode server is connected):
use it to read the node tree, variables, and generated code. Best fidelity. *(Check
`ToolSearch "figma"` first to see whether a Figma dev-mode server is connected.)*

**Tier B — Figma REST API** (needs a personal access token in `FIGMA_TOKEN`). Deep node JSON +
real SVG/PNG export. This is the canonical "deep nodes, nothing lost, SVG as SVG" path:

```bash
KEY=x5FBwu4vLWdb83Fb85dqnP
IDS=518:399,1390:2242          # comma-separated, dashes converted to colons
# Token lives in the project's gitignored .env (FIGMA_TOKEN=...). Auto-load it if not
# already exported, so the skill always has it without a manual `export`:
[ -z "$FIGMA_TOKEN" ] && [ -f .env ] && { set -a; . ./.env; set +a; }
TOK="$FIGMA_TOKEN"

# 2a. Deep node tree (geometry=paths gives vector path data for SVG reconstruction)
curl -s -H "X-Figma-Token: $TOK" \
  "https://api.figma.com/v1/files/$KEY/nodes?ids=$IDS&geometry=paths" > /tmp/figma-nodes.json

# 2b. Export VECTOR nodes (icons, logos, lines, curves) AS SVG.
#     Returns {"images":{"<id>":"<temporary-s3-url>"}}; download each URL.
curl -s -H "X-Figma-Token: $TOK" \
  "https://api.figma.com/v1/images/$KEY?ids=<vectorIds>&format=svg" > /tmp/svg-urls.json
# then: for each id->url, curl "$url" -o public/<page>/svg/<semantic-name>.svg

# 2c. Export RASTER (photos, complex fills) at 2x.
curl -s -H "X-Figma-Token: $TOK" \
  "https://api.figma.com/v1/images/$KEY?ids=<rasterIds>&format=png&scale=2" > /tmp/png-urls.json
#     (Figma image export has no webp; export png then convert with sharp/cwebp if desired.)

# 2d. Image FILLS referenced by imageRef (background photos inside frames):
curl -s -H "X-Figma-Token: $TOK" "https://api.figma.com/v1/files/$KEY/images"
#     -> {"meta":{"images":{"<imageRef>":"<url>"}}}; download by ref.
```

The token is stored in this project's **gitignored `.env`** as `FIGMA_TOKEN=...` (the snippet above
auto-loads it). Never write the token into tracked files or echo its value. If it is missing/empty,
tell the user: *"Add a Figma personal access token to `.env` as `FIGMA_TOKEN=...`
(Figma -> Settings -> Security -> Personal access tokens) so I can pull nodes and export assets,
or connect the Figma Dev Mode MCP."* Then fall back to Tier C/D.

**Tier C — Pencil MCP** (if the design is mirrored in a `.pen` file — e.g. the reference project
references `pencil-new.pen`, frames desktop `dQIp8` / mobile `ZscgU`). Deep traversal + raster export work;
SVG must be reconstructed from path geometry:
- `mcp__pencil__batch_get` with `readDepth`/`searchDepth` and `includePathGeometry:true` —
  recursively read the tree; follow `"..."` children with more reads until every leaf is seen.
- `mcp__pencil__export_nodes` (png/webp/jpeg — **no svg**) for photos/raster fills -> `public/`.
- For vectors: take the `path` node's geometry/`d` and emit an inline `<svg>` or a `.svg` file
  (see how `decorative-bg.tsx` already inlines `<path d="...">` reconstructed this way).
- `mcp__pencil__get_screenshot` per node = visual ground truth for the verify loop.

**Tier D — exported reference images only** (`.figma-reference/about-{desktop,mobile}.png`).
No node data — visual truth for eyeballing + the verify loop. Last resort; reconstruct structure
from the description + careful reading of the images.

---

## 3. Deep traversal — "lose nothing" protocol

1. **Walk the whole subtree** of each frame, depth-first, until every leaf is read (don't stop at
   `"..."` — issue follow-up reads). Large trees: read top-level -> descend into each child by id.
2. **Build a node ledger** as you go — one row per meaningful node: `id - name - type - role`,
   where role is one of {layout-frame, text, vector/icon, image/photo, component-instance,
   input/control, decorative}.
3. **Account for every leaf.** At the end, each node must be either: rendered as content,
   exported as an asset and referenced, or **explicitly** marked decorative/skipped (with a
   reason). Reconcile counts: *nodes catalogued == elements built + assets exported + decorative*.
   If something is unaccounted for, you lost it — go back.
4. Capture per node what flow needs: auto-layout direction, align, distribution, sizing
   (hug/fill/fixed), constraints, padding/gap, text style, fills, radius, effects. (See
   `figma-intent-cheatsheet.md`.) Record **intent**, not x/y/w/h.

---

## 4. Asset extraction rules

| Kind | Rule | Destination |
|---|---|---|
| Icon / logo / glyph (vector) | export **SVG**; inline `<svg>` if small and needs CSS color/state control, else `.svg` file via `<Image>` | `public/<page>/icons/` |
| Decorative line/curve/ribbon (vector, crosses blocks) | **SVG**, placed in the **decorative layer** (`aria-hidden pointer-events-none`); inline `<path>` if it needs a CSS gradient/blur | `public/<page>/decorative/` |
| Photo / complex raster fill | export **PNG@2x -> convert to WebP/AVIF** if possible; render with `next/image` (`fill` + `aspect-*`, real `sizes`) | `public/<page>/photos/` |
| Map / semantic vector (interactive) | **SVG**, kept as a real SVG element so parts can be `<Link>`/`<g>` targets | `public/<page>/map/` |

Naming: semantic kebab-case (`logo.svg`, `icon-search.svg`, `line-hero-desktop.svg`,
`section-level.webp`), with `-desktop`/`-mobile` suffixes only when the two frames genuinely need
different assets. Never name by node id in the final repo. Always `alt=""` + `aria-hidden` for
decorative; meaningful `alt` for content images. **Never** screenshot a vector and ship it as PNG
when an SVG export exists.

---

## 5. Form fields → UI primitives (`{{UI_PRIMITIVES_DIR}}`)

When a node is an input/control, **do not** hand-roll an `<input>` — reuse the project's existing
primitive component and **restyle it to the design** (className + tokens; override the stock look).
**The table below is the reference project's shadcn map (`src/components/ui/*`) shown as an
example — derive yours with `ls {{UI_PRIMITIVES_DIR}}`** and adjust the import alias accordingly:

| Figma element | Component | Import |
|---|---|---|
| Single-line text field | `Input` | `@/components/ui/input` |
| Password field | `PasswordInput` | `@/components/ui/password-input` |
| Multi-line / textarea | `Textarea` | `@/components/ui/textarea` |
| Dropdown / picker | `Select` (or `RelationSelect` for entity pickers) | `@/components/ui/select` |
| Checkbox | `Checkbox` | `@/components/ui/checkbox` |
| Toggle / on-off | `Switch` (or `LabeledSwitch`) | `@/components/ui/switch` |
| Segmented / toggle group | `ToggleGroup` / `Toggle` | `@/components/ui/toggle-group` |
| Field label | `Label` | `@/components/ui/label` |
| Search box | `Input` + `lucide-react` icon | — |
| File / image upload | `MediaUpload` | `@/components/ui/media-upload` |
| Rich text | `RichTextEditor` | `@/components/ui/rich-text-editor` |
| Tabs | `Tabs` | `@/components/ui/tabs` |
| Modal / drawer | `Dialog` / `Sheet` | `@/components/ui/dialog` |
| Email list | `EmailListInput` | `@/components/ui/email-list-input` |
| Tooltip / popover | `Tooltip` / `Popover` | `@/components/ui/tooltip` |
| Notifications | `toast` (sonner) | `@/components/ui/sonner` |

Restyle to match the Figma: pass `className` with the design's radius/height/padding/colors
(prefer the project tokens), and use form plumbing already present (`react-hook-form` patterns in
the admin forms, `zod` for validation). Match the design's field height, radius, border, focus
ring, placeholder color, and label/spacing — the stock shadcn look is the starting point, not the
finish. Keep accessibility (label association, focus-visible) intact while restyling.

---

## 5b. Decorative layer — place from EXACT Figma node coordinates (don't hand-rebuild)

The single biggest fidelity trap: hand-reconstructing decorative art (rotating/cropping exported
strips, eyeballing positions) **diverges from Figma** and can never be made 1:1 by nudging. When
a content element must sit ON a decorative element (a bug on a streak, a badge on a line), the
only reliable way is to take BOTH from Figma's exact node data:

1. **Get each decorative node's frame-relative bbox** from the REST API:
   `absoluteBoundingBox` of the node minus the frame's `absoluteBoundingBox` origin → `(x, y, w, h)`
   in frame coordinates. (See the `walk()`-style traversal — subtract frame x/y.)
2. **Export the node as-is**: image fills / raster decals → PNG@2x of the node (Figma bakes the
   fill transform, so the export already looks exactly as in the frame — render it
   **non-rotated** at the bbox with `object-cover`); vectors → SVG. Do **not** re-rotate or crop.
3. **Place at the bbox in the decorative layer**, whose origin = the page top = the Figma frame
   origin (`absolute inset-0` on the page wrapper, no header offset):
   - **Mobile / left-anchored nodes:** fixed px — `left-[Xpx] top-[Ypx] w-[Wpx] h-[Hpx]`.
   - **Desktop / center-anchored nodes:** `left-[calc(50%-(frameCenter - X)px)] top-[Ypx]` so the
     element tracks the centered composition as the viewport widens. (frameCenter = frameWidth/2.)
4. **An element that rides ON a decorative node** (e.g. the hero bug on the tube) uses that node's
   EXACT Figma coords in the SAME layer/coordinate system. Then it lands on the art 1:1 and stays
   put at every width — no measuring screenshots, no guessing.
5. **Verify** the placement by reading the node bbox back via `getBoundingClientRect()` in the
   browser — it should equal the Figma frame-relative bbox exactly.

Worked example (reference project, hero — illustrative): Figma `inf-abstr` tube node = `(-360,-124, 715×694)` →
`left-[-360px] top-[-124px] w-[715px] h-[694px]` (mobile) and `(-506,-229,1525×1480)` →
`left-[calc(50%-1466px)] top-[-229px] w-[1525px] h-[1480px]` (desktop, frameCenter 960). The hero
bug node `(58,256)` mobile / `(399,554)`→`calc(50%-561px)` desktop sits on the tube 1:1.

## 6. Build order for a full 1:1 page

0. Parse URL(s) + description -> file key, node ids, route, mode (full-page 1:1).
1. Ingest deeply (Tier A/B/C/D) -> node ledger; export all assets (§4); flag inputs (§5).
2. Establish/extend tokens from the design (`@theme` clamp scales, colors, radii).
3. Build the decorative layer (all cross-block vectors, `aria-hidden`).
4. Build content sections top-to-bottom with flow primitives (the 10 rules); inputs via shadcn.
5. Compose the page/route; wire links/routes from the description.
6. **Lose-nothing reconcile** (§3.3) + rule-lint.
7. Verify loop at 360/600/768/900/1024/1440 vs the frames; iterate to 1:1.
