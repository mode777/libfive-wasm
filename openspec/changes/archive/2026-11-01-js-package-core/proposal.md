# Proposal

## Why

The repo can build and verify the wasm artifact (`dist/libfive.wasm`), but
there is no JavaScript package to consume it: no `package.json`, no `src/`,
no way for a user to call `init()` and reach the kernel. Roadmap change 3
starts Phase 2 — the npm package skeleton with a working async `init()` and
the typed raw C namespace — on top of the export surface that change 2
froze. Doing it now unblocks everything above it (`shape-api`,
`stdlib-bindings`) and can proceed purely against the frozen ABI (AD-022).

## What Changes

- Add the package scaffold: `package.json` (`"type": "module"`, no runtime
  dependencies), `tsconfig.json`, vitest test setup, lint/format config,
  all dev-dependency only.
- Add `src/loader/`: async `init(options?: InitOptions)` that instantiates
  the Emscripten ES6 factory and returns a `Libfive` object. Default wasm
  resolution comes from the factory's `import.meta.url`-based lookup;
  `wasmBinary`, `locateWasm` and `debug` options are accepted per
  `api-design.md`. Repeated calls create independent module instances.
- Add `src/ffi/`: handwritten TypeScript declarations for the frozen core
  export surface (`wasm/exports.txt` — tree construction, opcode lookup,
  ABI shims, deleters) plus the allocator, exported heap views/runtime
  string helpers, struct builders (`region3`, `vec3`, interval/vec3
  out-params), and memory utilities.
- Expose `libfive.raw` on the object returned by `init()` (AD-011) and
  document it as the advanced escape hatch.
- Add the package test suite (vitest) running against the real built
  artifact in Node: `init()`, raw tree build, raw mesh, string round-trip,
  and loader option-handling tests.
- Extend CI (`build-wasm.yml`) with a step that installs dev dependencies
  and runs the package test suite after the artifact build.

Out of scope (later roadmap changes): the `Shape`/`Mesh` convenience layer
and `LibfiveError` misuse validation (change 4), generated stdlib bindings
(change 5), golden verification (change 6), the publishable manifest —
`exports` map, `files`, bundled `dist/index.js`/`index.d.ts`, tsc wired
into `build-wasm.sh` — and consumer-facing README (change 7), release
(change 8).

## Capabilities

### New Capabilities

- `js-loader`: the package's asynchronous initialization contract —
  `init(options)` resolves and instantiates the wasm module in Node,
  browsers and workers, honors `wasmBinary`/`locateWasm`/`debug`, yields
  independent instances, and fails with a named error when the artifact
  cannot be loaded (AD-007).
- `raw-bindings`: the typed raw C namespace `libfive.raw` — complete,
  callability-tested coverage of the frozen artifact export surface
  (core C API, ABI shims, allocator, heap views, string helpers) as an
  advanced, semver-relevant escape hatch (AD-004, AD-011, AD-022).

### Modified Capabilities

None — `interval-rounding`, `source-vendoring` and `wasm-build-pipeline`
requirements are unchanged; this change only binds against the artifact
they already produce.

## Impact

- **New code**: `src/loader/`, `src/ffi/`, package-level test files,
  `package.json`, `tsconfig.json`, vitest/eslint/prettier config, lockfile.
- **Existing code**: `build-wasm.sh` gains no new steps; `.github/workflows/build-wasm.yml`
  gains an `npm` install + package-test step after the artifact build.
- **APIs**: introduces the package's public entry point (`init`,
  `Libfive`, `InitOptions`, `libfive.raw`) for the first time; additive
  only — nothing existing is removed or broken. The raw namespace types
  the frozen ABI from `wasm/exports.txt` + `wasm/shim.h`; any change there
  is an ABI change outside this scope.
- **Docs**: `docs/build-system.md` pipeline wording is touched up so the
  `tsc → dist/index.js` step is attributed to the packaging change; no
  other baseline doc changes.
- **Decisions**: no architecture/design decision is introduced, altered or
  reversed. Implements AD-004, AD-007, AD-011; conforms to AD-002, AD-013,
  AD-019, AD-022; no ADR is superseded, so `docs/decisions.md` needs no
  new or modified entry.
