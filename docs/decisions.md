# Design decisions (ADR log)

This file is the authoritative record of architecture and design decisions for
`libfive-wasm`. Every OpenSpec change that touches the build, bindings, API, or
packaging **must conform to the decisions recorded here**. Changing a decision
requires editing this file in the same change, with rationale.

Maintenance is enforced through `openspec/config.yaml`: artifact rules require
ADR updates inside the change that makes a decision, and apply/archive
guidance verifies the ADR log and specs stay consistent with each other.

Status legend: **Accepted** (locked, in force) · Proposed · Superseded by AD-xxx

Decisions marked 🔒 were explicitly locked with the maintainer on
**2026-11-01**; the rest are inherited from the project constraints
(AGENTS.md) or follow directly from locked ones.

| ID | Decision | Status |
|---|---|---|
| AD-001 | Port only the MPL-2.0 portions of libfive (C API + C stdlib) | Accepted (constraint) |
| AD-002 | One npm package: `.wasm` + convenience JS/TS API + types | Accepted 🔒 |
| AD-003 | Convenience API: `Shape` class with chainable methods, modeled on the Python bindings | Accepted 🔒 |
| AD-004 | Binding layer: plain C exports + handwritten TypeScript (+ tiny C ABI shim); no Embind / WebIDL | Accepted 🔒 |
| AD-005 | Memory: explicit `free()` backed by a `FinalizationRegistry` safety net | Accepted 🔒 |
| AD-006 | Mesh results: zero-copy views valid until `mesh.free()`, with live re-binding getters | Accepted 🔒 |
| AD-007 | ESM-only package, separate `.wasm` file, async `init()` factory | Accepted 🔒 |
| AD-008 | Portable wasm baseline: no threads, no SIMD | Accepted 🔒 |
| AD-009 | v1 meshing is synchronous on the caller's thread | Accepted 🔒 |
| AD-010 | camelCase naming for the JS/TS API | Accepted 🔒 |
| AD-011 | Raw C bindings exposed publicly as an advanced namespace | Accepted 🔒 |
| AD-012 | Repository glue licensed MPL-2.0 (supersedes "MIT intended" in early README) | Accepted 🔒 |
| AD-013 | Emscripten 3.1.64, identical in CI and locally | Accepted (constraint) |
| AD-014 | Single-threaded kernel: always use `libfive_tree_render_mesh_st` | Accepted (constraint) |
| AD-015 | `boost::numeric::interval` must run with software rounding under wasm | Accepted (constraint) |
| AD-016 | libfive vendored at a pinned commit under `vendor/`, carried patches in `vendor/patches/` | Accepted (constraint) |
| AD-017 | stdlib TS wrappers generated from `libfive_stdlib.h` markers | Accepted |
| AD-018 | STL export implemented in TypeScript, not via C file APIs | Accepted |
| AD-019 | Build logic in `scripts/`, artifacts in `dist/` (gitignored) | Accepted (constraint) |
| AD-020 | CI: build artifact on every push; publish to npm on `v*` tags via trusted publishing | Accepted (constraint) |
| AD-021 | Generated, digest-verified vendoring and pinned header dependencies | Accepted |
| AD-022 | Wasm artifact mechanics: static archives, explicit export manifest with per-symbol link roots, inline single-worker meshing, `_st`-only meshing, frozen core ABI | Accepted |
| AD-023 | Software interval rounding implementation: fenv-free Boost interval inclusion plus a double-evaluate/outward-`nextafter` policy, gated by an interval acceptance suite | Accepted |
| AD-024 | Generated flat C stdlib shims from the same header parser as the TypeScript surface, checked in and drift-checked by the build | Accepted |
| AD-025 | Golden mesh verification: public-API canonical scenes, exact count + float32-prefix hash goldens, capture-only workflow, one-ulp fault injection | Accepted |
| AD-026 | Package artifact: one bundled ESM entry with the inlined Emscripten factory, declarations beside it, and tarball consumer verification | Accepted |
| AD-027 | Release procedure: changelog + version/tag gate, trusted-publishing prerequisite, post-publish registry/attestation and clean-install verification | Accepted |
| AD-028 | Showcase site: a separate, non-published Vite app built from the locally linked package and deployed from the tested wasm artifact to GitHub Pages | Accepted |
| AD-029 | User documentation: a docs section inside the showcase app (guides + TypeDoc-generated API reference through one markdown pipeline), tooling in `site/`, deployed with the showcase | Accepted |
| AD-030 | Method-level demo coverage: every canonical convenience-surface method must appear as a real call site in some showcase demo, enforced in CI by source matching over the generated stdlib table | Accepted |

---

## AD-001 — MPL-2.0 scope only {#ad-001}

**Context.** Upstream libfive mixes MPL-2.0 (core C library, C stdlib) and
GPL-2+ (Guile bindings, Python bindings, Studio).

**Decision.** Vendor and build only `libfive.h` (the C API) and
`libfive/stdlib` (the C stdlib). Never vendor, build, or link
`libfive-guile`, `bind/python`, or `studio`.

**Consequences.** The C API is functionally complete for tree building and
meshing; nothing user-visible is lost for the JS port. The Python bindings
serve as API design inspiration only (AD-003) — none of their code is
copied into this repository.

## AD-002 — One npm package {#ad-002}

**Context.** The deliverable could be split (e.g. `libfive-wasm-core` +
`libfive-wasm`), or shipped as a bare `.wasm` with docs telling users to write
their own glue.

**Decision.** Ship a single package, `libfive-wasm`, containing the compiled
kernel (`libfive.wasm`), the Emscripten ES6 module factory, the convenience
API (AD-003), the raw bindings (AD-011), and TypeScript types. It works in
Node.js and browsers from the same entry point.

**Consequences.** One install, one import, one version number. Internal
restructuring is invisible to consumers. Package size is the full cost of
entry (~1–2 MB wasm expected).

## AD-003 — `Shape` class + methods, modeled on the Python bindings {#ad-003}

**Context.** libfive's Python bindings (`libfive/bind/python`, MPL-2.0) wrap
the C API in a `Shape` class: raw tree pointers wrapped in `__init__`,
`__del__` frees, arithmetic operators build trees, `Shape.X()/Y()/Z()` give
free coordinates, and a generated `stdlib` module exposes `sphere`, `box`, …
JS has no operator overloading.

**Decision.** The convenience API is a `Shape` class with chainable methods:
`shape.union(b)`, `shape.blend(b, m)`, `shape.mul(2)`, `shape.rotateZ(a)`,
plus top-level stdlib functions (`sphere`, `box`, `torus`, …) and coordinate
shapes `libfive.x() / y() / z()`. Every argument slot that accepts a shape
also accepts a plain number (auto-wrapped as a constant tree), mirroring
Python's `Shape.wrap`. No functional-style parallel API is shipped.

**Consequences.** Closest possible feel to the Python bindings; single
canonical way to do everything; methods autodiscover via TypeScript. See
`api-design.md` for the full surface.

## AD-004 — Plain C exports + handwritten TypeScript {#ad-004}

**Context.** Options: (a) compile the C API as plain wasm exports and write
the convenience layer in TS (exactly how the Python bindings sit on ctypes);
(b) Embind C++ classes; (c) WebIDL binder. Embind/WebIDL pull in C++ RTTI and
exception runtime weight and fight against an idiomatic JS API.

**Decision.** (a). The wasm module exports the libfive C API plus a minimal
`wasm/shim.c` that flattens C-ABI pain points (small-struct returns become
out-pointers; struct-construction helpers). All convenience logic is
handwritten TypeScript in `src/`.

**Consequences.** Smallest binary, no RTTI, full control of lifetimes and
errors, one language for all API logic. Cost: we own the marshalling layer
(`src/ffi/`), which is small and stable because the C API is small.

## AD-005 — Explicit `free()` + GC safety net {#ad-005}

**Context.** Trees, meshes, strings, evaluators live in the non-GC'd wasm
heap. Python relies on refcount finalizers alone; in JS, GC-driven frees can
let the wasm heap balloon during bursts of tree building.

**Decision.** Every wasm-backed object (`Shape`, `Mesh`, evaluator) exposes an
explicit, idempotent `free()`. A `FinalizationRegistry` frees anything the
caller forgot. `init({ debug: true })` logs a warning whenever the registry —
not `free()` — releases an object.

**Consequences.** Predictable memory for long sessions; ergonomic for
scripts (you may never call `free()` and it still works). Document that
relying on the registry is a performance fallback, not the recommended path.

## AD-006 — Mesh views valid until `mesh.free()` {#ad-006}

**Context.** `libfive_mesh` is `{ vec3* verts; tri* tris; counts }` — raw
pointers into wasm memory, so zero-copy views are natural. Caveat: with
`ALLOW_MEMORY_GROWTH`, the wasm heap can move (new `ArrayBuffer`), detaching
previously created views even while the mesh is alive.

**Decision.** A `Mesh` stores pointers + counts; `mesh.verts` / `mesh.tris`
are **getters that create a fresh view against the current wasm memory on
every access** (cheap — no data copy). Views are valid until `mesh.free()`;
after `free()` they throw. `copyVerts()` / `copyTris()` return JS-owned
ArrayBuffers for data that must outlive the mesh (or the session).

**Consequences.** Zero-copy satisfies the project constraint and survives
heap growth. Rule for users is one sentence: *“the data lives as long as the
`Mesh` object; copy it if you need it forever.”*

## AD-007 — ESM-only, async `init()` {#ad-007}

**Context.** Node LTS and all modern browsers run ESM natively; dual
CJS/ESM doubles the build and test matrix for a shrinking audience.

**Decision.** `package.json` is `"type": "module"` with a single `"."`
export. The package ships a separate `libfive.wasm`. The entry point is
`init(options?): Promise<Libfive>` which instantiates the Emscripten ES6
module factory; the default wasm locator uses
`new URL('./libfive.wasm', import.meta.url)`, which resolves natively in
browsers, Node, and all major bundlers. `options.wasmBinary` allows callers
to supply the bytes themselves.

**Consequences.** One code path, top-level-await friendly. CJS consumers can
`await import('libfive-wasm')`. Bundler guidance lives in `packaging.md`.

## AD-008 — Portable wasm baseline {#ad-008}

**Decision.** v1 builds with no threads and no SIMD: the artifact runs
wherever WebAssembly runs, including older mobile Safari. A SIMD variant is a
possible later add-on (as a separate artifact chosen at `init()`), never a
replacement.

**Consequences.** Interval arithmetic is software-rounded anyway (AD-015),
so SIMD upside is partial; portability wins.

## AD-009 — Synchronous meshing in v1 {#ad-009}

**Decision.** `shape.mesh(...)` executes the (single-threaded) mesher
synchronously on the caller's thread — it's a wasm call, so it blocks the JS
thread for its duration. The docs ship a Worker recipe (run the whole
`init()` + mesh in a worker); real threading (pthreads, libfive's worker
pools) is a separate later change per the project constraints.

**Consequences.** Simple, correct v1 with no bundler-specific worker wiring
in the package. Interactive apps are told to mesh off the main thread.

## AD-010 — camelCase naming {#ad-010}

**Decision.** Public API uses camelCase: `blendDifference`, `loftBetween`,
`arrayPolarZ`, `rotateZ`. Upstream aliases survive as camelCase aliases
(`box`, `cylinder`, `torus`, `rotate`, …). The raw namespace keeps C names
(`libfive_tree_render_mesh_st`) verbatim.

**Consequences.** Idiomatic TS. Porting Guile/Python examples means renaming;
the mapping is mechanical and documented in `api-design.md`.

## AD-011 — Raw bindings exposed {#ad-011}

**Decision.** The package exports the underlying C API surface as
`libfive.raw` (typed): every exported `libfive_*` function plus the shim
helpers, documented as an advanced escape hatch beneath the `Shape` layer.

**Consequences.** Power users and future wrappers aren't blocked by gaps in
the convenience API. It becomes part of the semver surface; changes there are
rare because the C API is stable upstream.

## AD-012 — MPL-2.0 for repository glue {#ad-012}

**Decision.** This repository's own code (TS bindings, build scripts, docs)
is MPL-2.0, matching upstream. Vendored libfive retains its MPL-2.0 license
file. (Supersedes the README's earlier “MIT intended”.)

**Consequences.** One license story across the repo; file-level copyleft is
compatible with use from any project.

## AD-013 — Emscripten 3.1.64, pinned {#ad-013}

**Decision.** CI (`mymindstorm/setup-emsdk@v14`), the local build scripts,
and the verification server all use exactly 3.1.64.

## AD-014 — Single-threaded kernel {#ad-014}

**Decision.** The build compiles libfive without threads
(`LIBFIVE_FIND_PKG_THREADS=0`-equivalent configuration); all meshing goes
through `libfive_tree_render_mesh_st`, which upstream provides explicitly to
force single-threaded meshing “to play nicely with FFI”. Worker-pool sources
compile but never execute.

## AD-015 — Software interval rounding {#ad-015}

**Decision.** The vendored build must configure
`boost::numeric::interval` with a **software** rounding policy: all interval
arithmetic is widened using epsilon/`nextafter`-style guards, never by
changing FP rounding modes. Rationale: wasm has no rounding-mode control and
`fesetround` is a no-op stub under Emscripten — auto-detected or
`fesetround`-based policies (including the Omniblox PoC's `__USE_ISOC99`
trick) can silently produce too-narrow intervals, which surface as mesh
artifacts on adversarial trees. Enforcement: the build change must (a) pin
the policy via a carried patch/header, and (b) add an interval test suite
(evaluations of `exp`, `sin`, division, etc. over wide regions checked
against conservative bounds) that fails on undersized intervals.

## AD-016 — Vendored, pinned libfive {#ad-016}

**Decision.** `vendor/libfive` holds upstream at a pinned commit (recorded
with rationale in the change that pins it), LICENSE intact. Any required
build adjustments live as `.patch` files under `vendor/patches/`, applied by
`scripts/vendor-libfive.sh` — the vendored tree is never hand-edited.

## AD-017 — Generated stdlib wrappers {#ad-017}

**Decision.** The TypeScript stdlib surface (AD-003's top-level functions) is
**generated** from `libfive/stdlib/libfive_stdlib.h` by
`scripts/gen-stdlib-ts.mjs`, which parses the same `LIBFIVE_STDLIB` /
`LIBFIVE_ALIAS` / `LIBFIVE_SECTION` markers (and doc comments) that
upstream's own `gen_c.py` / `gen_py.py` generators consume. Output is checked
in (`src/gen/stdlib.ts`) and regenerated on vendor pin bumps. camelCase
mapping and optional-argument defaults (`__0` / `__1` suffixes) are applied
by the generator.

**Consequences.** Full stdlib coverage on day one, docs comments included,
and pin bumps pick up new stdlib functions mechanically.

## AD-018 — STL export in TypeScript {#ad-018}

**Decision.** The C API's file-based savers (`libfive_tree_save_mesh` etc.)
are unusable without a real filesystem; instead the package provides
`exportSTL(mesh): ArrayBuffer` implemented in TS from the mesh views.

## AD-019 — `scripts/` + `dist/` layout {#ad-019}

**Decision.** All build logic lives in `scripts/`; outputs land in `dist/`,
which is gitignored and never committed.

## AD-020 — CI and publishing {#ad-020}

**Decision.** `build-wasm.yml` runs `scripts/build-wasm.sh` on every push/PR
and uploads `dist/`. `publish-npm.yml` builds and publishes to npm on `v*`
tags using npm trusted publishing (OIDC, no token secret) with provenance;
the workflows already in the repo are the contract.

## AD-021 — Generated, digest-verified vendoring and dependency pinning {#ad-021}

**Context.** AD-016 requires a pinned upstream tree with carried patches, but
leaves the mechanics open: committed versus generated tree, which archive to
pin, how the header-only dependencies are acquired, and how to license a tree
whose upstream repository has no root `LICENSE` file. Upstream libfive indeed
ships no root license file — MPL-2.0 is asserted in per-file headers.

**Decision.** `scripts/vendor-libfive.sh` recreates `vendor/libfive` from the
archive recorded in `vendor/libfive.lock` (commit
`918387a9220dbac2f7ab32fb35e274c6794439cf`, archive SHA-256 verified before
extraction), trims the GPL-2+ and non-build subtrees, installs the carried
MPL-2.0 text as `vendor/libfive/LICENSE`, and applies `vendor/patches/*.patch`
in lock order with `-F0` after a dry run on a throwaway copy. The tree is
generated and gitignored; `vendor/VENDOR.md`, the lock file, the patches and
the license text are committed, and `vendor/VENDOR.md` records the expected
tree digest. `scripts/fetch-deps.sh` + `scripts/deps.lock` pin the header-only
Eigen 3.4.0 and Boost 1.92.0 trees with SHA-256 verification into
`build/deps/`. Both scripts fail closed, are idempotent, cache downloads under
`build/`, and expose `--check` (verify, write nothing) and `--force`.

**Consequences.** Reproducibility is proven by comparing the printed tree
digest with the recorded one instead of committing source, so the repository
stays small and pin bumps are explicit review events. A fresh checkout (and CI)
needs network or the archive cache before it can build. Because upstream has no
root license file, the MPL-2.0 text is carried by this repository and travels
with the vendored tree into the npm package; this refines AD-016's "LICENSE
intact" wording without superseding AD-016.

## AD-022 — Wasm artifact mechanics and frozen export surface {#ad-022}

**Context.** AD-004 fixes the binding model (plain C exports plus a tiny shim)
and AD-014 fixes single-threaded meshing, but the pinned upstream build is not
directly usable as a wasm artifact: both library targets are declared `SHARED`
(Emscripten has no general shared-library model without side modules), the
mesher spawns `std::async` tasks even with one worker, and JavaScript cannot
call struct-by-value/struct-return C signatures. The JavaScript work also needs
a stable, reviewable surface to bind to.

**Decision.** The wasm build compiles `libfive` and `libfive-stdlib` as static
archives selected by a cache variable, and links them with `wasm/shim.c` into
one `dist/libfive.wasm` plus ES6 glue. Under `__EMSCRIPTEN__` the four reachable
worker-pool, dual-walk, object-pool and BRep-merge call sites run inline on the
caller's thread; native builds keep upstream's asynchronous paths. Only
`libfive_tree_render_mesh_st` is exported for meshing. JS-facing ABI gains
out-pointer, pointer-argument and 32-bit-status shims for the struct and `bool`
signatures that JavaScript cannot express. `wasm/exports.txt` is the frozen core
export manifest; the build appends every `LIBFIVE_STDLIB` symbol parsed from the
vendored header and passes every export as a link root, so archive members
defining exports are always pulled in. `wasm/README.md` documents the ABI and the
deliberately absent v1 entry points.

**Consequences.** The artifact is genuinely thread-free (no pthread dependency
to stub out), the export surface changes only by reviewed manifest edits, and
pin bumps pick up new stdlib symbols mechanically. Cost: four carried patches'
worth of upstream build adaptation, a documented stdlib caveat until pointer
shims land, and a manifest that must be kept in sync with each exported C
function. This implements AD-004, AD-008 and AD-014 and supports AD-019/AD-020;
it supersedes nothing.

## AD-023 — Software interval rounding implementation {#ad-023}

**Context.** AD-015 requires software rounding for
`boost::numeric::interval` under wasm. Inspecting the pinned Boost 1.92 headers
shows that no stock policy satisfies it: `rounded_*_std` changes the fenv
rounding mode, which Emscripten stubs, so it performs no widening at all;
`rounded_*_exact` returns the same unrounded value from both directions; and
`hw_rounding.hpp` hard-errors for wasm because Boost's platform config defines
`BOOST_NO_FENV_H`. The PoC's `__USE_ISOC99` shortcut does not change this.

**Decision.** Carry a repository-owned header,
`wasm/include/libfive_wasm/interval_rounding.hpp`, that includes the
Boost.Numeric.Interval components without `hw_rounding.hpp` and defines
`rounded_arith_soft`/`rounded_transc_soft`. Those policies compute in double
precision and widen every result outward by one `float` with `std::nextafter`;
the mode hooks are no-ops and no fenv routine is referenced. A carried patch
replaces the `save_state<rounded_transc_std<float>>` alias in
`eval/interval.hpp` with `save_state_nothing<rounded_transc_soft<float>>`.
Acceptance is `scripts/test-interval.mjs`, which evaluates exponential,
trigonometric, reciprocal/division, domain-edge and mixed trees over wide
regions, checks containment against dense sampling and enforces tightness caps.
If the custom policy proves intractable at the pin, the documented fallback is
a vendored patched interval header — never acceptance of `fesetround` behavior.

**Consequences.** Interval bounds are conservative under wasm without relying
on hardware rounding modes, and an undersized policy fails the build instead of
producing subtle mesh artifacts. Widening is bounded to roughly one float ulp
per operation, and the tightness caps keep adaptive meshing effective. This
implements AD-015 and supersedes nothing.

## AD-024 — Generated flat stdlib shims, one parser {#ad-024}

**Context.** AD-017 generates the TypeScript stdlib surface from the vendored
`libfive_stdlib.h`, and AD-022 records that C stdlib entry points taking
`tvec2`/`tvec3` by value are not callable from JavaScript until pointer-
flattened wrappers exist. Handwriting those wrappers would create a second
manifest of the same header that drifts on every pin bump, and a per-signature
"needs a shim" split would leave the JS layer with two call conventions.

**Decision.** A shared parser, `scripts/lib/stdlib-parse.mjs`, reads the
vendored header's `LIBFIVE_STDLIB` / `LIBFIVE_ALIAS` / `LIBFIVE_SECTION`
markers, doc comments and `__N` defaults. Two emitters consume it:
`scripts/gen-stdlib-ts.mjs` writes `src/gen/stdlib.ts` (AD-017) and
`scripts/gen-stdlib-shims.mjs` writes `wasm/stdlib_shim.h`/`wasm/stdlib_shim.c`
(new). Every declaration gets one `shim_stdlib_<name>` wrapper with a flat ABI:
`libfive_tree`/`tfloat` → one tree handle, `tvec2` → two, `tvec3` → three,
`int` → `int`, `const char*` → pointer; the wrapper constructs the local C
struct and calls the real symbol. All generated calls go through these shims.
Generated files are checked in, rendered deterministically, and the build runs
both generators with `--check`, failing with the stale file names. The build
append-exports `_shim_stdlib_*` alongside the C stdlib symbols; the curated
core manifest (`wasm/exports.txt`) and the raw namespace are unchanged. Aliases
are resolved in TypeScript to their target declarations and get no C wrapper.

**Consequences.** The whole stdlib — including `loft_between`, shape
constructors and transforms — is reachable with one JS call convention and no
struct bytes crossing the boundary, while pin bumps regenerate a reviewable
diff and a stale check cannot ship a divergent surface. Costs: ~80 tiny
exported wrappers, a generated C source in the artifact, and a build step that
must run after vendoring. This implements AD-017 in full, relies on AD-022's
export-list mechanics and supersedes nothing.

## AD-025 — Golden mesh verification {#ad-025}

**Context.** The smoke suite proves the artifact links and meshes, and the
interval suite proves bounds are conservative, but neither detects a reviewed
build being replaced by one whose mesher output drifted. AD-015's software
rounding, the vendor pin (AD-016), the pinned Boost/Eigen headers (AD-021) and
the Emscripten version (AD-013) can all change vertex placement or topology
without breaking those suites; the gap had to close before packaging froze the
artifact.

**Decision.** Checked-in goldens under `tests/goldens/` record, per canonical
scene (sphere, gyroid, blended union, text), the mesh vertex/triangle counts
and a SHA-256 over the first 6144 float32 vertex components. The scenes are
built through the public `Shape`/stdlib API with fixed regions and resolutions.
Normal test and build runs are read-only and fail on any count or prefix-hash
difference, including a missing or malformed golden. Goldens are rewritten only
by the explicit capture command (`npm run golden:capture`) against a reviewed
release artifact; changing the vendor pin, Boost/Eigen, interval policy, golden
scene definition or toolchain requires a fresh capture and review. The harness
ships a fault-injection self-test: a real sphere mesh is perturbed by one
float32 ulp and the comparator must reject it, demonstrating sensitivity to the
drift an undersized interval policy produces. The release build and CI run the
golden suite against the artifact they just produced (`build-wasm.sh`,
`build-wasm.yml`); debug builds are not compared.

**Consequences.** Mesh output becomes a reviewed artifact with exact
comparison and no tolerance to loosen; a subtle rounding regression now fails
the build instead of shipping. Goldens are tied to the pinned toolchain and
inputs, so a bump is a deliberate capture-and-review event, and the corpus
stays small enough to read in a diff. This implements the verification half of
AD-015 and supports AD-013/AD-022; it supersedes nothing.

## AD-026 — Package artifact and consumer verification {#ad-026}

**Context.** AD-002/AD-007 promise one ESM package with an async `init()` that
finds its wasm beside the module, and `packaging.md` fixes a single `"."`
export. The working tree could not deliver that: `dist/` held only the
Emscripten glue and wasm, the loader reached the glue through a computed
`import.meta.url` import that bundlers cannot emit, and `package.json` was the
private scaffold. The tarball also had to be proven with a real install rather
than source-tree tests.

**Decision.** `scripts/build-js.mjs` bundles `src/index.ts` and the generated
Emscripten factory into one `dist/index.js` (esbuild, ESM, ES2022) whose
explicit `init` uses the inlined factory, leaving the glue's literal
`new URL('libfive.wasm', import.meta.url)` visible to bundlers; Vite, Rollup
and webpack 5 emit the wasm as an asset without a plugin. `tsc -p
tsconfig.build.json` emits `dist/index.d.ts` and the declaration tree it
references (`emitDeclarationOnly`). `package.json` declares the `"."` export,
types, `files` (`dist` minus `dist/debug`, README and LICENSE),
`sideEffects: false`, `engines.node >= 18` and MPL-2.0, keeping `private: true`
until the release change. A root `LICENSE` carries the canonical MPL-2.0 text.
`scripts/test-package.mjs` packs the tarball, installs it into a scratch
project, meshes from Node, typechecks against the packaged declarations, and
builds a Vite app that emits the wasm asset; CI runs it after the package
suite. `wasmBinary`/`locateWasm` remain the escape hatches for environments
that relocate assets. This implements the packaging half of AD-002/AD-007,
supports AD-012/AD-019, and supersedes nothing.

**Consequences.** The installed package is the tested unit, not just the source
tree, and one entry works in Node and browser bundlers. The tarball carries the
bundle, declarations, wasm, README and license only (no source, tests, debug
artifact or vendored tree). Costs: esbuild and Vite become build/test dev
dependencies, the entry is generated rather than a checked-in file, and the
Emscripten glue's Node-only `module` import remains external (guarded at
runtime, externalized by browser bundlers). The version, CHANGELOG, tag and
npm publish remain the release change.

## AD-027 — Release procedure and verification {#ad-027}

**Context.** AD-020 fixes tag-gated publishing with provenance, but the first
release also needs a single source for its version and story, a guard against
publishing a mismatched tag, and a way to prove the registry package — not just
the local tarball — installs and meshes. npm trusted publishing is configured
on the npm side and cannot be created from this repository.

**Decision.** The release is a commit with a `CHANGELOG.md` section, a
matching `package.json` version (`0.1.0` for the first release), and an
annotated `v<version>` tag. `package.json` drops `private` and declares
`publishConfig` public access plus provenance. `publish-npm.yml` fails unless
the pushed tag equals `v<package.json version>`, installs dev dependencies,
builds through `scripts/build-wasm.sh`, runs the package and consumer suites,
and only then publishes with `--access public --provenance` under the `npm`
environment. After a successful publish, `scripts/verify-release.mjs
[version]` checks the registry version, tarball integrity and provenance
attestation and installs that exact version into a clean project to mesh and
export STL. The npm-side trust relationship (repository/workflow plus `npm`
environment) is the explicit manual prerequisite; no tag is pushed until it
exists. Rollback is `npm unpublish` within the registry window (or
`npm deprecate` after it) followed by a patch release, with the vendor pin,
wasm digest and tarball integrity recorded for comparison.

**Consequences.** A tag cannot publish a stale or mismatched tree, and a
release is only complete when registry metadata, provenance and a clean
install all pass. The changelog and manifest are the reviewed release record.
Costs: the publish workflow is slower (full build + suites), the maintainer
must activate trust before the first tag, and post-publish verification needs
network access. This implements AD-020 and supports AD-012; it supersedes
nothing.

## AD-028 — Public showcase site {#ad-028}

**Context.** The package has a verified artifact and a rich API but no
browser-visible demonstration. The site must not become part of the published
tarball, must not depend on the registry (the first npm publish is still
pending), and should prove the artifact that CI already validated rather than
re-building wasm in a second pipeline. Meshing is synchronous (AD-009), so an
interactive page needs the documented worker pattern.

**Decision.** A separate Vite + TypeScript application lives in `site/` with
its own manifest and lockfile and is excluded from the npm tarball. It consumes
`libfive-wasm` through a local `file:..` link resolving to the built
`dist/index.js`; it never installs the package from the registry. A dedicated
`pages.yml` is triggered by a successful `build-wasm` run on `main`, checks out
the tested SHA, downloads that run's `dist` artifact, builds `site/` with
`SITE_BASE=/libfive-wasm/`, and deploys with `actions/deploy-pages`. The
repository must be public on GitHub Free and Pages must be enabled with
`build_type=workflow`; both are one-time manual prerequisites.

Each demo is a TypeScript module exporting metadata and a `build(libfive)`
function. The mesh worker imports the builder, runs it and `shape.mesh()` off
the main thread, transfers JS-owned `copyVerts()`/`copyTris()` buffers, and
keeps the current mesh alive for `exportSTL()`; the page never holds wasm
memory. The Code tab renders the same module via Vite's `?raw` import, so the
displayed and executed source cannot drift. There is no editor, no `eval`, and
no arbitrary user code in this phase; hash routes keep the static Pages host
simple. The demo catalog is validated in the package test suite by meshing
every entry against the real artifact.

**Consequences.** The live site is a real consumer of the shipped entry and the
deployed bytes are the CI-tested artifact. Site-only dependencies (three.js, a
small highlighter) stay out of the package, and the package manifest remains
focused. Costs: the showcase adds a second install/build path and a manual
Pages prerequisite; its demo coverage is intentionally small until the
`playground-gallery` follow-up; and because the page executes repository-owned
demo modules without `eval`, a future live editor will need its own worker
recycling and untrusted-code handling change. This implements AD-007, AD-009,
AD-019 and AD-026; it supersedes nothing.

## AD-029 — User documentation inside the showcase app {#ad-029}

**Context.** The GitHub Pages site demonstrates the library but documents
nothing: the header's "Docs" link falls back to the repository README, and the
concepts that actually trip up consumers (`res` semantics, the explicit memory
model, worker and bundler wiring, 3D-engine integration) have no hosted prose.
The package's TypeScript surface carries TSDoc comments, but nothing generates
a browsable reference. Whatever documentation ships must look like the site it
lives on and must not grow the published package.

**Decision.** User documentation is a section of the showcase application
itself, at `#/docs/…` hash routes, rendered with the site's own design system —
no separate docs site, iframe, or third-party theme. Content comes through one
build-time pipeline: hand-written markdown guides under
`site/docs-content/guides/` plus a TypeDoc API reference generated from
`src/index.ts` via `typedoc-plugin-markdown`, both compiled by
`site/scripts/build-docs.mjs` into a generated, gitignored content module that
the lazy-loaded docs route renders. Docs tooling (`typedoc`,
`typedoc-plugin-markdown`, `marked`) lives in `site/` devDependencies only; the
generated output is rebuilt in every site build (`build` = docs + vite build,
`check` = docs + tsc), so the existing `pages.yml` deploys docs with the
showcase from the tested artifact with no workflow change. A checked-in nav
manifest plus a root test suite validate navigation ↔ files, intra-docs links,
and typecheck every TypeScript example against the real package types.

**Consequences.** One design, one navigation, and one deployment keep the docs
maintainable inside the consumer app, and example typechecking stops guides
from drifting from the API. Costs: generated reference pages require the docs
build step before local typecheck/dev, TypeDoc and plugin versions must be
pinned exactly because their markdown output shapes the content module, and
the reference is only as good as the TSDoc on the public surface, which this
change audits and fills. Search, versioning, and a live playground stay out of
scope. This implements AD-028 (the docs are part of that site) and supports
AD-003/AD-005/AD-006/AD-009/AD-011 by documenting the behaviors those ADRs
locked; it supersedes nothing.

## AD-030 — Method-level demo coverage enforced by source matching {#ad-030}

**Context.** The showcase gallery grew into the package's de-facto example
set, but its coverage test only checked that each gallery *section* had at
least one demo. Under that rule the twelve-demo catalog drifted into
demonstrating roughly a third of the convenience surface: entire families
(`repel`/`attract`, `reflect`/`symmetric`, `scale`, `taper`/`shear`,
`shell`/`offset`, the exact box and rectangle primitives, the whole
evaluation and inspection surface) had no demo at all, and nothing prevented
further silent regression. Meanwhile every stdlib bump regenerates the
surface mechanically (AD-017/AD-024), so the gap between "what the package
offers" and "what the examples show" could only widen.

**Decision.** The showcase test suite derives the canonical convenience
surface programmatically — every generated stdlib function from the same
`STDLIB_SPECS` table the bindings are built from, plus a literal,
reviewable table of the `Shape` opcode/evaluation/inspection methods and the
instance factories — and fails CI when any of them has no call site in some
demo module's source. Matching runs over demo sources with comments and
string literals stripped and `Math.*` calls removed (so `Math.pow` cannot
cover `Shape.pow`), using word-boundary call patterns. Generated aliases
install the same kernel shim as their target, so a call through an alias
name covers the target. The invariant deliberately couples the package
surface to the showcase: a stdlib bump that adds a function now requires a
demo for it in the same change, keeping the example set honest by
construction. Mesh/STL/raw plumbing stays outside this invariant — it is
already exercised on every catalog entry by the showcase session tests.

**Consequences.** "All features demonstrated" becomes a CI-checked property
instead of an aspiration, and the gallery doubles as executable
documentation for the whole surface. Costs: the matcher is heuristic and
must be maintained against pathological spellings (word boundaries and
`Math.*` stripping handle the known cases; failure messages name the
uncovered method, so each new false positive is a one-line fix); and the
coupling means a kernel addition without a showcase-ready demo blocks the
release until one exists — accepted, because that is precisely the pressure
the project wants. An allowlist escape hatch exists in principle but the
catalog ships with zero entries. This implements AD-017 and AD-024 (the
generated tables are the source of truth) and extends AD-028's showcase; it
supersedes nothing.
