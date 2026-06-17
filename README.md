# claude-skills

Reusable [Claude Code](https://claude.com/claude-code) skills & slash commands, factored to drop
into any project. Each skill carries its own references and a `PROJECT-PROFILE.md` adapter so reuse
is a one-file edit, not a rewrite.

## Contents

| Skill / command | Type | What it does | Invoke |
|---|---|---|---|
| [`figma-fluid-react`](skills/figma-fluid-react/) | skill (auto) | Build a Figma frame into **fluid, responsive** React + Tailwind v4 — reads design *intent* (auto-layout/constraints/sizing), not x/y/w/h; enforces a no-fixed-height / no-fixed-width / flow-primitive rule set; tokenizes via `@theme` `clamp()`; runs a Playwright verify loop. Also refactors fixed/absolute layouts to fluid. | auto-triggers on Figma/build/port requests |
| [`figma-1to1`](commands/figma-1to1.md) | command | Drive an **already-built route** to pixel-1:1 with its Figma frame — adversarial per-section diff + auto-fix loop (fresh-context audit, not a builder). | `/figma-1to1 <node-id> <route>` |

**Division of labour:** `figma-fluid-react` **builds** (greenfield / component / refactor) and
self-checks enough to hand off; `/figma-1to1` is the fresh-context **converge-to-1:1** pass you
fire on demand against a route (and re-fire as a regression check after edits). One source of
truth (the skill's references), two entrypoints.

## The transferable IP

The rules ("read intent, not coordinates") are senior-frontend practice — useful but commoditizable.
The defensible value is the **failure-banked gotcha library** in
[`references/adaptive-layout-rules.md`](skills/figma-fluid-react/references/adaptive-layout-rules.md):
the node-truth export+view gate (a `GRADIENT_LINEAR` ellipse + `LAYER_BLUR` is a *defined disc*, not
a CSS radial), tailwind-merge silently dropping a custom `text-size` token, Radix `useId` island
drift, the Embla "N cards exactly fill = one snap, can't scroll" geometry, the composited-halo
`LAYER_BLUR`-bleed crop recipe, and more. Each is tied to a real recurring symptom.

## Install into a project

Copy or symlink into the target project's `.claude/` (or your user-level `~/.claude/`):

```bash
# from the target project root
ln -s /path/to/claude-skills/skills/figma-fluid-react .claude/skills/figma-fluid-react
ln -s /path/to/claude-skills/commands/figma-1to1.md   .claude/commands/figma-1to1.md
```

Then **fill [`PROJECT-PROFILE.md`](skills/figma-fluid-react/PROJECT-PROFILE.md)** once for that
project (component dirs, token names, dev command, viewports, UI-primitive map). The skill's steps
show the reference project's values as examples — your profile overrides them.

## Layout

```
skills/<name>/
  SKILL.md            # the skill (frontmatter: name, description, allowed-tools)
  PROJECT-PROFILE.md  # per-project adapter — fill once
  references/         # the rules + extraction recipe + cheatsheet (source of truth)
  scripts/            # optional helpers
commands/<name>.md    # slash command (frontmatter: description, argument-hint, allowed-tools)
```

Mirrors Claude Code's own `.claude/` layout so install = copy/symlink.
