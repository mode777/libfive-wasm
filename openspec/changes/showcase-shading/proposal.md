# Proposal

## Why

The showcase's default smooth shading averages vertex normals across every
shared edge. On the wavy slab (and any shape with a thin wall or a sharp
crease), the top/side rim gets a normal halfway between two faces, producing a
dark, smeared band that looks like a shading bug. The mesh itself is clean and
watertight; the problem is purely how normals are generated for display.

## What Changes

- Generate **crease-aware smooth normals** for the 3D viewport instead of
  averaging across every shared vertex. Edges at or below 30° share normals;
  edges above 30° are hard.
- Keep the existing **Flat** toggle as a per-face diagnostic view; it remains
  unaffected by crease normals.
- Add a small inspector label identifying the default as auto-smoothed at 30°,
  so the behavior is visible and not mistaken for a mesh defect.
- Record the threshold as a named constant in the viewport code and document it
  in the showcase authoring guide.
- No package API, wasm artifact, build system, Pages workflow, or npm publish
  path changes.

This change introduces no new ADR. It is a rendering refinement of the
showcase established by AD-028 and does not alter AD-028's deployment, package
consumption, or non-published-site decisions.

## Capabilities

### New Capabilities

- `showcase-rendering`: viewport shading behavior for the public showcase —
  crease-aware smooth normals, the per-face flat diagnostic mode, and the
  shading labels/threshold.

### Modified Capabilities

<!-- No existing capability requirements change. `showcase-site` and
     `showcase-gallery` cover deployment and gallery behavior; this capability
     owns the viewport's normal/shading contract. -->

## Impact

- **Site:** `site/src/viewport.ts` normal generation, inspector label in
  `site/src/demo-page.ts` / styles, and a note in `site/README.md`.
- **Tests:** a browser smoke comparing smooth vs flat on the wavy slab; the
  existing demo validation suite remains unchanged.
- **Dependencies:** uses the already-installed three.js
  `toCreasedNormals` helper; no new package.
- **Perimeter:** the npm tarball, wasm build, CI build gate and Pages workflow
  are untouched.
