# Spec Delta

## Purpose

Guarantees that the exact upstream source and third-party headers used to build
`libfive-wasm` can be recreated, verified, and refreshed deterministically from
checked-in pin records, without hand-modified source trees.

## ADDED Requirements

### Requirement: Pinned source record
The repository SHALL carry a checked-in, machine-readable pin record for
upstream `libfive/libfive` that names the source repository, the full commit
SHA, the commit date, the archive URL, the archive SHA-256, and the ordered
patch set. `vendor/VENDOR.md` SHALL record the same pin in human-readable form
together with the rationale for choosing that commit.

#### Scenario: Pin is complete and self-describing
- **WHEN** a maintainer reads `vendor/libfive.lock` and `vendor/VENDOR.md`
- **THEN** both identify commit `918387a9220dbac2f7ab32fb35e274c6794439cf`
  (upstream `master`, dated 2026-10-16) and its archive SHA-256, and VENDOR.md
  explains why this commit was chosen

#### Scenario: Pin mismatch is detectable
- **WHEN** the commit recorded in `vendor/VENDOR.md` differs from the commit in
  `vendor/libfive.lock`
- **THEN** the vendoring script exits non-zero and reports the inconsistency
  instead of vendoring either revision

### Requirement: Verified source acquisition
The vendoring entry point SHALL download the pinned upstream archive, verify
its SHA-256 against the pin record before extraction, and refuse to extract or
report success when the digest does not match.

#### Scenario: Archive digest matches
- **WHEN** `scripts/vendor-libfive.sh` runs with an empty `vendor/libfive/`
- **THEN** it downloads the pinned archive, verifies the digest, and leaves a
  source tree at `vendor/libfive/` at the pinned commit

#### Scenario: Tampered archive is rejected
- **WHEN** the fetched archive's SHA-256 does not match the pin record
- **THEN** the script exits non-zero, deletes or avoids the partial tree, and
  does not apply patches

#### Scenario: Download failure fails closed
- **WHEN** the archive cannot be downloaded and no cached archive exists
- **THEN** the script exits non-zero with a message identifying the failed
  download and does not create `vendor/libfive/`

### Requirement: Generated tree excluded from version control
`vendor/libfive/` SHALL be produced by the vendoring script and SHALL NOT be
committed; the pin record, the human-readable vendor note, the carried patches,
and the carried license text SHALL be committed. `build/deps/` and cached
archives SHALL likewise remain untracked.

#### Scenario: Clean checkout has no vendored source
- **WHEN** the repository is cloned and no scripts have run
- **THEN** `vendor/libfive/` and `build/deps/` are absent and
  `git status` is clean

#### Scenario: Generated outputs never appear in a commit
- **WHEN** `scripts/vendor-libfive.sh` and `scripts/fetch-deps.sh` have run
- **THEN** `git status` reports no pending changes under `vendor/libfive/`,
  `build/deps/`, or the archive cache

### Requirement: MPL-only vendored scope
The vendored tree SHALL contain only the MPL-2.0 portions of upstream (core C
library, C++ core, C stdlib, headers) and SHALL NOT contain `studio/`,
`libfive/bind/guile/`, or `libfive/bind/python/`. A verification step SHALL
fail when any excluded component is present.

#### Scenario: GPL subtrees are absent after vendoring
- **WHEN** vendoring completes
- **THEN** `vendor/libfive/studio`, `vendor/libfive/libfive/bind/guile`, and
  `vendor/libfive/libfive/bind/python` do not exist

#### Scenario: Scope check fails on a stray GPL tree
- **WHEN** an excluded GPL subtree is present in `vendor/libfive/` at check time
- **THEN** the script exits non-zero, names the offending path, and treats the
  tree as invalid

#### Scenario: Required stdlib and headers survive trimming
- **WHEN** vendoring completes
- **THEN** `vendor/libfive/libfive/include/libfive.h`,
  `vendor/libfive/libfive/include/libfive/`, and
  `vendor/libfive/libfive/stdlib/libfive_stdlib.h` are present

### Requirement: Deterministic patch application
The vendoring script SHALL apply `vendor/patches/*.patch` in lexicographic
filename order with strict patch matching, SHALL reject a patch that does not
apply cleanly, and SHALL NOT modify vendored files outside the patch set. Every
patch SHALL begin with a header comment stating what it changes and why (with
the ADR ID it serves).

#### Scenario: Full patch set applies cleanly
- **WHEN** the pinned tree has been extracted and patches are applied
- **THEN** every patch in `vendor/patches/` is reported as applied, in filename
  order, and the script exits zero

#### Scenario: Non-applying patch aborts the run
- **WHEN** a carried patch does not apply cleanly to the pinned tree
- **THEN** the script exits non-zero, reports which patch failed, and leaves no
  partially patched tree behind

#### Scenario: Patches are the only source of build adjustments
- **WHEN** the vendored tree is re-created from the pin
- **THEN** the result is identical to the previous run's tree digest, with no
  manual edits required

### Requirement: Vendored license and provenance
The vendored tree SHALL include the canonical MPL-2.0 license text at
`vendor/libfive/LICENSE`, sourced from a committed copy in the repository.
`vendor/VENDOR.md` SHALL state that upstream ships no root license file and
that MPL-2.0 scope was established from per-file license headers.

#### Scenario: License present in the vendored tree
- **WHEN** vendoring completes
- **THEN** `vendor/libfive/LICENSE` contains the MPL-2.0 text and matches the
  committed `vendor/LICENSE.mpl-2.0` byte-for-byte

#### Scenario: Provenance is documented
- **WHEN** a reviewer checks the license situation
- **THEN** `vendor/VENDOR.md` records that upstream has no root LICENSE file,
  how MPL-2.0 was determined, and where the carried text came from

### Requirement: Idempotent and offline-capable vendoring
Vendoring SHALL be repeatable: a second run against a valid tree SHALL make no
changes, `--force` SHALL rebuild the tree from the cached or refetched archive,
and `--check` SHALL validate the existing tree without writing. Once an archive
is cached, re-vendoring SHALL work without network access.

#### Scenario: Second run is a no-op
- **WHEN** `scripts/vendor-libfive.sh` runs twice without changes
- **THEN** the second run reports the tree as already current and exits zero
  without rewriting files

#### Scenario: Offline re-vendor succeeds from cache
- **WHEN** the pinned archive is cached and network access is unavailable
- **THEN** a `--force` run rebuilds the tree from the cached archive and exits
  zero

#### Scenario: Check mode reports drift without writing
- **WHEN** `scripts/vendor-libfive.sh --check` runs against a tree with a local
  modification
- **THEN** it exits non-zero and reports the drift, leaving the tree unchanged

### Requirement: Reproducible tree digest
The vendoring script SHALL compute and print a digest over the vendored tree
(relative paths plus file contents, sorted) so two independent clean runs can be
compared, and SHALL record the expected digest in `vendor/VENDOR.md`.

#### Scenario: Independent runs match
- **WHEN** two clean vendoring runs are performed from the same pin
- **THEN** both print the same tree digest and it equals the value recorded in
  `vendor/VENDOR.md`

### Requirement: Pinned dependency set
The repository SHALL carry `scripts/deps.lock` recording, for every third-party
dependency, the pinned version, download URL, SHA-256, and extraction target.
The initial set SHALL be Eigen 3.4.0 and Boost 1.92.0 headers.

#### Scenario: Dependency metadata is complete
- **WHEN** a maintainer reads `scripts/deps.lock`
- **THEN** Eigen 3.4.0 and Boost 1.92.0 are listed with their URLs, SHA-256
  digests, and extraction targets under `build/deps/`

#### Scenario: Missing lock entry fails the fetch
- **WHEN** a dependency is requested that has no entry in `scripts/deps.lock`
- **THEN** `scripts/fetch-deps.sh` exits non-zero and does not download anything

### Requirement: Verified dependency extraction
`scripts/fetch-deps.sh` SHALL verify each downloaded archive against its pinned
SHA-256 before extraction, SHALL extract header trees into
`build/deps/{eigen,boost}`, SHALL be idempotent, and SHALL support `--check` to
verify existing trees without writing.

#### Scenario: Dependencies fetched and verified
- **WHEN** `scripts/fetch-deps.sh` runs on a clean checkout
- **THEN** it downloads both pinned archives, verifies their digests, extracts
  them under `build/deps/`, and exits zero

#### Scenario: Checksum mismatch aborts extraction
- **WHEN** a downloaded dependency archive's SHA-256 does not match
  `scripts/deps.lock`
- **THEN** the script exits non-zero, names the dependency, and does not extract
  it

#### Scenario: Repeat run is a no-op
- **WHEN** `scripts/fetch-deps.sh` runs again with verified trees present
- **THEN** it reports them as current and exits zero without re-extracting

#### Scenario: Check mode detects a damaged tree
- **WHEN** `scripts/fetch-deps.sh --check` runs after a dependency header has
  been removed
- **THEN** it exits non-zero and names the dependency whose tree is incomplete

### Requirement: Toolchain-independent vendoring
Vendoring and dependency fetching SHALL NOT require the Emscripten toolchain,
CMake, or a C/C++ compiler; they SHALL be usable on the development container
and on the verification server before any build change lands.

#### Scenario: Vendoring without emsdk
- **WHEN** neither `emcc` nor `emcmake` is available on `PATH`
- **THEN** both `scripts/vendor-libfive.sh` and `scripts/fetch-deps.sh` still
  complete successfully

#### Scenario: CI stays green
- **WHEN** this change is pushed
- **THEN** both existing workflows still run successfully because
  `scripts/build-wasm.sh` remains absent and their scaffold guards keep
  no-oping
