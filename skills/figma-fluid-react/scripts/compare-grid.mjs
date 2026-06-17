#!/usr/bin/env node
// Optional helper: stitch a Figma reference (left) beside an app screenshot (right)
// into a single side-by-side PNG, mirroring the repo's `.compare/<v>-<block>-figma-left-app-right.png`
// convention. This is SECONDARY tooling — the skill's primary verify path is the Playwright MCP
// plus reading both images with the Read tool. This script only runs if `sharp` is installed.
//
// Usage:
//   node scripts/compare-grid.mjs <figma.png> <app.png> <out.png> [--label-left=Figma] [--label-right=App]
//
// Exits 0 on success; prints guidance and exits 3 if `sharp` is unavailable.

import { existsSync } from "node:fs";

let sharp;
try {
  ({ default: sharp } = await import("sharp"));
} catch {
  console.error(
    "[compare-grid] `sharp` is not installed — skipping stitched output.\n" +
      "Primary verify path: capture with the Playwright MCP, then read the app shot and the\n" +
      "`.figma-reference/*` export with the Read tool and compare visually.\n" +
      "To enable this optional helper: npm i -D sharp"
  );
  process.exit(3);
}

const [, , figmaPath, appPath, outPath, ...rest] = process.argv;
if (!figmaPath || !appPath || !outPath) {
  console.error("usage: compare-grid.mjs <figma.png> <app.png> <out.png> [--label-left=..] [--label-right=..]");
  process.exit(2);
}
for (const p of [figmaPath, appPath]) {
  if (!existsSync(p)) {
    console.error(`[compare-grid] input not found: ${p}`);
    process.exit(2);
  }
}

const GAP = 24; // px between panels
const BG = { r: 12, g: 12, b: 12, alpha: 1 };

// Normalize both panels to the same height so they line up, preserving aspect ratio.
const [figMeta, appMeta] = await Promise.all([
  sharp(figmaPath).metadata(),
  sharp(appPath).metadata(),
]);
const targetH = Math.max(figMeta.height ?? 0, appMeta.height ?? 0);

async function panel(path) {
  return sharp(path).resize({ height: targetH, fit: "contain", background: BG }).png().toBuffer();
}
const [figBuf, appBuf] = await Promise.all([panel(figmaPath), panel(appPath)]);
const [figW, appW] = await Promise.all([
  sharp(figBuf).metadata().then((m) => m.width ?? 0),
  sharp(appBuf).metadata().then((m) => m.width ?? 0),
]);

await sharp({
  create: { width: figW + GAP + appW, height: targetH, channels: 4, background: BG },
})
  .composite([
    { input: figBuf, left: 0, top: 0 },
    { input: appBuf, left: figW + GAP, top: 0 },
  ])
  .png()
  .toFile(outPath);

console.log(`[compare-grid] wrote ${outPath} (${figW + GAP + appW}×${targetH})`);
