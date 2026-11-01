# Build system design

How `vendor/` sources become the shippable `dist/`. Locked baseline; exact
versions and digests live in the checked-in `vendor/libfive.lock` and
`scripts/deps.lock`. Corresponding ADRs: AD-004, AD-008, AD-013–AD-021.

## Pipeline overview

```
scripts/vendor-libfive.sh
  vendor/libfive @ <pinned commit>   (+ vendor/patches/*.patch applied)

scripts/fetch-deps.sh
  build/deps/{eigen,boost}/          (pinned tarballs, SHA-256 verified)

scripts/gen-stdlib-ts.mjs
  vendor/…/libfive_stdlib.h  →  src/gen/stdlib.ts   (checked in)

scripts/build-wasm.sh            ← single entry point CI calls
  1. assert Emscripten 3.1.64; prepare/verify vendor + deps (scripts above)
  2. emcmake cmake -C scripts/emcache.cmake ...  →  static libfive archives
  3. emcc link: core + stdlib + wasm/shim.c  →  dist/libfive.wasm + ES6 glue
  4. node smoke + interval suites against the artifact (AD-015 acceptance)
  5. print the artifact SHA-256 and size
```

The TypeScript compile (`tsc build src/ → dist/index.js`) and the
single-file packaging of the API + glue land with the `npm-packaging`
change. From `js-package-core` on, the package sources (`src/`) are
typechecked (`npm run check`) and their test suite (`npm test`, vitest)
runs against the just-built artifact — locally and in CI
(`build-wasm.yml` installs dev dependencies and runs it after
`build-wasm.sh`).

`build-wasm.sh` is the contract both GitHub workflows already call; it must
remain executable with no arguments and exit non-zero on any failure.

## Vendoring (AD-016, AD-021)

- `vendor/libfive/` is **generated, never committed**:
  `scripts/vendor-libfive.sh` downloads the archive pinned in
  `vendor/libfive.lock` (upstream commit
  `918387a9220dbac2f7ab32fb35e274c6794439cf`, 2026-10-16; archive SHA-256
  `05badee75864c8ad13807a4dea40339018db9cfb14f0fd61de0b691472c4e89e`),
  verifies the digest before extraction, and trims it to the MPL-2.0 build
  subtree: `studio/`, `libfive/bind/guile/`, `libfive/bind/python/` (GPL-2+,
  AD-001) plus `libfive/test/`, `doc/`, `bin/`, `.github/` are removed. A scope
  guard fails if an excluded path survives.
- `vendor/VENDOR.md` records the pin, the commit rationale, the expected tree
  digest, the trim list, the license/provenance note, and the bump procedure.
- Upstream ships **no root `LICENSE` file** (MPL-2.0 is asserted per file), so
  the repository carries the canonical text in `vendor/LICENSE.mpl-2.0`; the
  script installs it as `vendor/libfive/LICENSE` (AD-021).
- Build adjustments are `.patch` files in `vendor/patches/`, applied in the
  order listed in the lock with `-F0` (no fuzz) after a dry run on a throwaway
  copy; `patch_digest` in the lock must match the patch bytes. The working tree
  is never hand-edited.
- The carried patch set (`0001`–`0006`):
  - `0001`–`0003`: Emscripten host guards, skipped optional subdirectories,
    and header-only dependency plumbing (as delivered by the vendoring change);
  - `0004`: static `libfive`/`libfive-stdlib` targets, selected through
    `LIBFIVE_LIBRARY_TYPE` (default `SHARED`, `STATIC` under the wasm overlay);
  - `0005`: single-worker mesher call sites run inline under `__EMSCRIPTEN__`
    (worker pool, dual walk, object pool, BRep merge), so no `std::async` or
    pthread API is compiled into the artifact;
  - `0006`: the software interval policy — include the repo-owned
    `libfive_wasm/interval_rounding.hpp` instead of Boost's aggregator (which
    hard-errors for wasm) and replace the `rounded_transc_std` alias with
    `rounded_transc_soft` (AD-015, AD-023).

## Dependencies

| Dep | Version | Why / source |
|---|---|---|
| Eigen 3 | 3.4.0 | libfive core (linear algebra); GitLab release archive, header-only, extracted to `build/deps/eigen` |
| Boost headers | 1.92.0 | `boost::numeric::interval` plus the other header-only Boost libraries the core uses (`container`, `bimap`, `functional/hash`, `algorithm/string`, `lockfree`); b2-built archive with the merged `boost/` tree, extracted to `build/deps/boost` |
| libpng | Emscripten port | `render/discrete/heightmap.cpp` include; linked with `-s USE_LIBPNG=1`, nothing downloaded |
| Emscripten | 3.1.64 | toolchain, pinned everywhere (AD-013) |

`scripts/deps.lock` (added by the vendoring change) records version, URL,
SHA-256, extraction target, archive members and a sentinel file per
dependency. `scripts/fetch-deps.sh` verifies the digest before extraction,
caches archives under `build/cache/deps/`, extracts only the header trees, and
supports `--check` (verify with the sentinels, write nothing) and `--force`.
Only `.tar.gz` archives are used: the development container has no `xz`. CI
caches `build/` between runs.

### Interval correctness requirement (AD-015, AD-023)

Non-negotiable: the build must not rely on `fesetround`-based rounding
(wasm has no FP rounding-mode control; Emscripten's fenv is stubbed). The build
delivers:

1. `wasm/include/libfive_wasm/interval_rounding.hpp` — includes the
   Boost.Numeric.Interval components **without** `hw_rounding.hpp` (Boost 1.92's
   wasm platform config defines `BOOST_NO_FENV_H`, which makes that header a
   hard error) and defines `rounded_arith_soft`/`rounded_transc_soft`, which
   evaluate in double precision and widen every result outward with
   `std::nextafter`. The mode hooks are no-ops and no fenv routine is
   referenced. `rounded_*_exact` is not an option: it returns unrounded results
   in both directions.
2. An **interval test suite** (`scripts/test-interval.mjs`) run by
   `scripts/build-wasm.sh` against the built artifact: `exp`, `sin`,
   reciprocal/division (including division across zero), `sqrt`/`log` across
   their domain edges, and a mixed tree over wide regions. Containment is
   checked against dense sampling; tightness caps (for example `exp` width
   below 1.75) fail policies that are conservative only by collapsing to
   uselessly wide bounds. Undersized intervals fail containment, which is the
   acceptance gate for the policy.

## Emscripten configuration (target flags)

| Flag | Value | Reason |
|---|---|---|
| `-s MODULARIZE=1 -s EXPORT_ES6=1 -s EXPORT_NAME=createLibfiveModule` | | ES6 factory as the loader seam (AD-007, AD-022) |
| `-s ENVIRONMENT=web,node,worker` | | one artifact, three runtimes; no extra env code |
| `-s ALLOW_MEMORY_GROWTH=1` | | meshes vary wildly in size |
| `-s INITIAL_MEMORY=64MB`, `MAXIMUM_MEMORY=2GB` | | growth-friendly start without committing it all |
| `-s EXPORTED_FUNCTIONS=@<generated list>` | manifest + parsed stdlib names | explicit surface; dead-code elimination for the rest |
| `-Wl,--undefined=<each export>` | | pulls defining archive members in; avoids `--whole-archive` |
| `-s EXPORTED_RUNTIME_METHODS=…` | heap views, UTF-8 helpers, `getValue`/`setValue` | the raw API and tests need them |
| `-s FILESYSTEM=0` | | no file APIs in v1 (AD-018); smaller binary |
| `-fexceptions` | | keep C++ error paths intact (portable JS-based EH) |
| `-s USE_LIBPNG=1` | | satisfy heightmap.cpp includes via Emscripten port |
| `--no-entry` | | library, not a program |
| `-O3` (release), `-O0 -g4 -s ASSERTIONS=2` (debug) | | two flavors; CI builds release |
| `-flto` | adopted for release; omitted for debug | measured 1,070,253 → 1,046,998 bytes (~2.2%) with both suites green |
| `--closure 1` | rejected for v1 | adds a Java/Closure dependency and obscures the ES6 glue the loader work must debug |

No `-pthread`, no SIMD in v1 (AD-008). The carried mesher patch makes the
single-worker path execute inline, so the artifact references no pthread API.
Meshing always uses `libfive_tree_render_mesh_st` (AD-014); only that entry point
is exported.

Determinism: pinned toolchain + pinned deps + explicit export list; CI prints
the SHA-256 and size of `dist/libfive.wasm` on every build so drift is visible.
Byte-identical rebuilds are a goal, verified opportunistically, not a hard
guarantee (Emscripten embeds no timestamps by default).

## CMake strategy

Upstream's root `CMakeLists.txt` hardcodes `-march=native` and requires
Qt/PNG/pkg-config discovery, and `libfive/CMakeLists.txt` refuses to be
configured standalone (`LIBFIVE_BUILD_FROM_ROOT` check). Therefore:

- We configure **from the vendored root** (`emcmake cmake vendor/libfive`)
  with a CMake **initial-cache overlay** we own (`scripts/emcache.cmake`)
  that fixes the build shape (static archives, threads off, Qt/Guile/Python/
  tests off, `-fexceptions`, `-s USE_LIBPNG=1`) and a post-`project()`
  companion (`scripts/emvalidate.cmake`, included via `CMAKE_PROJECT_INCLUDE`)
  that validates the injected include roots and applies debug flags. CMake
  processes the initial cache before `-D`, so validation cannot live there.
- The build script injects the pinned paths:
  `EIGEN_INCLUDE_DIRS=build/deps/eigen`, `Boost_INCLUDE_DIRS=build/deps/boost`
  and `LIBFIVE_WASM_INCLUDE_DIR=wasm/include` (the interval policy header).
- The patches in `vendor/patches/` keep upstream's own logic minimal and
  reviewable against the Omniblox precedent.
- `libfive` and `libfive-stdlib` build as static archives
  (`LIBFIVE_LIBRARY_TYPE=STATIC`); linking our `wasm/shim.c` and emitting
  `dist/libfive.wasm` is done by `emcc` directly from `build-wasm.sh` (not by
  CMake install rules). The link roots are generated from `wasm/exports.txt`
  plus the stdlib symbols parsed out of `libfive_stdlib.h`.

## Build flavors and the verification server

- Local/CI both use Emscripten 3.1.64; `build-wasm.sh` refuses any other
  version. Local (toolbox) has no emsdk; builds run on the **SSH verification
  server** (`source /opt/emsdk/emsdk_env.sh`, or set `LIBFIVE_EMSDK_ENV`), which
  also performs any future golden captures (Node + chrome-headless-shell with
  llvmpipe/SwiftShader).
- `build-wasm.sh` defaults to the release flavor in `dist/`; `--debug`
  produces `-O0 -g4 -s ASSERTIONS=2` output under `dist/debug/` and never
  overwrites the release artifact. `--no-tests` exists for local iteration and
  is not used by CI.
- Every successful build prints the wasm SHA-256 and byte size. Two clean
  builds from the same inputs and toolchain are expected to report the same
  digest.
- The build runs two Node suites against the just-linked artifact:
  `scripts/test-smoke.mjs` (raw exports → sphere tree → mesh → counts,
  indices, radius sanity, string round-trip, export-table presence) and
  `scripts/test-interval.mjs` (the AD-015 acceptance suite). Both instantiate
  the ES6 factory with `wasmBinary`, so they do not depend on glue path
  resolution. The package's own vitest suite (`npm test`: loader option
  handling, raw-namespace manifest parity, kernel flows) runs against the
  same artifact after the build, locally and in CI.
- `build-wasm.sh --host=native` remains a planned convenience for the golden
  test workflow; it is not implemented in this change.
- CI (`build-wasm.yml`) caches `build/cache`, `build/deps` and
  `vendor/libfive` keyed on `vendor/libfive.lock`, `vendor/patches/*` and
  `scripts/deps.lock`, then runs the script, reports the digest/size in the
  job summary and uploads `dist/`.

## Golden-image / mesh verification

- Canonical scenes (sphere, gyroid, blended union) are meshed in Node from
  the built package; vertex/triangle counts plus a hash of first-N vertices
  are compared against checked-in goldens.
- Goldens are (re)captured on the verification server when the vendor pin
  or interval policy changes, never edited by hand.
