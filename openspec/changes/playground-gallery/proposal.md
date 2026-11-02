# Proposal

## Why

The first showcase change proved the deployment, worker and renderer with a
small four-demo gallery. It does not yet demonstrate the breadth of the
package: arrays, 2D/revolve profiles, `remap`, evaluation, shelling, clearance,
lofting and the raw escape hatch are missing, and the gallery has no way to
show or filter coverage. This change turns the walking skeleton into the
feature-coverage showcase the project set out to publish.

## What Changes

- Expand the catalog from four to twelve demos covering every stdlib section
  (`csg`, `shapes`, `transforms`, `text`), plus arrays, 2D/revolve, `remap`,
  evaluation, shelling/clearance and `libfive.raw`/`Shape.fromTree`.
- Add section metadata to every demo, a feature/section filter on the gallery,
  and a coverage manifest that maps each stdlib section to at least one demo.
- Extend the inspector: wireframe and flat-shading toggles, the
  `shape.toString()` Scheme form, and an evaluation probe using `evalF` and
  `evalD` at the region center. Keep the existing mesh stats and STL download.
- Lazy-load the demo route (three.js and the code highlighter) so the gallery
  loads without the viewport bundle, and keep demo modules free of DOM/three
  imports so the Node validation suite can import them.
- Add a demo-authoring guide under `site/` and a CI assertion that every
  declared stdlib section is represented and every demo meshes.
- Update the roadmap status and the showcase docs; no new ADR is introduced
  (this extends AD-028).

This change does not alter the package API, wasm artifact, build system, Pages
workflow or npm publish path.

## Capabilities

### New Capabilities

- `showcase-gallery`: catalog coverage, section metadata and filtering,
  inspector affordances, lazy loading and coverage validation for the public
  demo gallery.

### Modified Capabilities

<!-- `showcase-site` requirements are unchanged; this change adds gallery
     behavior on top of the deployed foundation. -->

## Impact

- **Site:** new demo modules, section metadata, gallery filter, inspector
  controls, worker probe/expression messages, lazy demo route, styles.
- **Tests:** extends `tests/showcase-demos.test.ts` with section coverage and
  session/inspector assertions.
- **Docs:** `docs/roadmap.md` status and a `site/README.md` authoring guide.
- **Dependencies:** none added; reuses the existing three.js, highlighter and
  Vite setup.
