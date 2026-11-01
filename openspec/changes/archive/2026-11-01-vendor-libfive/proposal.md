# Proposal

## Why

Nothing can be built until the exact upstream source and its header-only
dependencies exist locally at a pinned, verifiable revision. The repository is
currently a scaffold: no `vendor/`, no `scripts/`, no lock data. Every later
change (Emscripten build, shim, bindings, goldens) is reproducible only if it
starts from byte-identical sources. This change establishes that starting
point — the first roadmap item — and settles the mechanics AD-016 deliberately
left open.

## What Changes

- Add `vendor/libfive.lock`: machine-readable pin for upstream
  `libfive/libfive` — repository URL, full commit SHA, commit date, archive
  URL, archive SHA-256, and the ordered patch list with a digest. Pins
  commit `918387a9220dbac2f7ab32fb35e274c6794439cf` (upstream `master`, dated
  2026-10-16).
- Add `scripts/vendor-libfive.sh`: fetches the pinned archive, verifies its
  SHA-256, extracts it to `vendor/libfive` (no VCS metadata), removes the
  GPL-licensed subtrees (`studio/`, `libfive/bind/guile/`,
  `libfive/bind/python/`), installs the MPL-2.0 license text, applies
  `vendor/patches/*.patch` in sorted order, and prints a reproducible tree
  digest. Supports `--force`, `--check`, and an offline cache; exits non-zero
  on any verification failure.
- Add `vendor/VENDOR.md`: human-readable pin record — commit, date, rationale
  for choosing it, expected tree digest, license/provenance note, and the pin
  bump procedure.
- Add `vendor/patches/` carrying the build adjustments AD-016 requires,
  each with a header comment: disable `-march=native` under Emscripten, stop
  Qt/Guile/Python/Studio discovery and optional targets, stop the
  pkg-config/Threads requirement, make libpng satisfyable through the
  Emscripten port, and allow the vendored root to be configured without
  upstream's GNU-install/pkg-config assumptions.
- Add `vendor/LICENSE.mpl-2.0` and place it at `vendor/libfive/LICENSE` when
  vendoring. Upstream ships **no root LICENSE file** (licensing is per-file
  MPL-2.0 headers); the canonical text is carried here with a note recording
  how the MPL-2.0 scope was determined.
- Add `scripts/fetch-deps.sh` + `scripts/deps.lock`: pin and verify the two
  header-only dependencies — Eigen 3.4.0 and Boost 1.92.0 headers — extract
  them under `build/deps/{eigen,boost}` (gitignored), cache archives, support
  `--force`/`--check`, and fail non-zero on SHA-256 or download failure.
- Add a `.gitignore` entry for `vendor/libfive` so the generated tree is never
  committed; `vendor/VENDOR.md`, `vendor/libfive.lock`, `vendor/patches/`,
  and the license text are tracked.
- Update `docs/build-system.md` (vendoring/dependency section: the decisions
  this change settles, the upstream-has-no-LICENSE reality, actual pin data)
  and the roadmap status for item 1.
- **Not in scope:** compiling anything, `scripts/build-wasm.sh`, the interval
  rounding patch (AD-015, lands with the build change), CI workflow changes
  (the workflows keep no-oping), and any JS/TS code.

**Decisions.** Implements AD-016 (vendored pinned source + carried patches),
AD-019 (`scripts/` + gitignored outputs), and the MPL-only scope of AD-001;
conforms to AD-013 (no toolchain change) and AD-015 (the interval policy is
deferred to the build change, not pre-empted here). It does not alter or
reverse any Accepted ADR: AD-016 leaves the tree-committed-vs-generated choice
and the pin itself to this change. Because it records concrete mechanics
(generated/gitignored tree, archive-digest pinning, GPL subtree removal,
carried license text, dependency lock) it adds **AD-021** to
`docs/decisions.md` rather than editing AD-016's substance. AD-016's phrase
"LICENSE intact" is refined by AD-021: the MPL-2.0 text is carried by us
because upstream has no root license file.

## Capabilities

### New Capabilities

- `source-vendoring`: reproducible acquisition of the pinned libfive source and
  its pinned header-only dependencies — pin records, integrity verification,
  patch application, licensing/scope enforcement, idempotence, and failure
  behavior of the vendoring and dependency scripts.

### Modified Capabilities

(None — no existing specs exist yet.)

## Impact

- **New files:** `scripts/vendor-libfive.sh`, `scripts/fetch-deps.sh`,
  `scripts/deps.lock`, `vendor/libfive.lock`, `vendor/VENDOR.md`,
  `vendor/LICENSE.mpl-2.0`, `vendor/patches/*.patch`, plus a dependency
  manifest for the fetch script.
- **New local state (gitignored):** `vendor/libfive/`, `build/deps/`,
  `build/cache/` archives.
- **Docs:** `docs/build-system.md` (vendoring + dependencies sections),
  `docs/decisions.md` (new AD-021), `docs/roadmap.md` (item 1 status),
  `README.md` (Development table gains the vendoring entry points).
- **CI:** unchanged; `build-wasm.yml`/`publish-npm.yml` keep their
  missing-`scripts/build-wasm.sh` guards, so both stay green.
- **Dependencies:** upstream libfive commit, Eigen 3.4.0, Boost 1.92.0
  headers; no npm or toolchain dependencies added.
- **Risk:** the carried patches are verified to apply cleanly but not to
  compile here — semantic build validation is the next change's acceptance
  test. Recorded explicitly so it is not mistaken for a working build.
