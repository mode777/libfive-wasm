# Roadmap — the OpenSpec change sequence

The order in which the port lands as OpenSpec changes. This is a living
plan: statuses update as changes land, and reordering is a normal edit to
this file. Every item still gets the full OpenSpec treatment
(`openspec/changes/<name>/` with proposal, spec deltas, design, tasks) and
must follow `openspec/config.yaml` rules — including ADR sync in
`docs/decisions.md` and updates to the affected `docs/` baseline files.

Change names below are the intended kebab-case names for
`openspec new change`.

## Principles behind this order

1. **Risk first.** The Emscripten build (interval rounding hazard, CMake
   under `emcmake`) is the least certain step, so it lands before anything
   is built on top of it.
2. **Vertical slices.** Every change leaves the repo green: CI workflows
   stay passing, and each change ends with something demonstrable
   (a buildable artifact, a usable API surface).
3. **Parallelizable where noted.** The JS package work does not depend on
   the wasm build being finished — only on its exported surface being
   frozen — so Phases 1 and 2 can interleave.

## Overview

| # | Change | Phase | Depends on | Status |
|---|---|---|---|---|
| 1 | `vendor-libfive` | 1 · De-risk the kernel | — | Done |
| 2 | `wasm-build-pipeline` | 1 · De-risk the kernel | 1 | Done |
| 3 | `js-package-core` | 2 · Core JS package | 2 (surface only) | Done |
| 4 | `shape-api` | 2 · Core JS package | 3 | Done |
| 5 | `stdlib-bindings` | 3 · Stdlib & conveniences | 4 | Done |
| 6 | `golden-verification` | 4 · Verify & package | 5 | Done |
| 7 | `npm-packaging` | 4 · Verify & package | 6 | Done |
| 8 | `first-release` | 5 · Ship | 7 | Planned |

---

## Phase 1 — De-risk the kernel

### 1. `vendor-libfive`

**Goal:** pinned upstream source in the repo, ready to build, nothing built
yet.

- `scripts/vendor-libfive.sh`: fetch/verify/extract upstream at the pinned
  commit into `vendor/libfive` (MPL-2.0 text installed because upstream has no
  root license file; GPL subtrees removed; no VCS metadata) and print the
  reproducible tree digest.
- `vendor/libfive.lock`: machine-readable pin (commit, archive digest, ordered
  patch list with a digest); `vendor/VENDOR.md`: commit, date, rationale
  (AD-016, AD-021), expected tree digest, bump procedure.
- `vendor/patches/*.patch`: the carried build adjustments (no
  `-march=native`, skip Qt/Guile/Studio/Python/tests/Threads, libpng via
  Emscripten port, include-path handling), each with a header comment.
- `scripts/fetch-deps.sh` + `scripts/deps.lock`: pinned Eigen 3.4.0 + Boost
  1.92.0 header tarballs with SHA-256 verification, cached and extracted under
  `build/deps/`.
- **Implements:** AD-016, AD-021 (parts of AD-001, AD-013).
- **Done when:** the two scripts from a clean checkout reproduce the patched
  `vendor/libfive` (tree digest equals `vendor/VENDOR.md`) and `build/deps/`,
  the patch set applies with `-F0` and no rejects, and both generated trees stay
  gitignored.

### 2. `wasm-build-pipeline`

**Goal:** `scripts/build-wasm.sh` produces `dist/libfive.wasm` that meshes
a sphere — the make-or-break change.

- `wasm/shim.c`: ABI flattening (struct-return out-pointers, region
  builders), exported-symbol list.
- `scripts/emcache.cmake` overlay: vendored root configured via `emcmake`
  with the PoC-proven guards + our pinned include dirs.
- Link step with the locked flag table (`build-system.md`): MODULARIZE,
  EXPORT_ES6, memory growth, FILESYSTEM=0, `-fexceptions`, libpng port,
  no threads/SIMD; always mesh via `libfive_tree_render_mesh_st`.
- **Software interval rounding (AD-015):** carried patch/header pinning a
  software rounding policy for `boost::numeric::interval`, plus the
  interval test suite (wide-region `exp`/`sin`/`1/x` bounds) as the
  acceptance test. Spike first; if the policy proves intractable at the
  pinned commit, the change documents the fallback (vendored interval
  header) — not silent acceptance of `fesetround` behavior.
- Node smoke test invoked from `build-wasm.sh` (raw exports only): build →
  import in Node → mesh a sphere → assert counts.
- `build-wasm.yml` stops no-oping (its `scripts/build-wasm.sh` contract
  goes live).
- **Implements:** AD-004 (shim), AD-008, AD-013, AD-014, AD-015, AD-019.
- **Done when:** CI builds the artifact green on a clean runner (vendoring +
  deps from scratch); the printed wasm SHA-256 matches the uploaded artifact
  and independent clean builds; smoke + interval suites pass; and the export
  manifest/shim ABI is frozen for the JS package work.

## Phase 2 — Core JS package

### 3. `js-package-core`

**Goal:** the npm package skeleton with a working async `init()` and the
typed raw C namespace. Developable in parallel with change 2 once the
export surface is frozen.

- `package.json` (`type: module`, no runtime deps), `tsconfig`, vitest
  setup, lint/format.
- `src/loader/`: `init(options)` — default wasm resolution via
  `import.meta.url`, `wasmBinary`/`locateWasm`/`debug` options.
- `src/ffi/`: typed declarations for every exported C function + shim
  helpers, struct builders, UTF-8 string helpers, memory utilities.
- `libfive.raw` exposed and documented (AD-011).
- **Implements:** AD-004, AD-007, AD-011.
- **Done when:** tests run against the real wasm artifact in Node:
  `init()`, raw tree build, raw mesh, string round-trip; loader unit tests
  for option handling.

### 4. `shape-api`

**Goal:** the convenience API core — everything in `api-design.md` except
stdlib.

- `Shape` class: constant/var/x-y-z construction, coercion (`number` →
  const tree), arithmetic & math methods, CSG methods, `remap`,
  `optimized`, `toString`, evalF/evalR/evalD, `Shape.fromTree`.
- `Mesh`: zero-copy re-binding view getters, counts, `copyVerts/copyTris`,
  `free()`; `exportSTL` (AD-018).
- Memory model: idempotent `free()` everywhere, `FinalizationRegistry`
  net, `debug` warnings (AD-005, AD-006); detached/freed-object errors.
- `LibfiveError` + misuse validation (bad region, NaN res) — the error
  story from `architecture.md`.
- **Implements:** AD-003 (core), AD-005, AD-006, AD-009, AD-018.
- **Done when:** the `api-design.md` examples (Node STL export, hand-built
  sphere via arithmetic) pass as tests; lifecycle tests prove no
  use-after-free and no leak under GC pressure.

## Phase 3 — Stdlib & conveniences

### 5. `stdlib-bindings`

**Goal:** full C-stdlib coverage, generated.

- `scripts/gen-stdlib-ts.mjs`: parse `libfive_stdlib.h` markers
  (`LIBFIVE_STDLIB`/`ALIAS`/`SECTION`, doc comments, `__0`/`__1`
  defaults) → `src/gen/stdlib.ts` (checked in, regenerated on pin bumps).
- camelCase mapping + aliases; top-level functions and shape-leading
  method forms; optional-argument handling with const-tree defaults.
- Opcode-method table finalized from the pinned commit (anything missing
  stays reachable via `raw` + `Shape.fromTree`, per `api-design.md`).
- **Implements:** AD-010, AD-017 (plus the stdlib half of AD-003).
- **Done when:** generator output compiles and is covered by snapshot
  tests; every stdlib section from `libfive_stdlib.h` has exercised
  wrappers; docs examples updated.

## Phase 4 — Verify & package

### 6. `golden-verification`

**Goal:** artifact-level regression safety net.

- Golden scenes (sphere, gyroid, blended union, `text`) meshed through the
  public API; vertex/triangle counts + hash of first-N vertices compared
  to checked-in goldens.
- Golden (re)capture procedure on the verification server; goldens never
  hand-edited; recapture required when the vendor pin or interval policy
  changes.
- Optional `--host=native` cross-check build of the vendored tree (proves
  interval patch behaves on both targets).
- **Implements:** the verification half of AD-015; supports AD-013.
- **Done when:** CI runs the golden suite against every build artifact and
  it catches an intentionally-broken interval policy (fault injection).

### 7. `npm-packaging`

**Goal:** the shippable package.

- `exports` map, `types`, `files`, `sideEffects: false`, `engines` per
  `packaging.md`; `dist/` build wired into `build-wasm.sh` (tsc step).
- Bundler guidance validated: Vite/webpack asset emission for
  `import.meta.url` wasm resolution; `wasmBinary` escape hatch documented.
- README rewritten for consumers (quick start, `res` semantics warning,
  Worker recipe, bundler notes).
- **Implements:** AD-002, AD-007, AD-019 (final form).
- **Done when:** `npm pack` produces the intended tarball; a consumer
  integration test installs the tarball in a scratch project (Node +
  Vite) and meshes.

## Phase 5 — Ship

### 8. `first-release`

**Goal:** `libfive-wasm@0.1.0` on npm.

- CHANGELOG, version bump, `v0.1.0` tag; npm trusted-publishing
  activation on the npm side (repo/workflow trust + `npm` environment) —
  the one manual prerequisite.
- Publish via `publish-npm.yml` with provenance; verify
  `npm view libfive-wasm` and the attestation; post-release smoke install.
- **Implements:** AD-020 (and AD-012 via LICENSE files in the tarball).
- **Done when:** the published package installs and runs in a clean Node
  and browser project.

## Later — unscheduled candidates

Each a deliberate future change, ordered by expected value; none block
1.0 stability (see also "not in v1" in `architecture.md`):

1. `slice-contours` — wrap `render_slice`/`render_slice3`/`render_pixels`
   with the same view semantics (completes the 2D story).
2. `evaluator-remesh` — var-aware re-meshing (upstream shim or memfs
   round-trip) for parametric workflows.
3. `threaded-meshing` — pthreads + libfive worker pools behind the same
   API (supersedes AD-009's sync-only stance via a new ADR).
4. `simd-variant` — optional SIMD artifact selected at `init()`.
5. `tree-persistence` — save/load against buffers instead of files.
6. `playground-demo` — browser demo page (docs site, not part of the npm
   package).

## Change-to-ADR coverage check

Every Accepted ADR is implemented by at least one planned change:
AD-001/016/021 (1), AD-004/008/013/014/015/019 (2, 3), AD-002/003/005/006/007/
009/010/011/017/018 (3–5, 7), AD-012 (8), AD-020 (8).
