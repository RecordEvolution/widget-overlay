# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` - Vite dev server on port 8000, opens `/demo/` and rebuilds in watch mode in parallel.
- `npm run build` - Vite library build (ES module) emitting `dist/widget-overlay.js`.
- `npm run watch` - `vite build --watch` only.
- `npm run analyze` - Generate Custom Elements Manifest (`cem analyze --litelement`).
- `npm run release` - Builds, bumps patch version (no `v` prefix), pushes commits + tags. The pushed tag triggers `.github/workflows/build-publish.yml` which publishes to npm.
- `npm run link` / `npm run unlink` - Local link/unlink against `../RESWARM/frontend` for in-platform testing.
- No test runner or linter is configured.

Node `>=24.9.0` and npm `>=10.0.2` are required (see `engines`).

## Architecture

This repo produces a single Lit web component published as `@record-evolution/widget-overlay`, consumed by the IronFlock/RESWARM platform. It renders a background image (raster, SVG file, inline SVG, data URL, or base64) and overlays positioned data pins on top.

### Versioned custom element tag

The element is registered as `widget-overlay-versionplaceholder` (see `src/widget-overlay.ts` bottom). At build time, `@rollup/plugin-replace` (configured in `vite.config.ts`) substitutes the literal string `versionplaceholder` with `pkg.version`, producing a unique tag per release (e.g. `widget-overlay-1.0.10`). This lets the host platform load multiple versions side-by-side. The demo (`demo/index.html`) reproduces this by reading `package.json` and using `unsafeStatic` to construct the tag.

### Platform contract

The platform interacts with the widget via two Lit `@property` inputs only:

- `inputData: InputData` - shape defined by `src/definition-schema.json` (the source of truth) and mirrored in `src/definition-schema.d.ts`. The JSON Schema is consumed by the IronFlock UI to render the widget configuration form; descriptions in it are written for AI agent readability and platform users alike.
- `theme: { theme_name, theme_object }` - merged with CSS custom properties `--re-text-color` and `--re-tile-background-color` from the host (CSS vars take precedence). See `registerTheme()`.

The widget also dispatches a `overlay-file-selected` CustomEvent (bubbles, composed) when a file input changes.

### Definition schema is load-bearing

`src/definition-schema.json` drives the UI form on the platform side AND defines the TypeScript types via `json-schema-to-typescript`. The `types` script (currently prefixed `xxxcat` to disable accidental runs) regenerates `definition-schema.d.ts`. When changing data shape, edit the JSON Schema first, then regenerate the `.d.ts`. Properties use `order`, `condition` (relative-path conditional fields), and `dataDrivenDisabled` extensions understood by the platform's form renderer.

### Rendering pipeline

1. `transform()` parses `inputData.image` and classifies it: inline `<svg>...</svg>` (rendered via `unsafeSVG`), `data:` URL, bare base64, absolute URL, or relative path.
2. A `ResizeObserver` plus image `@load` triggers `getModifier()`, which computes the visible image rect inside the container (handling `object-fit: contain` letterboxing for `<img>` and viewBox/width-height for inline SVG). The result is a `Modifier` `{ scaler, xOffset, yOffset, visibleWidth, visibleHeight }`.
3. Each overlay layer is positioned absolutely using the modifier; pins use relative coords (`relXPos`, `relYPos` in 0-1) multiplied by `visibleWidth/Height` so pin positions remain anchored to image content as the widget resizes.
4. `sections.sectionLimits` + `sections.colors` drive threshold-based coloring for both text and progress overlays. Progress percentage is normalized against `min(sectionLimits)`-`max(sectionLimits)`.

The internal `<linear-progress>` element (`src/linear-progress.ts`) is a separate Lit element used only by progress layers; styling is driven via CSS custom properties (`--progress-color`, `--progress-width`, etc.).

### Build output

`vite.config.ts` builds a single ES module library entry (`src/widget-overlay.ts` -> `dist/widget-overlay.js`) with sourcemaps and a license banner. The published package (`files` in `package.json`) ships `dist/`, `src/`, and `thumbnail.png` (used by the platform's widget gallery).
