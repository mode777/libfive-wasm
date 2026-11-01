# Tasks

## 1. Pin records and shared script helpers

- [x] 1.1 Add `scripts/lib/vendor-common.sh` with `die`, logging, SHA-256 verification, cached download (curl, `wget` fallback), and atomic extract-to-temp helpers; verify it sources cleanly under `bash -n` and that shellcheck (if available) reports no errors.
- [x] 1.2 Add `vendor/libfive.lock` recording repository URL, full commit `918387a9220dbac2f7ab32fb35e274c6794439cf`, commit date `2026-10-16`, archive URL, archive SHA-256 `05badee75864c8ad13807a4dea40339018db9cfb14f0fd61de0b691472c4e89e`, patch list with a combined digest; verify the file parses with the script's own `--check` metadata reader and that changing the commit line makes it fail.
- [x] 1.3 Add `vendor/LICENSE.mpl-2.0` with the canonical MPL-2.0 text and a provenance comment in `vendor/VENDOR.md`; verify `vendor/libfive/LICENSE` will match it byte-for-byte once vendoring runs.
- [x] 1.4 Add the `vendor/libfive` and `build/cache` entries to `.gitignore`; verify `git status` stays clean after a vendoring + fetch run.

## 2. Vendoring script

- [x] 2.1 Implement pin/consistency validation in `scripts/vendor-libfive.sh` (lock commit vs `VENDOR.md`, required fields, patch digest); verify it exits non-zero with a clear message when `VENDOR.md` names a different commit.
- [x] 2.2 Implement download + SHA-256 verification with `build/cache/libfive/` caching; verify a tampered cached archive (flip one byte) is rejected before extraction and no `vendor/libfive` is created.
- [x] 2.3 Implement extraction with the keep/deny list from design D4 (drop `studio/`, `libfive/bind/`, `libfive/test/`, `doc/`, `bin/`, `.github/`) and the absence guard; verify `vendor/libfive/studio`, `.../libfive/bind/guile`, `.../libfive/bind/python` are absent while `libfive/include/libfive.h` and `libfive/stdlib/libfive_stdlib.h` exist.
- [x] 2.4 Install `vendor/LICENSE.mpl-2.0` as `vendor/libfive/LICENSE` and verify it is byte-identical (`cmp`).
- [x] 2.5 Implement deterministic patch application (lexicographic order, `patch -p1 -F0` after a full `--dry-run`, no `.rej`/`.orig` left behind); verify all patches apply from the pinned tree and that a deliberately edited patch aborts with a non-zero exit and no partial tree.
- [x] 2.6 Implement the tree digest (sorted `sha256sum` listing) and print it on success; verify two clean `--force` runs print the same digest and that it matches the value recorded in `vendor/VENDOR.md`.
- [x] 2.7 Implement idempotence, `--force`, and `--check` modes; verify (a) a second plain run reports "already current" and rewrites nothing, (b) `--check` exits non-zero after a local file edit and leaves that edit untouched, (c) `--force` rebuilds successfully from the cached archive with networking disabled.
- [x] 2.8 Fill in `vendor/VENDOR.md` completely: pin, rationale for the commit, archive digest, expected tree digest, GPL-trim list, license/provenance note, and the pin bump procedure (update lock → re-vendor → update digest → note in change); verify its digest and commit match `vendor/libfive.lock`.

## 3. Carried build patches

- [x] 3.1 Write `vendor/patches/0001-emscripten-host-guards.patch` (skip `-march=native`, `Threads`/`-latomic`, pkg-config Guile discovery, non-required PNG under `EMSCRIPTEN`; default tests/Guile/Python/Studio off) with an ADR header comment; verify it applies with `-F0` and that `vendor/libfive/CMakeLists.txt` no longer probes Qt/Guile/Python unconditionally.
- [x] 3.2 Write `vendor/patches/0002-skip-optional-subdirectories.patch` (no recursion into `libfive/test`, `libfive/bind/*`, `studio`) with an ADR header comment; verify it applies after 0001 and that no `add_subdirectory(studio)`/`add_subdirectory(test)` remains reachable.
- [x] 3.3 Write `vendor/patches/0003-header-only-deps.patch` (honour pre-set `EIGEN_INCLUDE_DIRS`/`Boost_INCLUDE_DIRS`, allow non-system include roots, keep `png.h` resolution open for the Emscripten port) with an ADR header comment; verify it applies after 0002 and that the patched CMake has no unconditional `pkg_check_modules(EIGEN REQUIRED ...)`.
- [x] 3.4 Record the patch digest in `vendor/libfive.lock`; verify changing any patch byte makes `scripts/vendor-libfive.sh --check` fail, and that the three patches apply cleanly in a single clean-room run (`-F0`, no fuzz, no rejects).

## 4. Dependency pinning and fetching

- [x] 4.1 Add `scripts/deps.lock` with the documented TSV header and the Eigen 3.4.0 (`8586084f…`) and Boost 1.92.0 (`.tar.gz`, `e2a814b3…`) records, including extraction members; verify a file with a missing field is rejected by `scripts/fetch-deps.sh` with a non-zero exit.
- [x] 4.2 Implement `scripts/fetch-deps.sh` download + SHA-256 verification into `build/cache/`; verify a mutated archive is rejected before extraction and names the dependency.
- [x] 4.3 Implement header-only extraction to `build/deps/eigen` (`Eigen/`, `COPYING.MPL2`) and `build/deps/boost` (`boost/`, `LICENSE_1_0.txt`) exactly as `scripts/deps.lock` records; verify `build/deps/eigen/Eigen/Core` and `build/deps/boost/boost/numeric/interval.hpp` exist and that no Boost `libs/` tree is extracted.
- [x] 4.4 Implement idempotent re-runs plus `--check`; verify (a) a repeat run reports both dependencies current with no extraction, (b) `--check` exits non-zero after deleting `build/deps/boost/boost/numeric/interval.hpp` and names `boost`, (c) `--force` re-extracts both.
- [x] 4.5 Confirm the dependency downloads work with the container's tooling only (no `xz`, no emsdk, no compiler) by running `scripts/fetch-deps.sh --force` in a shell with `emcc`/`emcmake` absent from `PATH`; verify exit code 0 and both header trees present.

## 5. Repository integration

- [x] 5.1 Add a short note to `README.md`'s development/path table covering `scripts/vendor-libfive.sh`, `scripts/fetch-deps.sh`, and the generated `vendor/libfive` + `build/deps` trees; verify the documented commands run as written.
- [x] 5.2 Verify from a clean clone (`git clean -xdf` then the two scripts) that one run produces `vendor/libfive/` and `build/deps/`, the printed tree digest equals the `VENDOR.md` value, and `git status --porcelain` shows no generated outputs.
- [x] 5.3 Verify the vendored tree contains no `.git`, no `studio/`, and no Guile/Python binding sources with a single grep/find command documented in `vendor/VENDOR.md`; confirm the check exits non-zero when a denied path is reintroduced.
- [x] 5.4 Confirm both CI workflows are untouched and still pass their scaffold guards because `scripts/build-wasm.sh` remains absent (inspect the diff and the `if [ -f scripts/build-wasm.sh ]` branches).

## 6. Documentation and ADR sync

- [x] 6.1 Add **AD-021** to `docs/decisions.md`: generated/gitignored `vendor/libfive`, archive-digest pinning, GPL subtree removal, carried MPL-2.0 text (upstream has no root LICENSE), and the `deps.lock` model; state that it refines AD-016 without superseding it, add the row to the status table; verify no existing ADR text was altered and the ID is unused elsewhere.
- [x] 6.2 Update `docs/build-system.md`'s vendoring and dependency sections with the actual pin, trim list, license reality, Eigen/Boost pins, `.tar.gz` constraint, and remove the "deps.lock added by the build change" wording; verify every path/version named there exists as implemented.
- [x] 6.3 Update `docs/roadmap.md` item 1 status and its done-when wording to match what landed (digest-based reproducibility, gitignored tree); verify no other roadmap item changed.
- [x] 6.4 Run `npx @fission-ai/openspec@latest validate --all --strict` and fix any validation findings in this change's artifacts.

## Workflow follow-up

- Review the plan with the maintainer; apply only after explicit approval.
- Apply the change (implementation), then archive it once the acceptance checks pass and the specs are synced.
