# Design

## Context

See `proposal.md` — Why. Current state and the facts that shape the approach:

- The repo is a scaffold: no `scripts/`, `vendor/`, `package.json`, or source
  code; only `docs/`, `openspec/`, two CI workflows, README and AGENTS.md.
  `AGENTS.md` already marks `vendor/` and `scripts/` as planned.
- Upstream `libfive/libfive` publishes no usable release tags (only `rip-dmc`,
  `last-chance`). `master` HEAD at the time of writing is
  `918387a9220dbac2f7ab32fb35e274c6794439cf` (2026-10-16), which includes the
  Eigen 5 compatibility work and the Qt 6.11 fix.
- **Upstream ships no root `LICENSE` file** — licensing is asserted in per-file
  MPL-2.0 headers (e.g. `libfive/include/libfive/eval/interval.hpp`). AD-016's
  “LICENSE intact” therefore cannot be satisfied literally.
- The pinned tree has 377 entries; 125 live under `studio/`,
  `libfive/bind/guile/` or `libfive/bind/python/` (all GPL-2+ per AD-001).
- The core uses Boost **header-only** libraries: `numeric/interval`,
  `container/small_vector`, `container/static_vector`, `bimap`,
  `functional/hash`, `algorithm/string`, `lockfree/queue`, `lockfree/stack`.
  libpng appears in exactly one compile unit
  (`libfive/src/render/discrete/heightmap.cpp`).
- Upstream CMake requires pkg-config, `Threads`, and eagerly probes Qt, Guile,
  Python, Eigen and Boost; `libfive/CMakeLists.txt` refuses standalone
  configuration without `LIBFIVE_BUILD_FROM_ROOT` (satisfied when configuring
  from the vendored root).
- Container tooling: `curl`, `wget`, `sha256sum`, `patch`, `jq`, `git`, GNU/BusyBox
  `tar` — but **no `xz`**, so only `.tar.gz` archives are usable. No emsdk.
- Baseline conflict found while planning: `docs/build-system.md` says
  `scripts/deps.lock` is “added by the build change”, while `docs/roadmap.md`
  item 1 assigns `fetch-deps.sh` + `deps.lock` to this change. The roadmap wins;
  `build-system.md` is corrected in this change.

## Goals / Non-Goals

**Goals:**

- One command reproduces the patched upstream tree from a checked-in pin;
  another reproduces the pinned header dependencies — both fail closed.
- The generated trees are verifiably byte-identical between runs (tree digest)
  and are never committed.
- The vendored tree is legally and technically scoped to MPL-2.0 portions only.
- Pin data, carried patches, and license text are reviewable in the repo.
- The change is CI-neutral and requires no compiler.

**Non-Goals:**

- Compiling anything, adding `scripts/build-wasm.sh`, or touching CI workflows.
- The interval-rounding patch and its test suite (AD-015) — those arrive with
  the build change, against this pin and patch base.
- Narrowing Boost to a minimal hand-picked subset; the build change decides
  whether that is worth the maintenance cost.
- Automating pin bumps; the procedure is documented, the bump is a reviewed
  change.

## Decisions

### D1. Pin `master` HEAD `918387a…` as the vendored revision

Pin the full SHA `918387a9220dbac2f7ab32fb35e274c6794439cf` (committed
2026-10-16). Rationale: upstream has no release tags, so the newest `master`
commit is the only defensible “current” revision; it already contains the Eigen
5 and MSVC/Qt fixes that older commits lack; pinning the immediate precursor of
the build work minimises the delta the build change must cope with. The commit
is immutable, so later upstream movement cannot change what we vendor.
Alternative considered: pin a pre-Eigen-5 commit for conservatism — rejected
because it would require the build change to work around fixes upstream already
made. `vendor/VENDOR.md` records the rationale (AD-016 requires it in the
change that pins).

### D2. Fetch the commit archive, verify SHA-256, cache the bytes

Use `https://codeload.github.com/libfive/libfive/tar.gz/<sha>` (918,008 bytes,
SHA-256 `05badee75864c8ad13807a4dea40339018db9cfb14f0fd61de0b691472c4e89e`,
measured 2026-11-01) and record the digest in `vendor/libfive.lock`. The digest
is verified *before* extraction; mismatch is a hard failure that leaves no tree
behind. Archives are cached under `build/cache/libfive/` so re-vendoring works
offline.

Alternatives: `git clone` + checkout of the SHA (integrity via git object
hashing, but leaves `.git` to remove, needs a git server round-trip, and cannot
be cached as a single verifiable artifact) and a submodule (rejected: couples
the repo to upstream history size and contradicts AD-016's patches model).
GitHub may in principle regenerate archives; if it ever does, verification fails
loudly and the pin/digest pair must be updated deliberately — the desired
failure mode for a pinned supply chain.

### D3. Generated, gitignored tree + committed metadata

`vendor/libfive/` is produced by `scripts/vendor-libfive.sh` and gitignored;
`vendor/libfive.lock`, `vendor/VENDOR.md`, `vendor/patches/*.patch`,
`vendor/LICENSE.mpl-2.0` and `scripts/deps.lock` are committed. Rationale:
keeps the repo small, makes the pin the single source of truth, and proves
reproducibility with the tree digest rather than trusting committed bytes.
Trade-off: a fresh clone needs network (or a cache) before it can build; the
build change's job runs vendoring first anyway.

### D4. Remove GPL and non-build subtrees during vendoring

The script extracts into a temp directory and keeps only:

- `CMakeLists.txt`, `README.md`, `CHANGELOG.md` (provenance)
- `libfive/**` except `libfive/bind/` and `libfive/test/`

Dropped: `studio/`, `libfive/bind/guile/`, `libfive/bind/python/` (GPL-2+,
AD-001), `libfive/test/` (GTest suite, not built; `BUILD_TESTS` is off),
`doc/`, `bin/`, `.github/`. Removing rather than patching is deliberate: a
patch cannot reliably delete whole trees, and the absence is the strongest
guarantee that GPL code never enters a build. The keep/deny lists live in one
place in the script; a guard fails if any denied path survives, and if the
stdlib generator (AD-017) or the build change needs another file, the list is
edited in a reviewed change.

### D5. Three carried patches, applied strictly and in order

All patches are `.patch` files in `vendor/patches/`, applied with
`patch -p1 --batch --forward --no-backup-if-mismatch -F0` after a `--dry-run`
of the whole set; each file starts with a header naming the ADRs it serves
(AD-001, AD-008, AD-013, AD-014, AD-016).

1. `0001-emscripten-host-guards.patch` — under `EMSCRIPTEN`: skip the
   `-march=native` probe, skip `Threads`/`-latomic`, skip pkg-config-driven
   Guile discovery, make `PNG` discovery non-required (the Emscripten port
   supplies `png.h`), and default `BUILD_TESTS`/`BUILD_GUILE_BINDINGS`/
   `BUILD_PYTHON_BINDINGS`/`BUILD_STUDIO_APP` to `OFF`.
2. `0002-skip-optional-subdirectories.patch` — stop recursing into
   `libfive/test`, `libfive/bind/*` and `studio` so the trimmed tree
   configures; install rules are left untouched.
3. `0003-header-only-deps.patch` — accept pre-set `EIGEN_INCLUDE_DIRS` /
   `Boost_INCLUDE_DIRS` from the build overlay instead of requiring
   `pkg_check_modules(EIGEN ...)`/`find_package(Boost)`, and allow include
   discovery outside the system prefix (`CMAKE_FIND_ROOT_PATH_MODE_INCLUDE
   BOTH` behaviour where needed).

The interval rounding policy (AD-015) is **not** patched here: it is a build
behaviour, needs its test suite as acceptance, and lands with the build change
on top of this patch base.

### D6. Carry the MPL-2.0 text because upstream has none

`vendor/LICENSE.mpl-2.0` holds the canonical MPL-2.0 text; the script installs
it as `vendor/libfive/LICENSE`. `vendor/VENDOR.md` records that upstream has no
root license file, that the scope was established from per-file headers, and
where the text came from. Alternative: ship no license file and rely on
headers — rejected: the vendored source is redistributed inside the npm package
(AD-002/AD-012), so the license text must travel with it. Because this refines
AD-016's “LICENSE intact” wording, it is captured in a **new AD-021** rather
than by editing AD-016 (config rule: never silently change an existing ADR).

### D7. `scripts/deps.lock`: TSV pin table, header-only extraction, `.tar.gz` only

A line-oriented, tab-separated table (comment header documents the columns):
`id`, `version`, `url`, `sha256`, `dest`, `archive_root`, `members`. Bash reads
it with `while IFS=$'\t' read` — no `jq`/Node dependency for the fetch path.

Initial pins (digests verified 2026-11-01):

| id | version | archive | SHA-256 | extracted |
|---|---|---|---|---|
| `eigen` | 3.4.0 | `https://gitlab.com/libeigen/eigen/-/archive/3.4.0/eigen-3.4.0.tar.gz` (2,705,005 B) | `8586084f71f9bde545ee7fa6d00288b264a2b7ac3607b974e54d13e7162c1c72` | `Eigen/`, `COPYING.MPL2` → `build/deps/eigen` |
| `boost` | 1.92.0 | `https://github.com/boostorg/boost/releases/download/boost-1.92.0/boost-1.92.0-b2-nodocs.tar.gz` (73,484,649 B, b2-built archive with the merged `boost/` header tree) | `e2a814b3a158ab482c7a3d330f8bf5a7a8423d258a4e2fb396996e00fcee2111` | `boost/`, `LICENSE_1_0.txt` → `build/deps/boost` |

Eigen 3.4.0 rather than 5.0.1: 3.4.0 is the version the wasm PoC precedent used
and it needs no new alignment/constexpr behaviour from Emscripten 3.1.64;
libfive supports both (`eigen3>=3.2.92`), so raising the pin later is a
one-line lock change. Boost `.tar.gz` rather than `.tar.xz` because the dev
container has no `xz`; only `boost/` headers and the BSL-1.0 license are
extracted (all required Boost components are header-only, so no compiled libs
are fetched or built). Narrowing Boost to a transitive subset is deferred to
the build change, which can measure what actually compiles.

### D8. Script shape and failure semantics

`scripts/vendor-libfive.sh` and `scripts/fetch-deps.sh` are Bash with
`set -euo pipefail`, sharing small helpers in `scripts/lib/vendor-common.sh`
(logging, `die`, SHA-256 verification, download-with-cache, safe extraction).
Both support `--force` (recreate), `--check` (verify only, no network, no
writes) and default to incremental behaviour. Extraction happens into a sibling
temp directory and is atomically moved into place, so a failure never leaves a
half-built tree; `--check` validates the tree digest (vendored tree) or the
presence of expected headers (dependencies) and exits non-zero on drift.
The vendored tree digest is `sha256` of a sorted `sha256sum` listing
(`path` + content digest, no mtimes, no permissions), printed on success and
recorded in `vendor/VENDOR.md` so two clean runs can be compared.

### D9. No CI change in this change

`build-wasm.yml` and `publish-npm.yml` keep their missing-`scripts/build-wasm.sh`
guards, so both stay green. Continuously exercising the 73 MB Boost download
before a build exists would add cost without value; the build change invokes
vendoring and fetching via `scripts/build-wasm.sh` and becomes the place where
integrity is checked on every push. Until then, reproduction is verified locally
and on the verification server as the acceptance steps in `tasks.md`.

### D10. Documentation and ADR updates

Add **AD-021** (“Generated, digest-verified vendoring and dependency pinning”)
to `docs/decisions.md`, covering: generated/gitignored `vendor/libfive`,
archive-digest pinning, GPL subtree removal, carried MPL-2.0 text, and the
`deps.lock` model — with a note that it refines AD-016 without superseding it.
Update `docs/build-system.md` (vendoring section gains actual pin data and the
trim/license reality; dependency section records Eigen/Boost pins and the
`.tar.gz` constraint; removes the “deps.lock added by the build change”
wording), `docs/roadmap.md` (item 1 status), and the README development table.

## Risks / Trade-offs

- **Patches are not compiled here.** → Keep them minimal and structurally
  parallel to the Omniblox precedent; verify they apply with `-F0` and leave no
  `.rej`/`.orig`; the build change's smoke test is the semantic acceptance.
- **GitHub archive regeneration would break the digest.** → Fails closed with a
  clear message; the fix is a deliberate pin update recorded in VENDOR.md.
- **GPL tree removal might drop something a later change needs.** → Single
  keep/deny list, guard test, documented re-add path; `libfive_stdlib.h` and all
  headers are covered by a spec scenario.
- **Boost at 73 MB per fetch.** → Cached under `build/cache/`, reused by the
  build change's CI cache; header-only extraction keeps the working tree small.
- **Eigen 3.4.0 could be too old if libfive later requires 5.x.** → Pin bump is
  a lock + VENDOR.md edit; the pinned commit already tolerates both.
- **Vendoring not continuously verified until the build change.** → Accepted
  for one change; both scripts are exercised on the verification server, and
  `--check` exists for future CI wiring.
- **Legal ambiguity from upstream's missing LICENSE.** → Carried canonical text
  plus per-file headers documented in VENDOR.md and AD-021.

## Migration Plan

Greenfield additive change: no consumers, no on-disk state to migrate. Rollback
is deleting the new scripts/lock/patch/license files, reverting the doc/ADR
edits, and removing the `vendor/libfive` gitignore line; nothing else references
them until the build change lands. Re-running the scripts from a clean checkout
is always safe because outputs are generated and untracked.

## Open Questions

- Whether the Boost header tree can be narrowed to a small transitive subset —
  decided by the build change once it can measure the compile surface.
- Whether the Eigen pin should move to the 5.x line — deferred until the build
  change can verify Eigen 5 under Emscripten 3.1.64.
