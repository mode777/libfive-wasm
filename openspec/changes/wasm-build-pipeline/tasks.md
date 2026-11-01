# Tasks

## 1. Carried build patches and pin bookkeeping

- [x] 1.1 Add `vendor/patches/0004-static-library-targets.patch`: introduce a `LIBFIVE_LIBRARY_TYPE` cache variable (default `SHARED`) and use it for the `libfive` and `libfive-stdlib` targets, with an ADR header comment; verify it applies with `-F0`, that no unconditional `add_library(... SHARED ...)` remains, and that `scripts/vendor-libfive.sh --force` succeeds with the patch in the lock.
- [x] 1.2 Add `vendor/patches/0005-single-threaded-mesher.patch`: under `__EMSCRIPTEN__`, run the single-worker path inline at the four reachable `std::async` sites (`worker_pool.inl`, `dual.hpp`, `object_pool.inl`, `brep.hpp`) with an ADR header comment; verify it applies with `-F0` and that `grep -rn "std::async" vendor/libfive/libfive` shows each remaining occurrence inside a non-Emscripten branch.
- [x] 1.3 Add `vendor/patches/0006-software-interval-rounding.patch`: include the repo-owned interval header through `LIBFIVE_WASM_INCLUDE_DIR` and replace the interval alias's `save_state<rounded_transc_std<float>>` policy with the software policy, with an ADR header comment; verify it applies after `0004` and `0005`, that `vendor/libfive/libfive/include/libfive/eval/interval.hpp` no longer names `rounded_transc_std`, and that `interval.hpp` is the only kernel file using a Boost rounding policy.
- [x] 1.4 Update `vendor/libfive.lock` (`patches=`, recomputed `patch_digest`) and run `scripts/vendor-libfive.sh --force`; record the printed tree digest in `vendor/VENDOR.md`; verify `scripts/vendor-libfive.sh --check` and `scripts/fetch-deps.sh --check` both exit zero and editing one patch byte makes `--check` fail.

## 2. Software interval rounding (AD-015, AD-023)

- [x] 2.1 Add `wasm/include/libfive_wasm/interval_rounding.hpp` with `rounded_arith_soft<T>` and `rounded_transc_soft<T>` (double-precision evaluation plus outward `std::nextafterf` widening; no-op mode hooks; no fenv calls), keeping the header MPL-2.0-headed; verify it compiles in a scratch native translation unit that prints `exp`/`1/x`/`sqrt` bounds, shows outward widening on both sides, and that the header contains no `fesetround`/`fegetround` or non-no-op mode hook.
- [x] 2.2 Wire the header into the Emscripten configure path via `scripts/emcache.cmake` and patch `0006`; verify `emcmake cmake` succeeds, the kernel compiles with the software policy, and `grep -r "__USE_ISOC99" build/wasm` finds no compile definition introduced by us.
- [ ] 2.3 Add `scripts/test-interval.mjs` covering `exp` over `[0,1]`, `sin` over `[0,π]`, `1/x` over `[1,2]`, `1/x` across zero, `sqrt`/`log` across their domain edge, and a mixed `exp(sin(x)) + 1/(y+2)` tree, using dense sampling for containment and the tightness caps from the spec; verify it passes against the built artifact and that temporarily reverting the policy to `rounded_transc_std` makes it exit non-zero.

## 3. Shim, export manifest and ABI contract

- [x] 3.1 Add `wasm/shim.h` and `wasm/shim.c` implementing the shim table in design D6 (region/vec builders, `eval_f`/`eval_r`/`eval_d`, `get_const` with a 32-bit out-parameter, `render_mesh_st`, mesh accessors, evaluator/vars wrappers); verify it compiles as C against `vendor/libfive/libfive/include`, that every declared shim has a definition (`nm`), and that no vendored header is modified.
- [x] 3.2 Add `wasm/exports.txt` (core + shim + `_malloc`/`_free`, with comments) and `wasm/README.md` documenting pointer width, out-parameter conventions, mesh accessor lifetimes, deliberately absent entry points (`render_mesh`, `render_mesh_coords`, slices/pixels, save/load, git helpers), and the struct-by-value stdlib caveat; verify a scripted cross-check that every shim in `shim.h` and every design-listed core export appears in the manifest and no absent entry point does.
- [x] 3.3 Add the build-time stdlib symbol extraction (from `LIBFIVE_STDLIB` declarations in the vendored header) that appends `_<name>` entries to the link roots/export list; verify it emits every declared stdlib function (83 at the current pin), excludes `LIBFIVE_ALIAS` macros, and picks up a renamed function in a scratch header copy.

## 4. CMake overlay and build entry point

- [x] 4.1 Add `scripts/emcache.cmake` setting `CMAKE_BUILD_TYPE`, `LIBFIVE_LIBRARY_TYPE=STATIC`, tests/GUI/Guile/Python off, `-fexceptions`, flavor-specific optimisation/debug flags, and validation that `EIGEN_INCLUDE_DIRS`/`Boost_INCLUDE_DIRS`/`LIBFIVE_WASM_INCLUDE_DIR` are supplied; verify a configure on the verification server succeeds and that omitting an include root fails with a clear message.
- [ ] 4.2 Add `scripts/build-wasm.sh` stages: toolchain assertion (`emcc`/`emcmake`, version exactly 3.1.64, optional `LIBFIVE_EMSDK_ENV` sourcing), pinned-input preparation via `scripts/vendor-libfive.sh` + `scripts/fetch-deps.sh`, `emcmake cmake`, `cmake --build`, and failure propagation; verify a mismatched `emcc` is rejected with both versions named, a missing `vendor/libfive` triggers vendoring, and any failing stage exits non-zero.
- [x] 4.3 Implement the link step with the locked flag table, `wasm/shim.c`, the static archives, per-symbol `-Wl,--undefined` link roots generated from the manifest plus stdlib names, and the runtime methods the tests need; verify `dist/libfive.wasm` + `dist/libfive.js` are produced, the printed SHA-256 matches `sha256sum dist/libfive.wasm`, the module imports in Node, and `llvm-objdump`/`wasm-objdump` shows no pthread imports.
- [ ] 4.4 Implement `--debug` (`build/wasm-debug`, `-O0 -g4 -sASSERTIONS=2`, output under `dist/debug/`) and a local-only `--no-tests` switch that CI never uses; verify the debug build is distinguishable (size/debug info) and leaves `dist/libfive.wasm` untouched.
- [ ] 4.5 Evaluate `-flto` (adopt only if tests stay green and the artifact shrinks) and reject `--closure 1` for v1; record the measured size/digest outcome in the change and in `docs/build-system.md`; verify two clean release builds report the same digest and that the recorded decision matches the flags actually used.
- [x] 4.6 Add `scripts/test-smoke.mjs`: instantiate `dist/libfive.js` with `wasmBinary` read from disk, assert every manifest symbol is callable, call the flat stdlib `emptiness` function, build and evaluate a sphere tree from opcodes, mesh it through `shim_tree_render_mesh_st`, assert non-zero counts, in-range triangle indices and radius-consistent vertices, round-trip a printed tree, and free all objects; verify it passes against the fresh artifact and fails when run against a truncated/corrupt wasm.

## 5. CI integration

- [ ] 5.1 Replace the scaffold guard in `.github/workflows/build-wasm.yml` with an unconditional `bash scripts/build-wasm.sh`, add caching for `build/cache`, `build/deps` and `vendor/libfive` keyed on the lock/patch inputs, and append the wasm digest and artifact size to the job summary; verify the workflow YAML parses (`npx yaml-lint` or a syntax check), the cache keys change when a lock file changes, and a push/PR run is green with `dist/` uploaded.
- [ ] 5.2 Confirm `publish-npm.yml` is unchanged apart from its now-real build call: verify it still invokes `scripts/build-wasm.sh`, keeps the `package.json` gate before `npm publish`, and does not gain a second build path.

## 6. Documentation and ADR sync

- [ ] 6.1 Add **AD-022** to `docs/decisions.md` (wasm artifact and export-surface mechanics: static archives, explicit export manifest with per-symbol link roots, inline single-worker meshing under Emscripten, `_st`-only meshing, frozen core ABI), state that it implements AD-004/AD-008/AD-014/AD-019 without superseding anything, and add the status-table row; verify the ID was unused and no existing ADR text changed.
- [ ] 6.2 Add **AD-023** to `docs/decisions.md` (software interval rounding implementation: stock Boost policies verified insufficient, double-evaluate + outward-`nextafter` policy, acceptance suite, documented fallback), state that it implements AD-015 without superseding it, and add the status-table row; verify the ID was unused and AD-015's substance is untouched.
- [ ] 6.3 Update `docs/build-system.md` to match the implementation: pipeline stages, static library type, link roots/export manifest, shim, interval policy header, test harnesses, LTO/closure outcome, release/debug outputs, CI caching; verify every path, flag and command named there exists and runs as written.
- [ ] 6.4 Update `docs/architecture.md` with the realized `wasm/` file map (shim, export manifest, interval header) and the core-ABI surface-freeze note; verify it agrees with `wasm/README.md` and the manifest.
- [ ] 6.5 Update `README.md`'s development table (build and test entry points) and `docs/roadmap.md` item 2 status/done-when wording to what landed; verify the documented commands run as written and no other roadmap item changed.
- [ ] 6.6 Run `npx @fission-ai/openspec@latest validate --all --strict` and fix any findings in this change's artifacts.

## 7. Clean-room acceptance

- [ ] 7.1 On the verification server, from a clean checkout (`git clean -xdf`), run `source /opt/emsdk/emsdk_env.sh` then `scripts/build-wasm.sh`; verify vendor+deps are reproduced, the release build and both test suites pass, the printed digest equals a second clean run's digest (`--force` re-vendor), and `git status --porcelain` lists no generated outputs.
- [ ] 7.2 Verify the interval fault-injection acceptance: re-link with the hardware-rounded policy (temporarily, in a scratch tree), confirm `scripts/test-interval.mjs` fails on containment, then restore the software policy and confirm green; record the result in the change.
- [ ] 7.3 Confirm the two workflows are green on the pushed branch and that the uploaded `dist/libfive.wasm` digest matches the locally reported one.

## Workflow follow-up

- Review the plan with the maintainer; apply only after explicit approval.
- After implementation passes the acceptance checks, sync the spec deltas and archive the change per the OpenSpec workflow.
