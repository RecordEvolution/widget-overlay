# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` - Vite dev server on port 8000, opens `/demo/` and rebuilds in watch mode in parallel.
- `npm run build` - Vite library build (ES module) emitting `dist/widget-overlay.js`.
- `npm run watch` - `vite build --watch` only.
- `npm run release` — `npm version patch`: preflight guards (on `main`, clean tree, not behind `origin/main`, generated files current, build passes), then the bump and a `dist/` rebuild (the `version` hook, so the local build registers the new tag), then commit, bare-semver tag, `git push --follow-tags`, then waits on the CI run and fails if the npm publish fails. `npm run release:minor` / `release:major` for other bumps.
- `npm run link` / `npm run unlink` - Local link/unlink against `../RESWARM/frontend` for in-platform testing.
- No test runner or linter is configured.

Node `>=24.9.0` and npm `>=10.0.2` are required (see `engines`).

## Architecture

This repo produces a single Lit web component published as `@ironflock/widget-overlay`, consumed by the IronFlock/RESWARM platform. It renders a background image (raster, SVG file, inline SVG, data URL, or base64) and overlays positioned data pins on top.

### Versioned custom element tag

The element is registered as `widget-overlay-versionplaceholder` (see `src/widget-overlay.ts` bottom). At build time, `@rollup/plugin-replace` (configured in `vite.config.ts`) substitutes the literal string `versionplaceholder` with `pkg.version`, producing a unique tag per release (e.g. `widget-overlay-1.0.10`). This lets the host platform load multiple versions side-by-side. The demo (`demo/index.html`) reproduces this by reading `package.json` and using `unsafeStatic` to construct the tag.

### Platform contract

The platform interacts with the widget via two Lit `@property` inputs only:

- `inputData: ImageOverlayConfiguration` - shape defined by `src/definition-schema.json` (the source of truth) and mirrored in `src/definition-schema.d.ts`. The JSON Schema is consumed by the IronFlock UI to render the widget configuration form; descriptions in it are written for AI agent readability and platform users alike.
- `theme: { theme_name, theme_object }` - the title colours are `var(--re-text-color, <theme value>)` chains (see `registerTheme()`), so the host property wins and a change to it repaints the tile live without the widget being told. The widget paints no background of its own: Studio's `widget-item` already paints `--re-tile-background-color` on the tile, and painting it again here composited a translucent tile colour twice (up to 1.0.14).

The widget dispatches no events.

### Definition schema is load-bearing

`src/definition-schema.json` drives the UI form on the platform side AND defines the TypeScript types via `json-schema-to-typescript`. `npm run types` regenerates `definition-schema.d.ts`. When changing data shape, edit the JSON Schema first, then regenerate the `.d.ts`. Properties use `order`, `condition` (relative-path conditional fields), and `dataDrivenDisabled` extensions understood by the platform's form renderer.

### Rendering pipeline

1. `transform()` parses `inputData.image` and classifies it: inline `<svg>...</svg>` (rendered via `unsafeSVG`), `data:` URL, bare base64, absolute URL, or relative path.
2. A `ResizeObserver` (observing in `connectedCallback()`, released in `disconnectedCallback()`, because Studio moves a tile by detaching and re-attaching it) plus image `@load` triggers `getModifier()`, which computes the visible image rect inside the container (handling `object-fit: contain` letterboxing for `<img>` and viewBox/width-height for inline SVG). The result is a `Modifier` `{ scaler, xOffset, yOffset, visibleWidth, visibleHeight }`.
3. Each overlay layer is positioned absolutely using the modifier; pins use relative coords (`relXPos`, `relYPos` in 0-1) multiplied by `visibleWidth/Height` so pin positions remain anchored to image content as the widget resizes.
4. `sections.sectionLimits` + `sections.colors` drive threshold-based coloring for both text and progress overlays (`sectionColor()`). Progress percentage is normalized against `min(sectionLimits)`-`max(sectionLimits)`; without two different limits the bar stays empty.
5. Every part of a layer is optional: a layer without `sections` or `textStyle`, null list slots and pins without coordinates render (or are skipped) instead of throwing, which used to blank the tile. Layers are keyed by index and name, because two layers may share a name and duplicate `repeat()` keys corrupt Lit's DOM bookkeeping.

The internal progress element (`src/linear-progress.ts`) is a separate Lit element used only by progress layers; styling is driven via CSS custom properties (`--progress-color`, `--progress-width`, etc.). It is registered as `widget-overlay-progress-versionplaceholder`, versioned like the widget, because two versions of widget-overlay can be on one page and a second `define()` of the same name throws: up to 1.0.14 it was the unversioned `<linear-progress>`, which stopped a second version's bundle from loading.

### Build output

`vite.config.ts` builds a single ES module library entry (`src/widget-overlay.ts` -> `dist/widget-overlay.js`) with sourcemaps and a license banner. The published package (`files` in `package.json`) ships `dist/`, `src/`, and `thumbnail.png` (used by the platform's widget gallery).

## `aiSelection` in `src/definition-schema.json`

The schema root carries an `aiSelection` block next to `title` and `description`. It is **not** JSON Schema and describes no config field — it exists so the IronFlock AI's Widget Builder can pick the right widget for a given shape of data, using knowledge only the widget author has:

```jsonc
"aiSelection": {
  "dataShape": "…what columns this widget consumes and what each one means…",
  "useWhen":   ["…a situation, naming the properties that express it…"],
  "notFor":    ["…a situation this widget is wrong for, naming the widget to use instead…"]
}
```

It is inert everywhere else, and must stay that way: `json2ts` ignores it (the generated `.d.ts` is byte-identical with and without it), the dashboard config editor renders only `schema.properties`, and the AI service's `validate_widget` validates *configs* against the schema, skipping unknown Draft-7 keywords.

When maintaining it:

- `notFor` is the high-value half and the part plain descriptions always omit. Every entry must name the widget that *should* be used, or it rejects without routing.
- Write for an LLM with no other documentation: describe the visible result and the user's intent, not the implementation.
- Prefer entries that discriminate against a *neighbouring* widget. Generic rejections are cheap; the ones that pay are those an author could plausibly get wrong.
- The `notFor` lists are a set across all `widget-*` repos and are meant to be reciprocal — if this widget routes to another for some case, that widget should usually route back for the converse. Changing one side is a cue to check the other.
- Update it whenever a property changes what this widget can *do*, not just how it looks.
