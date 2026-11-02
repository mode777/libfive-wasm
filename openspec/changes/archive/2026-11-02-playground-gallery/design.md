# Design

## Context

`playground-demo` established the site, the worker protocol, the three.js
viewport, the read-only Code tab and a four-demo catalog (AD-028). The package
surface is much larger than four demos, and the foundation deliberately kept
the catalog small. This change expands the catalog and adds the inspector and
filtering needed to make coverage legible without changing the deployment or
package boundary.

## Goals / Non-Goals

**Goals:**

- Twelve demos covering every stdlib section plus arrays, 2D/revolve, `remap`,
  evaluation, shelling/clearance and `raw`.
- Section metadata, a gallery filter and a CI-checked coverage manifest.
- Inspector toggles (wireframe, flat shading), the Scheme form and an evaluation
  probe.
- A gallery route that does not download the renderer or highlighter until a
  demo is opened.

**Non-Goals:**

- Live editing, arbitrary user code, Monaco or permalinks (the deferred
  `playground-editor`).
- Changing the Pages workflow, package artifact or wasm build.
- Adding a backend, analytics or persistence.
- A visual thumbnail-generation pipeline; cards remain typographic.

## Decisions

### D1 — Section metadata is part of the demo contract

`DemoMeta` gains `sections: readonly Section[]` where `Section` is the closed
set `csg | shapes | transforms | text | arrays | eval | raw`. Demo modules
declare sections alongside their feature strings; the gallery and the coverage
test consume the same metadata. The closed set lives in
`site/src/demos/sections.ts`, so a typo fails typechecking and a missing section
fails the coverage test.

### D2 — Coverage is a manifest plus a test

`site/src/demos/coverage.ts` exports the ordered section list and a
`coverageBySection()` helper returning the demo ids for each section. The root
showcase test asserts that every section has at least one demo and that every
declared section is in the manifest. This is checked in and reviewable; no
runtime introspection of the kernel is involved.

### D3 — Filtering is local gallery state

The gallery renders section filter buttons from the manifest. Clicking a
section toggles it and hides non-matching cards; clearing restores the full
grid. Filters are deliberately not encoded in the URL in this change: the
catalog is small and the demo routes are the stable links. An empty result
renders a short empty-state message.

### D4 — Inspector reads from the existing worker session

`MeshSession` already keeps the current `Shape` and `Mesh` alive. It gains
`probe(point)` returning `{ value, gradient }` from `shape.evalF()` and
`shape.evalD()`, and the worker protocol gains a `probe` request/response. The
demo page sends the region center and renders the values in a small inspector
panel. The expression needed by the Scheme form is already returned as
`DemoMesh.expression`; no new kernel call is required for it.

The viewport gains `setWireframe(boolean)` and `setFlatShading(boolean)` methods
that mutate the current material (no geometry rebuild). Both default off and
reset when a new mesh is installed.

### D5 — Demo route is lazy-loaded

`app.ts` dynamically imports `demo-page.ts` when a demo route is selected. The
demo-page module owns the three.js viewport and the highlighter, so the gallery
chunk no longer includes them. A simple loading placeholder covers the dynamic
import. A route token discards a demo page that resolves after the visitor has
navigated back to the gallery.

Vite's code splitting produces a separate demo chunk; the Pages build remains
unchanged. The gallery cards, catalog metadata and router stay in the initial
chunk.

### D6 — Demo slate

Existing: `blended-blob` (csg/shapes/transforms), `gyroid-surface`
(shapes/csg), `twisted-column` (shapes/transforms), `text-badge`
(shapes/text).

Added:

| Demo | Shows | Sections |
|---|---|---|
| `smooth-morph` | `morph`, `blendExpt`, sphere/box | csg, shapes |
| `lattice-cube` | `arrayXYZ`, `difference`, `roundedBox` | shapes, arrays |
| `loft-tower` | `loftBetween`, `polygon`, `arrayPolarZ` | shapes, transforms, arrays |
| `revolved-vase` | `revolveY`, 2D `rectangle`/`circle`, `difference` | shapes, transforms |
| `wavy-slab` | `remap`, `sin`, coordinate arithmetic | shapes, eval |
| `hollow-frame` | `shell`, `clearance`, `blendDifference` | csg, shapes |
| `polar-gear` | `ring`, `polygon`, `extrudeZ`, `arrayPolarZ` | shapes, arrays, transforms |
| `raw-escape` | `libfive.raw`, `Shape.fromTree` | raw, shapes |

Twelve total. The raw demo is explicitly an advanced example; it still returns
a `Shape` from `build`, so the worker, code view and validation flow are
unchanged.

### D7 — Authoring guide

`site/README.md` documents the demo module contract, the section set, the rule
that the Code tab reads the same module via `?raw`, the no-DOM/three constraint
for Node validation, and the commands (`npm run check`, `npm run lint`,
`npm run build`, root `npm test`). The root README points to it.

### D8 — Documentation and scope

This change extends AD-028; it does not add or alter an ADR. It updates the
roadmap status for `playground-gallery` and adds the site authoring guide.
`docs/architecture.md` already lists `site/`; no structural change is needed.

## Risks / Trade-offs

- **Demo authoring is the bulk of the work** → add demos in small groups and run
  the catalog test after each; keep resolutions modest.
- **Probe lifetime** → the probe uses the existing current `Shape`; if no mesh
  has run, it returns a named error instead of leaking.
- **Lazy chunk regressions** → verify the gallery network requests do not
  include the renderer/highlighter chunk; keep the dynamic import in `app.ts`
  as the only entry to the demo page.
- **Filter accessibility** → use real buttons with `aria-pressed`, visible
  focus, and an empty-state message.
- **Coverage gaming** → the coverage test checks the declared manifest, so a
  demo must both declare a section and mesh successfully; it cannot satisfy
  coverage by tagging without a working builder.

## Migration Plan

No migration. The existing four demo ids and routes stay stable; the gallery
gains sections and filters, and the demo page gains optional inspector
controls. Rollback is reverting the change; the Pages workflow and package are
untouched.
