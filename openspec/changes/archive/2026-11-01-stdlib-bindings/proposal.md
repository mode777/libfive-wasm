# Proposal

## Why

The artifact compiles the whole libfive C stdlib, but the package still ends
at a handful of handwritten CSG methods: there is no `libfive.sphere()`,
`box()`, `rotateZ()`, array repetition or `text()`, and the standard-library
entry points that take `tvec2`/`tvec3` by value (`loft_between`, most shape
constructors and transforms) remain uncallable from JavaScript (AD-022
caveat). Roadmap change 5 delivers the generated stdlib surface (AD-017):
full, header-derived coverage of `libfive_stdlib.h` as typed camelCase
functions and `Shape` methods, backed by the struct-flattening shims the
artifact promised for this change. It also settles the opcode-method table
that `api-design.md` deliberately left open until the bindings work.

## What Changes

- Add `scripts/lib/stdlib-parse.mjs`, one parser for the vendored
  `libfive_stdlib.h` markers (`LIBFIVE_STDLIB`, `LIBFIVE_ALIAS`,
  `LIBFIVE_SECTION`, doc comments, `__0`/`__1` defaults) shared by both
  emitters, so C and TypeScript outputs can never describe different
  surfaces.
- Add `scripts/gen-stdlib-ts.mjs` and the generated, checked-in
  `src/gen/stdlib.ts` (AD-017): the full spec table (sections, camelCase
  names, shim symbols, argument kinds and defaults, aliases) plus typed
  interfaces for the instance-level functions (`StdlibFunctions`) and the
  `Shape` method forms (`StdlibMethods`), with doc comments carried over.
  `--check` reports drift without writing.
- Add `scripts/gen-stdlib-shims.mjs` and the generated, checked-in
  `wasm/stdlib_shim.{h,c}`: one C wrapper per stdlib declaration with a flat
  ABI (`libfive_tree`/`tfloat` → tree handle, `tvec2` → two handles,
  `tvec3` → three, `int` → `int`, `const char*` → pointer), so JavaScript
  never passes a struct by value. Generated code is drift-checked against the
  vendored header by the build (new AD-024).
- Add `src/api/stdlib.ts`: the marshalling runtime that coerces
  `TFloat`/`Vec2Arg`/`Vec3Arg` (plain numbers become constant trees, released
  eagerly once the parent tree exists), passes `int`/`string` arguments,
  expands generator-baked optional defaults, validates misuse with
  `LibfiveError`, and wraps results as `Shape`s. Instance-level functions
  (`libfive.sphere(...)`, `libfive.move(s, v)`, ...) and method forms for
  every declaration whose first argument is a shape (`s.move(v)`,
  `s.rotateZ(a)`, `s.arrayX(n, d)`, `s.loftBetween(...)`) are both produced
  from the same generated table; aliases (`box`, `cylinder`, `torus`,
  `rotate`, `arrayPolar`, `blend`, ...) survive as camelCase aliases.
- Add `text(txt, pos?)` string marshalling: Latin-1 text (one byte per
  character, matching the kernel's byte-oriented font and upstream's Python
  bindings) is written into wasm memory, consumed synchronously by the
  kernel, then freed; characters outside U+0000–U+00FF are rejected.
- Finalize the opcode-method table (`api-design.md` deferred it to this
  change): add binary `pow` to `Shape`; record that `recip` (expressible as
  `constant(1).div(s)`) and `nanfill` (an interval-internal NaN-propagation
  helper) stay `raw`-only. This is the only change to previously shipped
  `Shape` behavior and is additive.
- Extend `scripts/build-wasm.sh` to compile `wasm/stdlib_shim.c`, append the
  generated shim symbols (`_shim_stdlib_*`) to the link/export list, and fail
  when the checked-in generated files are stale. The curated core manifest
  (`wasm/exports.txt`) and `libfive.raw` stay exactly as frozen (AD-011,
  AD-022).
- Extend the suite: generator snapshot/drift tests (every declaration and
  alias covered, no duplicate or colliding names, method forms only for
  shape-leading signatures), artifact tests for every stdlib section,
  default arguments, aliases, method/top-level equivalence, `text`,
  error/lifecycle behavior, and the type surface.

Out of scope: golden scenes (change 6), the publishable manifest and
consumer README (change 7), release (change 8). No new meshing, evaluator,
slice or thread surface.

## Capabilities

### New Capabilities

- `stdlib-surface`: the generated standard-library surface — header-derived
  coverage of every declaration and alias, camelCase top-level functions and
  `Shape` method forms, argument coercion/defaults/strings, flat shim
  callability, per-instance binding, and boundary validation/lifetime rules
  (AD-017, AD-024; supports AD-003, AD-010, AD-011, AD-022).

### Modified Capabilities

- `shape-core`: the opcode-method table is finalized with binary `pow`
  (`recip`/`nanfill` documented as raw-only), and the CSG method surface no
  longer excludes `loftBetween`; transform/array method forms arrive with the
  generated stdlib surface (requirements owned by `stdlib-surface`).
- `wasm-build-pipeline`: the build links the generated stdlib shim source,
  exports the generated `_shim_stdlib_*` symbols alongside the core manifest
  and C stdlib symbols, and fails on stale generated bindings; the documented
  ABI contract covers the new flat stdlib shim family.

## Impact

- **New code**: `scripts/lib/stdlib-parse.mjs`, `scripts/gen-stdlib-ts.mjs`,
  `scripts/gen-stdlib-shims.mjs`, `src/gen/stdlib.ts`,
  `wasm/stdlib_shim.{h,c}`, `src/api/stdlib.ts`, and new tests.
- **Existing code**: `src/api/context.ts` and `src/api/shape.ts` gain the
  finalized opcode entry and the generated-method wiring;
  `src/api/instance.ts` and `src/loader/types.ts` expose the stdlib functions;
  `scripts/build-wasm.sh` compiles and exports the generated shims;
  `tests/shape-csg.test.ts` stops asserting that `loftBetween` is absent;
  `tests/type-surface.ts` grows the new surface.
- **Artifact**: additive ABI extension — generated `_shim_stdlib_*` exports.
  Frozen core manifest, raw namespace and existing exports are unchanged.
- **APIs**: additive for consumers (new top-level functions and methods; one
  new `pow` method). `libfive.raw` remains core-only by design (AD-011).
- **Docs**: `docs/api-design.md` (final stdlib/opcode surface),
  `docs/architecture.md` (generated shim layer, frozen-surface note),
  `docs/build-system.md` (generator steps, link/export changes),
  `wasm/README.md` (flat stdlib shim family, string handling, caveat
  removed), `docs/decisions.md` (new ADR), `docs/roadmap.md` (change 5 Done
  at completion).
- **Decisions**: introduces **AD-024** (generated struct-flattening stdlib
  shims emitted from the same parser as the TypeScript surface,
  drift-checked by the build). Implements AD-017 in full and supports
  AD-003, AD-010, AD-011, AD-022; alters or reverses no Accepted ADR, so no
  existing ADR is superseded.
