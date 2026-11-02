# Tasks

## 1. Crease-aware normals

- [x] 1.1 In `site/src/viewport.ts`, add the 30 degree crease constant, import
  `toCreasedNormals` from `three/addons/utils/BufferGeometryUtils.js`, replace
  `computeVertexNormals()` with the creased geometry, and dispose the
  intermediate indexed geometry; verify `cd site && npm run check && npm run
  build` succeeds and the wavy-slab rim no longer shows the dark averaged band.
- [x] 1.2 Keep the Flat toggle and wireframe behavior working against the
  creased geometry; verify Flat still shows per-face facets and disabling it
  restores crease-aware smooth shading without a re-mesh.
- [x] 1.3 Verify curved demos (sphere/gyroid) remain smooth in the default view
  and that camera framing/bounds still come from the creased geometry.

## 2. Shading mode visibility

- [x] 2.1 Add a concise inspector label identifying the default as auto-smoothed
  at 30 degrees; verify it renders next to the existing toggles on desktop and
  mobile.
- [x] 2.2 Add a short shading note to `site/README.md` explaining the 30 degree
  crease threshold and the Flat diagnostic; verify the documented behavior
  matches the UI.

## 3. Verification

- [x] 3.1 Run root `npm test`, `npm run check`, `npm run lint` and site
  `npm run check`, `npm run lint`, `npm run build`; verify all pass.
- [x] 3.2 Browser smoke on the wavy slab: capture default smooth and Flat views,
  verify the rim is hard in smooth mode and faceted in Flat, and verify the
  sphere/gyroid stay smooth.
- [x] 3.3 Verify mesh vertex/triangle stats and an STL download are unchanged by
  the normal pass, and `npm run test:package` still produces the same package
  boundary (no site files, no new dependency).

## 4. Deployment verification

- [x] 4.1 Commit and push to `main`; verify `build-wasm` and `pages.yml` succeed.
- [x] 4.2 Smoke-test the live wavy slab in smooth and Flat modes and record the
  live URL.
