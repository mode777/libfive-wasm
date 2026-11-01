# Tasks

Prerequisite for groups 3–4: a built artifact in `dist/`
(`scripts/build-wasm.sh` — run on the verification server or let CI build
it; the local checkout already has `dist/libfive.wasm` + `dist/libfive.js`).

## 1. Package scaffold

- [x] 1.1 Create `package.json` (`name: libfive-wasm`, `"type": "module"`, `"private": true`, `version: 0.0.0`, `engines.node >= 18`, `license: MPL-2.0`, no runtime deps, scripts `test`/`check`/`lint`/`format`), strict `tsconfig.json` (`module: nodenext`, `target: es2022`, `noEmit`), and `vitest.config.ts` (node environment, `passWithNoTests`); add `node_modules` to `.gitignore`. Verify: `npm ci && npm run check && npx vitest run` all exit 0 and `git status` shows no stray files.
- [x] 1.2 Add eslint (flat config, typescript-eslint) and prettier as dev dependencies with `lint`/`format` scripts and a committed lockfile. Verify: `npm run lint` exits 0 on the empty `src/`/`tests/` tree.

## 2. Loader (`src/loader/`)

- [x] 2.1 Add `src/errors.ts` defining `LibfiveError` (`name = "LibfiveError"`, cause-carrying message) and export it from the package root; unit-test `instanceof`, `name`, and message content. Verify: `npx vitest run tests/errors.test.ts` passes.
- [x] 2.2 Implement the loader: `loadFactory()` seam (dynamic import of `./libfive.js` relative to the loader module), `initFromFactory(factory, options)` (JSDoc `@internal`) that validates and maps options — `wasmBinary` pass-through (takes precedence), `locateWasm` → factory `locateFile`, `debug` recorded on the instance — and `init(options)` composing the two; failures reject with `LibfiveError` naming the wasm load problem. Unit-test against a stub factory: default call forwards no resolution override, `wasmBinary` beats `locateWasm`, `locateFile` receives the artifact filename, `debug` lands on the instance, wrong-typed options reject with `LibfiveError`, factory rejection propagates identically. Verify: `npm run check && npx vitest run tests/loader.test.ts` green.
- [x] 2.3 Define the `Libfive`/`InitOptions`/`RawLibfive` public types (`raw` + `debug` on the instance) and JSDoc `init` as the documented entry (advanced `raw` note per AD-011). Verify: `npm run check` green and the types are importable from a scratch TS file that typechecks.

## 3. FFI layer (`src/ffi/`) — needs `dist/` artifact

- [x] 3.1 Add `src/ffi/types.ts`: `RawLibfive` typing every core manifest symbol from `wasm/exports.txt` plus allocator, heap views and runtime string helpers, with branded pointer aliases (`TreePtr`, `MeshPtr`, `VoidPtr`, …); signatures transcribe `wasm/shim.h` (out-pointers, int32-as-bool). (The artifact exports no `memory` property — heap views are the accessors; see design D3.) Verify: `npm run check` green with zero `any` leaks in the module surface.
- [x] 3.2 Add `src/ffi/structs.ts`, `strings.ts`, `memory.ts`: region3/vec3/interval-out allocators that route writes through the shim setters, UTF-8 alloc/read helpers that release kernel strings via `libfive_free_str`, and heap-view accessors that re-bind to the current wasm buffer. Verify with an integration test `tests/ffi.test.ts` against the real artifact: region written via helpers drives `shim_tree_eval_r` and bounds read back; string written/read round-trips byte-exact; views reflect freshly written bytes. `npx vitest run tests/ffi.test.ts` green.

## 4. Raw namespace + integration suite

- [x] 4.1 Build the curated `raw` object (module functions re-exposed under their verbatim module keys — `_libfive_tree_*`, `_shim_*`, `_libfive_*_delete`, `_malloc`/`_free` — plus live heap views and helper utilities, no generated stdlib functions; no `memory` property exists on the artifact, see design D3) and have `initFromFactory` return `{ raw, debug }`. Add `tests/raw.test.ts`: manifest parity (every `wasm/exports.txt` symbol is present and callable on `raw` — fails on missing exports) and stdlib-wrapper absence (flat stdlib symbols are not part of the typed raw surface). Verify: `npx vitest run tests/raw.test.ts` green.
- [x] 4.2 Add `tests/kernel.test.ts` against the real artifact via `initFromFactory` + `wasmBinary`: hand-built sphere through raw (opcode lookup, nullary/binary/unary construction), interval evaluation negative inside / positive outside, `tree_print` string round-trip released through `libfive_free_str`, meshing through the `_st` shim with consistent counts and in-range indices, mesh freed via `libfive_mesh_delete`, and trees freed via `libfive_tree_delete`. Verify: `npx vitest run tests/kernel.test.ts` green.
- [x] 4.3 Add `tests/loader-integration.test.ts`: two `init` instances expose distinct live wasm heap buffers with isolated allocations; the real glue imported from `dist/` with no options instantiates from its sibling wasm (factory default resolution in Node); invalid `wasmBinary` rejects with `LibfiveError`. Verify: `npm test` runs the whole suite green.

## 5. CI + docs baseline

- [x] 5.1 Extend `.github/workflows/build-wasm.yml` with `npm ci` + `npm test` steps after the existing build step (Node 24 is already set up); `publish-npm.yml` untouched. Verify: workflow YAML valid (`node -e` parse or actionlint-style check), `npm test` green locally against the built artifact; final confirmation is the green CI run on push.
- [x] 5.2 Update `docs/build-system.md` so the pipeline description matches reality: artifact tests plus the package suite (`npm test`) run against the built artifact, and the `tsc → dist/index.js` compile step is attributed to the `npm-packaging` change. Verify: the doc's pipeline section names both suites and no longer implies this change emits `dist/index.js`.
- [x] 5.3 Update `docs/roadmap.md` change 3 status to Done once all above tasks pass. Verify: roadmap table row for `js-package-core` reads Done.

## 6. Final verification

- [x] 6.1 Full gate: `npm run check && npm run lint && npm test` all green, with `scripts/build-wasm.sh` and everything under `wasm/` untouched (`git diff --stat` shows no changes there).
- [x] 6.2 `npx @fission-ai/openspec validate --all --strict` passes with no findings for this change.

## Workflow follow-up

- Present the implemented change for review, then archive it with
  `/opsx-archive` once the project's review requirements are satisfied
  (archive guidance: check synced specs against `docs/decisions.md` — this
  change adds no ADRs, so only conformance is checked).
