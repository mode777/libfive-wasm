# Tasks

## 1. Sections and catalog plumbing

- [x] 1.1 Add `math` to `SECTIONS`/`SECTION_LABELS` in `site/src/demos/sections.ts` and retag `wavy-slab` with `math`; verify `npm run check` typechecks and the gallery renders the new filter button (`npm run build` in `site/` or the vitest smoke).

## 2. Showcase demos

- [x] 2.1 Prototype the `screw-thread` helix (spiral via `atan2` + `mod` on a `cylinderZ` blank) in a scratch vitest at CI resolution; confirm a non-empty mesh and sub-second mesh time before freezing its pitch/depth parameters (design D4).
- [x] 2.2 Add `lego-brick` and `enclosure` demo modules with `demos/index.ts` and `demos/sources.ts` entries; bump the catalog pin in `tests/showcase-demos.test.ts` to the new count; verify each appears in the catalog and meshes non-empty via `npm test`.
- [ ] 2.3 Add `pillow-block`, `clock-face` and `rook` demo modules; bump the pin; verify each meshes non-empty and the CI-resolution pass stays fast.
- [x] 2.4 Add `screw-thread` (frozen parameters from 2.1) and `displaced-pebble` (full `repel`/`attract` family as labeled patches plus the pebble) modules; bump the pin; verify each meshes non-empty.

## 3. Feature-ladder demos

- [x] 3.1 Add `primitives-zoo` (remaining primitives incl. `halfSpace`/`emptiness` inside bounded composition) and `blend-catalog` (`intersection`, `offset`, `shell`, `blendExpt`, `blendRough`, `loft`) modules; bump the pin; verify each meshes non-empty.
- [x] 3.2 Add `symmetry-lab` (`reflect*`, `symmetric*`, `inverse`, `neg`, `abs`) and `deformations` (`taper*`, `shearXY`, `scale*`, `twirlX/Y`, `twirlAxis*`) modules; bump the pin; verify each meshes non-empty.
- [x] 3.3 Add `field-math` (superellipse via `pow`, repetition via `mod`, thresholds via `compare`, spirals via `atan2`, waveform terms via `tan`/`asin`/`acos`/`atan`/`exp`/`log`, `min`/`max` as raw CSG) module; bump the pin; verify it meshes non-empty and its sections include `math`.
- [x] 3.4 Add `eval-inspection` module: use `evalF`/`evalD` at build time to place geometry, `evalR` to size it, and exercise `optimized`, `getConst`, `isVar`, `var`, `constant`, `toString` in real code; bump the pin to 25; verify the full demo suite passes at CI resolution.

## 4. Method-level coverage invariant (AD-030)

- [x] 4.1 Create `tests/showcase-coverage.test.ts`: derive the required surface from `STDLIB_SPECS` and the generated alias table in `src/gen/stdlib.ts` plus the literal `Shape`-method/factory table, strip comments and string literals, match call sites with word-boundary patterns, and assert full coverage across `site/src/demos/*.ts`; verify it passes against the finished catalog.
- [ ] 4.2 Verify the invariant's failure modes with a local fixture (a method called nowhere, and a method mentioned only in a comment): the test names the uncovered method in both cases; remove the fixture afterwards and re-verify green.

## 5. Docs and ADR sync

- [x] 5.1 Add AD-030 (method-level demo coverage enforced by source matching) to `docs/decisions.md` as Accepted with its implements/supports links, and confirm the ADR status table lists it; verify no other ADR entry was altered.
- [x] 5.2 Update `docs/roadmap.md` with the new change entry, extend the `site/README.md` authoring guide with the `math` section and the coverage rule, and touch up the README demo count if it cites one; verify `npx @fission-ai/openspec@latest validate --all --strict` passes.

## 6. Thumbnails and integration validation

- [x] 6.1 Capture the thirteen new thumbnails on the verification server with `site/scripts/capture-thumbnails.mjs`, regenerate `previews/manifest.json`, and commit the previews; verify `tests/showcase-thumbnails.test.ts` passes (no drift, no orb fallback).
- [x] 6.2 Full integration pass: root `npm test`, `npm run check`, `npm run lint`, and a site build against the local artifact; verify the Pages-parity build succeeds and the gallery shows 25 cards with previews.

## Workflow follow-up

- Commit to `main` per the repo workflow (demos/tests/docs first, thumbnails once captured) and let `build-wasm.yml` gate the push.
- Archive the change after review requirements are satisfied and the synced `showcase-gallery` spec matches `docs/decisions.md`.
