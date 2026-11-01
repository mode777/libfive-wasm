# Proposal

## Why

The repository now builds a correct wasm artifact and a complete API, but the
artifact is not yet a shippable package: `dist/` contains only the Emscripten
glue and `.wasm`, there is no compiled `index.js`/`index.d.ts`, `package.json`
still describes a private scaffold with no `exports`/`files`/`types`, and no
consumer has ever installed the tarball. Roadmap change 7 turns the working
tree into the single ESM package AD-002/AD-007 promise, with a manifest and
bundler story verified from a clean consumer project.

## What Changes

- Add a package build step (`scripts/build-js.mjs`) that bundles
  `src/index.ts` plus the generated Emscripten factory into `dist/index.js`
  (the glue is inlined so `new URL('libfive.wasm', import.meta.url)` is a
  static asset reference for bundlers) and emits the declaration tree with
  `tsc -p tsconfig.build.json` (`dist/index.d.ts` plus referenced `.d.ts`).
- Finalize the publishable manifest per `packaging.md`: ESM-only `exports`
  map, `types`, `files` (`dist`, `README.md`, `LICENSE`), `sideEffects:
  false`, `engines.node >= 18`, and package metadata. `private` stays `true`
  until `first-release` flips it, keeping tag publishing inert.
- Add a root `LICENSE` carrying the MPL-2.0 text already used for the vendored
  tree (AD-012), so the tarball has one license story.
- Rewrite the README for consumers: install/import, quick start (`init`, build,
  mesh, STL), the corrected `res` semantics warning, bundler notes
  (`import.meta.url` asset emission and the `wasmBinary` escape hatch), and a
  Worker recipe.
- Add a consumer integration test (`scripts/test-package.mjs`): `npm pack` the
  real tarball, install it in a scratch project, mesh a sphere from Node, and
  build a small Vite app that imports the installed package and emits the wasm
  asset; CI runs it after the package suite.
- Wire `build-wasm.sh` to run the JS/declaration build after linking, and
  document the packaged layout and consumer verification in
  `docs/build-system.md` / `docs/packaging.md`.
- Record the bundled-entry and tarball-verification decisions as AD-026.

Out of scope: the version bump, CHANGELOG, tag and actual npm publish
(change 8); changing the API, wasm ABI or mesh output.

## Capabilities

### New Capabilities

- `npm-package`: the shipped package contract — publishable manifest fields,
  tarball contents, compiled ESM entry and declarations, default and
  `wasmBinary` loading from an installed package, bundler asset emission, and
  consumer install verification (AD-002, AD-007; supports AD-012, AD-019).

### Modified Capabilities

- `js-loader`: default wasm resolution and bundler behavior are now exercised
  through the packaged `dist/index.js` (with the Emscripten factory inlined),
  not only through in-repo source imports.
- `wasm-build-pipeline`: after linking, the build also produces the packaged
  entry and declarations, and the build contract names `dist/index.js`,
  `dist/index.d.ts` and the consumer tarball check.

## Impact

- **New code**: `scripts/build-js.mjs`, `scripts/test-package.mjs`,
  `tsconfig.build.json`, root `LICENSE`.
- **Existing code**: `package.json` (manifest + scripts + dev dependencies),
  `scripts/build-wasm.sh` (JS/declaration build step),
  `.github/workflows/build-wasm.yml` (consumer package check).
- **APIs**: none; the import surface (`init`, `Shape`, `exportSTL`, `raw`,
  types) is unchanged, now reachable from the installed package.
- **Docs**: `README.md` (consumer rewrite), `docs/packaging.md` (final
  manifest/layout), `docs/build-system.md` (package build step),
  `docs/decisions.md` (AD-026), `docs/roadmap.md` (change 7 Done at
  completion).
- **Decisions**: introduces **AD-026** (single bundled ESM entry with inlined
  Emscripten factory, declaration tree beside it, and tarball consumer
  verification). Implements AD-002/AD-007 packaging, supports AD-012/AD-019;
  alters or reverses no Accepted ADR, so no existing ADR is superseded.
