# Design

## Context

See `proposal.md` for motivation and the three spec deltas for contracts.
Current constraints that shape the approach:

- `src/loader/glue.ts` locates the Emscripten glue with
  `new URL('./libfive.js', import.meta.url)` and dynamically imports it with a
  bundler-ignored specifier. That works for in-repo tests (which bypass it) but
  cannot survive a Vite/webpack production build: a computed `import.meta.url`
  import of a file inside `node_modules` is not emitted as an asset.
- The Emscripten glue itself already does the right thing for the wasm:
  `new URL('libfive.wasm', import.meta.url)`. If the glue is part of the
  consumer's bundle, bundlers see that literal and emit the asset.
- The package source is multi-module TypeScript with `.js` import specifiers
  (NodeNext), so `tsc` can emit declarations directly but its JS output would
  spread across `dist/` and keep the dynamic glue import.
- The repository has no root `LICENSE`, and `package.json` is still the
  private scaffold (no exports/files/types).

## Goals / Non-Goals

**Goals:**

- One installable tarball whose entry works in Node and a Vite production build
  with no options and no plugin.
- Declarations that typecheck a consumer against the tarball alone.
- A consumer test that exercises the actual packed tarball, not the working
  tree.
- Keep the build reproducible and fail closed when packaging tools are absent.

**Non-Goals:**

- Publishing, version bump, CHANGELOG or tag (change 8).
- Multiple entry points, CJS build, or a separately exported raw subpath.
- Changing the API, ABI, mesh output or loader options.
- A browser E2E run in this change; the Vite build proves asset emission.

## Decisions

### D1 — Bundle the API and glue into `dist/index.js` with esbuild (AD-002, AD-007, AD-026)

`scripts/build-js.mjs` builds a virtual entry (stdin, `resolveDir` at the repo
root) that:

```ts
import createLibfiveModule from '<abs>/dist/libfive.js';
import { initFromFactory } from '<abs>/src/loader/index.ts';
export * from '<abs>/src/index.ts';
export async function init(options = {}) {
    return initFromFactory(createLibfiveModule, options);
}
```

esbuild bundles it to `dist/index.js` (ESM, ES2022, platform neutral). The
Emscripten factory is now part of the entry, so its
`new URL('libfive.wasm', import.meta.url)` is a static reference to the
sibling `dist/libfive.wasm`; Vite/webpack/Rollup emit it as an asset. The
explicit `init` shadows the `export *` of the source loader's dynamic-import
version, so consumers never take the node_modules-relative computed path.

Alternatives considered: multi-file `tsc` output with the glue imported by a
relative path (rejected — the dynamic import remains invisible to bundlers and
the layout is brittle), keeping `dist/libfive.js` as a second public module
(rejected — two graces and a bundler trap), and hand-writing the entry in
`src/` (rejected — it would need a compile-time dependency on `dist/libfive.js`
and break `npm run check`).

### D2 — Declarations from `tsc`, JS from esbuild (AD-026)

`tsconfig.build.json` extends the repo config with `emitDeclarationOnly`,
`declaration`, `rootDir: src`, `outDir: dist` and an include limited to
`src/**/*`. `dist/index.d.ts` references the emitted declaration modules
(`api/`, `ffi/`, `gen/`, `loader/`), which are all inside the `files` list.
The JS is produced only by esbuild, so there is no dual-source drift: types
describe the source surface, the bundle provides the runtime.

Alternatives considered: `tsc` for both JS and declarations (rejected — keeps
the dynamic glue import and spreads runtime modules), and hand-written
`index.d.ts` (rejected — drifts immediately and loses the generated stdlib
types).

### D3 — Final manifest keeps `private: true` until release (AD-002, AD-007, AD-012)

`package.json` gets the `exports`/`types`/`files`/`sideEffects`/`engines`
fields from `packaging.md`, plus `build:js` and `test:package` scripts and
`esbuild`/`vite` dev dependencies. `private` stays `true`; `first-release`
flips it together with the version bump, keeping `publish-npm.yml` inert until
the release change. A root `LICENSE` copies the canonical MPL-2.0 text used for
the vendored tree, so the tarball's `files` list carries one license file.

### D4 — Consumer test packs, installs and builds (AD-026)

`scripts/test-package.mjs` uses a temporary directory under the OS temp dir:

1. `npm pack --pack-destination <tmp>` from the repo (the tarball is the
   reviewable artifact).
2. Create a scratch ESM project, `npm install <tarball> --ignore-scripts`,
   and write a `check.mjs` that imports `libfive-wasm`, calls `init()`, builds
   `sphere(1)`, meshes it and asserts non-zero counts, then frees.
3. Write an `index.html` + `src/main.js` Vite app importing the same package,
   run Vite from the repo's `node_modules` with the scratch project as root,
   and assert the build succeeded and emitted a `.wasm` asset.
4. Clean up unless `KEEP_PACKAGE_TEST=1`.

No network is needed beyond the local tarball: the scratch project has no
dependencies and Vite is invoked from the repo install. The script fails with
an actionable message if `dist/index.js` is absent (build first).

Alternatives considered: installing into a temp project from the registry
(not published yet), running `npm link` (does not prove tarball contents), and
a browser screenshot test (out of scope; Vite build proves the asset path).

### D5 — README and docs rewritten in the same change (AD-019, AD-026)

The README becomes consumer-first (install, quick start, `res` semantics,
bundler notes, worker recipe, memory rules) while keeping the contributor
build/verification section. `docs/packaging.md` records the final manifest and
`dist/` layout; `docs/build-system.md` adds the JS/declaration build step and
the consumer check to the pipeline; `docs/decisions.md` gains AD-026;
`docs/roadmap.md` flips change 7 to Done when the gate passes.

## Risks / Trade-offs

- **esbuild bundle size/format drift** → pinned dev dependency and a single
  reviewed entry; `npm run check` still typechecks sources, and the consumer
  test runs the bundle.
- **Emscripten glue Node branches in a browser bundle** → the glue guards them
  behind `ENVIRONMENT_IS_NODE`; Vite may warn about the dynamic `module`
  import but the branch is not executed. The consumer test fails loudly if the
  build breaks.
- **Bundler optimization changes the wasm URL** → the literal
  `new URL('libfive.wasm', import.meta.url)` is the pattern bundlers support;
  `wasmBinary` remains documented as the escape hatch.
- **Tarball includes extra glue** → `dist/libfive.js` stays in the package for
  transparency/debugging; it is small relative to the wasm and does not change
  the entry contract.
- **Consumer test runtime** → `npm pack` + install + Vite build is a few
  seconds and runs in CI after the suite; no network and no browser.
