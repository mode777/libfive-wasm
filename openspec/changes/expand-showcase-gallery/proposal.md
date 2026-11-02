# Proposal

## Why

The gallery demonstrates roughly a third of the package surface: of the ~100
callable methods (83 generated stdlib functions plus the `Shape` opcode
methods, evaluation, inspection and the instance factories), the twelve
current demos touch about 31. Entire families have no demo at all —
`repel`/`attract` (14 methods), `reflect`/`symmetric` (9), `scale` (4),
`taper`/`shear` (3), `shell`/`offset`/`intersection`, the exponent blends,
most primitives (`triangle`, `pyramidZ`, `coneZ`, `halfSpace`, the exact-box
family) and the whole evaluation/inspection surface (`evalF`/`evalR`/`evalD`,
`optimized`, `getConst`, `isVar`, `var`). The coverage test only checks that
each *section* has one demo, so nothing prevents silent regression. At the
same time, the showcase-leaning gap matters: other parametric modellers lead
with recognizable objects and feature ladders (OpenSCAD's gallery and
cheat-sheet examples, JSCAD's numbered demos, CadQuery's 38-example ladder,
build123d's named gallery, libfive Studio's own examples page), and this
gallery covers neither style completely.

## What Changes

- Expand the catalog from twelve to **twenty-five demos**, in two complementary
  registers:
  - **Showcase objects** (7): `lego-brick`, `enclosure`, `pillow-block`,
    `screw-thread`, `clock-face`, `rook`, `displaced-pebble` — the kind of
    pieces OpenSCAD/build123d/CadQuery galleries exhibit, each exercising
    several API families in a real composition.
  - **Feature ladders** (6): `primitives-zoo`, `blend-catalog`, `symmetry-lab`,
    `deformations`, `field-math`, `eval-inspection` — capability-driven demos
    in the CadQuery/JSCAD tradition, each closing a named coverage gap.
- Add the `math` section to the gallery taxonomy and retag the demos whose
  center of gravity is field math (`wavy-slab`, `field-math`).
- Enforce **method-level coverage in CI** (AD-030): every canonical stdlib
  function, `Shape` opcode method, evaluation/inspection method and instance
  factory must appear in at least one demo's source; generated aliases resolve
  to their targets; comments are stripped before matching so only real code
  counts. The target list is derived from `STDLIB_SPECS` plus a literal
  `Shape`-method table so a package-surface change without a demo fails the
  build.
- Update the catalog pin in `tests/showcase-demos.test.ts` (12 → 25) and keep
  the per-demo CI mesh test at the capped resolution.
- Capture thirteen new thumbnails through the existing pipeline
  (`site/scripts/capture-thumbnails.mjs`) and regenerate the manifest — the
  existing drift test already demands this per demo.
- Extend the demo-authoring guide (`site/README.md`) with the new section and
  the coverage rule; update `docs/roadmap.md` (new entry #12).

No change to the package runtime, wasm artifact, ABI, build system, Pages
workflow or npm publish path.

**Decision footprint:** extends AD-028 (showcase site) in the spirit of
AD-017/AD-024 (the generated surface drives coverage); introduces **AD-030**
(method-level demo coverage enforced by source matching). No ADR is superseded.

## Capabilities

### New Capabilities

None — this change expands an existing capability.

### Modified Capabilities

- `showcase-gallery`: the catalog requirement changes (twelve → twenty-five
  demos across the eight gallery sections including the new `math` section),
  and a new requirement makes method-level API coverage a CI-enforced
  property of the catalog (per AD-030). Filtering, inspector, probe, lazy
  loading and thumbnail behavior are unchanged in their contracts; the
  thumbnails spec already generalizes to "every demo" and needs no delta.

## Impact

- **Site:** thirteen new demo modules under `site/src/demos/`, their entries in
  `demos/index.ts` and `demos/sources.ts`, the `math` section in
  `demos/sections.ts`, retagged metadata on `wavy-slab`, and thirteen new
  preview images plus a regenerated `previews/manifest.json`.
- **Tests:** `tests/showcase-demos.test.ts` catalog pin and any new per-demo
  entries; a new `tests/showcase-coverage.test.ts` implementing the AD-030
  invariant (derives the required surface from `src/gen/stdlib.ts` and a
  literal `Shape`-method table, strips comments, matches real call sites).
- **Docs:** `docs/decisions.md` (AD-030), `docs/roadmap.md` (entry #12),
  `site/README.md` (authoring guide), README touch-up if it cites a demo
  count.
- **Dependencies:** none added.
