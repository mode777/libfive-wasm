# Proposal

## Why

The vendored kernel has never been compiled. The computer that ships this
project's whole value — `dist/libfive.wasm` — does not exist yet, the CI
workflows are still scaffold no-ops, and the software interval-rounding
guarantee (AD-015) is an unproven requirement rather than a verified property.
This change is the make-or-break step in the roadmap: it turns the pinned
source and dependencies into a buildable, meshing WebAssembly artifact, with the
export surface frozen so the JavaScript package work can proceed in parallel.

## What Changes

- Add `scripts/build-wasm.sh`: single, argument-free entry point that ensures
  the pinned vendor tree and dependency headers are present, verifies the
  pinned Emscripten version, configures the vendored tree with `emcmake`, builds
  static libraries, links `dist/libfive.wasm` plus ES6 glue with the locked flag
  table, prints the artifact's SHA-256, and runs the Node smoke and interval
  test suites. Failures exit non-zero; `--debug` builds the `-O0 -g4` flavor.
- Add `scripts/emcache.cmake` (CMake initial-cache overlay) plus the carried
  CMake patches it depends on: Emscripten host guards, static-library targets,
  injected Eigen/Boost include roots, no thread discovery, libpng through the
  Emscripten port.
- Add `wasm/shim.c` and `wasm/shim.h`: C ABI flattening for JS — out-pointer
  wrappers for struct returns (`eval_r`, `eval_d`), pointer-taking forms of
  struct-by-value arguments (`eval_f`, `render_mesh_st`, evaluator/vars),
  region/vec builders, mesh field accessors, and a 32-bit success out-parameter
  for `bool` results.
- Add `wasm/exports.txt` and document the frozen artifact ABI in `wasm/README.md`:
  the explicit export manifest (core C API + shim + `_malloc`/`_free`), with the
  C stdlib symbols appended from `libfive_stdlib.h` at build time.
- Add the software rounding policy for `boost::numeric::interval` (AD-015):
  a repo-owned Boost interval policy header (`wasm/include/libfive_wasm/
  interval_rounding.hpp`) using double-precision evaluation plus outward
  `nextafter` widening, selected by a carried patch in place of Boost's
  `fesetround`-based policies. No `fesetround`, no `__USE_ISOC99` shortcut.
- Add the single-threaded mesher patch: the worker-pool, dual-walk, object-pool
  and BRep merge call sites execute inline under Emscripten instead of spawning
  `std::async` tasks, so no pthread APIs are referenced by the artifact (AD-008,
  AD-014). Native builds keep upstream's async paths.
- Add Node test harnesses: `scripts/test-smoke.mjs` (build a sphere from raw
  exports, mesh it via `libfive_tree_render_mesh_st`, assert counts/indices,
  exported-symbol presence, string round-trip) and `scripts/test-interval.mjs`
  (AD-015 acceptance: `exp`, `sin`, division and mixed trees over wide regions
  must contain densely sampled values, and must not be uselessly wide).
- Update `.github/workflows/build-wasm.yml` to invoke the real build, cache
  vendor/dependency/build state, upload `dist/`, and report the wasm digest;
  `publish-npm.yml` keeps its contract (the build script it calls now exists).
- Update `vendor/libfive.lock` (`patches`, `patch_digest`) and
  `vendor/VENDOR.md` (expected tree digest) for the new carried patches.
- **Not in scope:** any JS/TS package source, loader, `Shape` API, stdlib
  wrappers, npm packaging, golden images, slices/pixels/file APIs, threads,
  SIMD, `--host=native`, or publishing.

**Decisions.** Implements AD-004 (plain C exports + shim + handwritten TS to
come), AD-008 (no threads/SIMD), AD-013 (Emscripten 3.1.64), AD-014 (single-
threaded meshing via `libfive_tree_render_mesh_st`), AD-015 (software interval
rounding with an acceptance test), AD-019 (`scripts/` + gitignored `dist/`) and
AD-020 (build artifact on every push). It **adds two ADRs** rather than editing
existing ones: **AD-022** for the artifact/export-surface mechanics (static
archives, inline single-worker meshing, explicit export manifest, frozen ABI for
the JS work) and **AD-023** for the concrete software-rounding implementation
(why Boost's `rounded_*_exact` policies do not satisfy AD-015, and the
double-evaluate + `nextafter` policy that does). Neither supersedes an Accepted
ADR; AD-022 implements AD-004/AD-008/AD-014, AD-023 implements AD-015.

## Capabilities

### New Capabilities

- `wasm-build-pipeline`: the reproducible build contract — single entry point,
  pinned toolchain enforcement, vendored-dependency readiness, artifact flags,
  export manifest and ABI surface, build flavors, digest reporting, smoke
  tests, and CI integration.
- `interval-rounding`: the software rounding guarantee for
  `boost::numeric::interval` under wasm — policy selection, absence of
  `fesetround` dependence, and the interval acceptance suite that fails on
  undersized intervals.

### Modified Capabilities

- `source-vendoring`: no requirement changes; this change only adds carried
  patches and updates the recorded patch/tree digests, which the existing
  requirements already cover.

## Impact

- **New files:** `scripts/build-wasm.sh`, `scripts/emcache.cmake`,
  `scripts/emvalidate.cmake`, `scripts/test-smoke.mjs`,
  `scripts/test-interval.mjs`, `scripts/lib/wasm-test-utils.mjs`,
  `wasm/shim.c`, `wasm/shim.h`, `wasm/exports.txt`, `wasm/README.md`,
  `wasm/include/libfive_wasm/interval_rounding.hpp`,
  `vendor/patches/0004-static-library-targets.patch`,
  `vendor/patches/0005-single-threaded-mesher.patch`,
  `vendor/patches/0006-software-interval-rounding.patch`.
- **Modified files:** `vendor/libfive.lock`, `vendor/VENDOR.md`,
  `.github/workflows/build-wasm.yml`, `docs/build-system.md`,
  `docs/architecture.md`, `docs/decisions.md`, `docs/roadmap.md`, `README.md`,
  `.gitignore` if new build scratch paths appear.
- **Build outputs (gitignored):** `build/wasm*/`, `dist/libfive.wasm`,
  `dist/libfive.js`.
- **Dependencies:** Emscripten 3.1.64, Node (for the test harnesses), the
  already-pinned libfive/Eigen/Boost inputs. No npm package dependencies.
- **Risk:** this is the first compilation of the pinned kernel. The known
  hazards — interval rounding, `std::async` in the mesher, shared-library
  targets, libpng via the port — are each addressed by a carried patch and
  covered by a test or link-time check; anything new surfaced during apply must
  be fixed in the vendored patch set, never by hand-editing `vendor/libfive`.
