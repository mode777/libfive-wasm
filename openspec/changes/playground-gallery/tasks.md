# Tasks

## 1. Catalog expansion

- [x] 1.1 Add the `Section` set and `sections` field to `DemoMeta`; verify the
  existing four demos typecheck with their section declarations.
- [x] 1.2 Add `smooth-morph`, `lattice-cube`, `loft-tower` and `revolved-vase`
  demo modules; verify each appears in the catalog and meshes non-empty.
- [x] 1.3 Add `wavy-slab`, `hollow-frame`, `polar-gear` and `raw-escape` demo
  modules; verify each appears in the catalog and meshes non-empty.
- [x] 1.4 Extend the root showcase test to assert twelve demos, unique ids and
  finite geometry for every entry; verify `npm test` passes.

## 2. Coverage and filtering

- [x] 2.1 Add the section coverage manifest and helpers; verify every section
  maps to at least one demo in the test suite.
- [x] 2.2 Add section filter buttons to the gallery with `aria-pressed`, a
  clear action and an empty state; verify filtering and clearing with a browser
  smoke test.
- [x] 2.3 Show the section labels on cards alongside the feature chips; verify
  every card exposes at least one section.

## 3. Inspector

- [x] 3.1 Add viewport `setWireframe` and `setFlatShading`; verify toggling each
  changes the rendered material and resets on a new mesh.
- [x] 3.2 Add the `shape.toString()` Scheme panel using the worker's expression;
  verify the panel shows the current demo's expression.
- [x] 3.3 Add the evaluation probe to the worker protocol and session; verify
  the probe returns finite value/gradient and a named error before a mesh exists.
- [x] 3.4 Render the probe result in the inspector and keep the existing stats
  and STL download working; verify a live STL download matches the triangle
  count.

## 4. Lazy demo route

- [x] 4.1 Dynamically import the demo page from `app.ts` with a loading state
  and a route token; verify navigation still works and a late import is
  discarded.
- [x] 4.2 Verify the gallery network requests do not include the renderer or
  highlighter chunks, and that opening a demo loads them.

## 5. Documentation and validation

- [x] 5.1 Add `site/README.md` with the demo contract, section set, source-view
  rule, Node-validation constraint and commands; link it from the root README.
- [x] 5.2 Update the roadmap status and any affected docs; run
  `npx @fission-ai/openspec@latest validate --all --strict` and verify it passes.
- [x] 5.3 Run root `npm test`, `npm run check`, `npm run lint`, and site
  `npm run check`, `npm run lint`, `npm run build`; verify all pass.

## 6. Deployment verification

- [ ] 6.1 Commit and push to `main`; verify `build-wasm` and `pages.yml`
  succeed and deploy the new commit.
- [ ] 6.2 Smoke-test the live gallery filter, one demo's inspector (wireframe,
  Scheme, probe) and STL download; record the live URL.
