# Design

## Context

See `proposal.md` for motivation and the three spec deltas for contracts.
Current state that shapes the approach:

- The artifact exports every `LIBFIVE_STDLIB` C symbol flattened only where
  the signature permits; `tvec2`/`tvec3` by value and `const char*` are not
  JS-callable (AD-022, `wasm/README.md`).
- The convenience API owns a handwritten, eagerly resolved CSG table
  (`src/api/context.ts`) and the finalized opcode table (`shape-core`),
  plus the ownership rule that a wrapper owns exactly its root tree and
  coerced constants are released eagerly (shape-api design D2).
- `libfive.raw` is pinned to the core manifest (`wasm/exports.txt`) and must
  stay free of stdlib wrappers (AD-011, AD-017); the raw parity test enforces
  the key list.
- Upstream ships its own header parser (`vendor/libfive/libfive/stdlib/parse.py`)
  and generators for C, Python and Scheme, which read the same
  `LIBFIVE_STDLIB` / `LIBFIVE_ALIAS` / `LIBFIVE_SECTION` markers and the
  `__N` default suffixes. We mirror those conventions rather than inventing
  a new manifest.
- The build derives its export list and link roots from the vendored header
  (`scripts/build-wasm.sh`), and CI runs the build before the package tests.

## Goals / Non-Goals

**Goals:**

- One authoritative parse of the vendored header driving both generated
  artifacts: the checked-in TypeScript surface and the checked-in C shims.
- A single JS-side call convention for every stdlib entry point, so adding a
  stdlib function on a pin bump never needs handwritten marshalling.
- Generated output that is deterministic and reviewable, with drift failing
  the build instead of reaching users.
- Full section coverage (shapes, arrays, transforms, text, csg) with upstream
  defaults, aliases, docs and method forms, while `raw` stays frozen.

**Non-Goals:**

- Changing the frozen core manifest, the raw namespace, or any existing
  export.
- Threads, SIMD, evaluator, slice/pixel or meshing surface changes.
- Golden verification and packaging (changes 6–7).
- Handwriting any per-function wrapper body in TypeScript or C.

## Decisions

### D1 — One shared parser, two checked-in emitters, drift-checked by the build (AD-017, AD-024)

`scripts/lib/stdlib-parse.mjs` parses the vendored header exactly as
upstream's `parse.py` does: sections, declarations (name, leading-underscore
raw name, args with type/name/`__N` default, doc comment), and aliases.
`scripts/gen-stdlib-ts.mjs` (the AD-017 entry point) writes
`src/gen/stdlib.ts`; `scripts/gen-stdlib-shims.mjs` writes
`wasm/stdlib_shim.h` and `wasm/stdlib_shim.c`. Both accept `--check`
(compare, write nothing, report every stale file) and both are checked in.

Output is deterministic — declaration order from the header, no timestamps or
user/host fields (unlike upstream's generators) — so `--check` is a byte
comparison and diffs on pin bumps are minimal. Generation refuses with an
actionable message when `vendor/libfive` is absent (pointing at
`scripts/vendor-libfive.sh`).

`scripts/build-wasm.sh` runs both `--check` invocations before configuring, so
CI fails on stale bindings. `package.json` gains a `gen:stdlib` convenience
script that runs both emitters in write mode.

Alternatives considered: one script emitting all three files (rejected — keeps
AD-017's named TS entry point but hides the C ABI change in a misnamed tool and
muddies the review boundary), and generating at build time only (rejected — the
JS surface and the C ABI would stop being reviewable artifacts and no drift
could be reviewed).

### D2 — Generated flat shims for every stdlib declaration, appended exports (AD-022, AD-024)

Each declaration gets one wrapper in `wasm/stdlib_shim.c` with a uniformly
flattened signature: `libfive_tree`/`tfloat` → one tree handle, `tvec2` → two,
`tvec3` → three, `int` → `int`, `const char*` → pointer. The wrapper builds
the local C structs and calls the real stdlib symbol, e.g.

```c
libfive_tree shim_stdlib_sphere(libfive_tree radius,
                                libfive_tree cx, libfive_tree cy, libfive_tree cz)
{
    tvec3 center = {cx, cy, cz};
    return sphere(radius, center);
}
```

All calls go through `shim_stdlib_<name>` (`_union` → `shim_stdlib_union`),
including flat declarations. One call convention beats branchy per-signature
code and keeps the generated wrapper cheap. Alternatives considered: shim only
struct-taking declarations (rejected — two call paths and a generator-emitted
"needs shim" flag for no meaningful size win; flat functions would bypass the
reviewed shim layer), and pointer-to-tree-array shims (rejected — per-call
allocation and casting for `int` arguments, and less readable generated C).

The build compiles `wasm/stdlib_shim.c` into the link, and derives the export
list as before — core manifest, every `LIBFIVE_STDLIB` name, and now every
`_shim_stdlib_*` declared in `wasm/stdlib_shim.h`. The generated shims are
*not* added to `wasm/exports.txt`, so the manifest stays the frozen core
contract and the raw parity test is untouched (AD-011). Generated header
declarations are the single source the build parses; there is no third list
to keep in sync.

### D3 — The generated TypeScript is data plus types; marshalling stays handwritten

`src/gen/stdlib.ts` exports:

- `STDLIB_SPECS`: one entry per declaration — `section`, `name` (C),
  `jsName`, `shim`, argument descriptors (`kind`: `tree | tfloat | vec2 |
  vec3 | int | string`, `optional`, `defaultValue`), and `doc`.
- `STDLIB_ALIASES`: `jsName` → target `jsName`, with docs.
- `StdlibFunctions`: the instance-level signatures (camelCase, `TFloat`,
  `Vec2Arg`/`Vec3Arg`, `number`, `string`, optional `?` arguments with
  defaults baked in) carrying the header doc comments.
- `StdlibMethods`: the receiver-leading subset, same typing rules.
- `STDLIB_METHOD_NAMES`: which specs/aliases have a method form and the
  method name (see D4).

`src/api/stdlib.ts` (handwritten) contains the one marshalling path:

1. Validate and coerce each argument in order — validate `int` is finite and
   integral, reject wrong scalar kinds and malformed vectors, encode strings —
   throwing `LibfiveError` naming the stdlib function before any kernel call.
2. Numbers become constant trees owned by the call; `Shape` arguments are
   borrowed (their liveness checked through the existing lifecycle gate).
3. Call the resolved shim with flattened arguments.
4. Wrap a non-null result as a new `Shape`; a null result throws
   `LibfiveError` naming the function.
5. Release owned constant trees and any string buffer in `finally`, after the
   parent tree exists (shape-api design D2).

`StdlibRuntime` resolves every shim on the module context eagerly when the
instance is built (fail fast naming the missing symbol, mirroring shape-api
design D3) and exposes the function map plus method installation.

Alternatives considered: emitting wrapper bodies per function (rejected — one
more generated dialect, duplicated coercion logic, larger generated diffs) and
runtime reflection over the module exports (rejected — no types, no docs, no
deterministic drift check).

### D4 — Method forms come from the same spec table; the handwritten CSG table retires

A declaration gets a method form iff its first C parameter is `libfive_tree`
(a receiver shape); `tfloat`-leading constructors (`sphere`, `circle`) and
`text` stay top-level only. Methods share the marshalling path with the
receiver as a borrowed first argument. Aliases inherit their target's method
form.

The CSG section is part of `libfive_stdlib.h`, so its methods are now produced
by this rule instead of the handwritten `CSG_TABLE`; `src/api/context.ts`
drops that table and `src/api/shape.ts` keeps only the non-stdlib surface
(construction, coercion, opcode methods, inspection, evaluation, meshing). The
generator applies one curation override for the API naming already documented
in `api-design.md`: C `intersection` keeps top-level name `intersection` but
its method is `intersect`. All other names map mechanically
(`_union` → `union`, `blend_difference` → `blendDifference`,
`loft_between` → `loftBetween`, `array_polar_z` → `arrayPolar` via the
`array_polar` alias, ...). The generator rejects duplicate JS names and names
that collide with the reserved non-stdlib `Shape` members, so a pin bump that
introduces a clash fails generation rather than silently overriding a method.

Alternatives considered: keeping the handwritten CSG table and generating only
the non-CSG sections (rejected — two mechanisms for the same C header, drift
between them on every pin bump, and AD-017's "full coverage" would be a
half-truth), and flattening CSG into top-level functions only (rejected —
breaks the locked method surface in `api-design.md`).

### D5 — Types merge onto `Shape`; methods read the instance context through an internal symbol

`shape.ts` declares `export interface Shape extends StdlibMethods {}` and
imports only the generated *types* (`import type`), so there is no runtime
cycle. The instance context is stored under a module-private symbol
(`src/api/internal.ts`, `ShapeContext`) instead of a private field, letting
`stdlib.ts` install prototype methods once that read
`this[ShapeContext]` without widening the public surface. Installation is
idempotent and happens when an instance is created; every `Shape` (including
`Shape.fromTree` results) therefore carries the generated methods.

`src/loader/types.ts` extends the `Libfive` interface with
`StdlibFunctions`, and `createInstance` merges the constructed function map
into the returned object.

### D6 — Strings are Latin-1, consumed synchronously

`text` takes a JS string; the marshaller encodes one byte per character
(`charCodeAt` ≤ 0xFF, otherwise `LibfiveError` naming `text`), writes it to a
`_malloc`'d NUL-terminated buffer, calls the shim, and frees the buffer in
`finally`. Latin-1 matches the kernel's byte-oriented font (`get_glyph` on a
`uint8_t`) and upstream's Python bindings (`.encode('latin1')`); UTF-8 would
split `°` (U+00B0) into two fallback glyphs. The kernel parses the string
into a tree synchronously inside `text`, so no pointer survives the call.

### D7 — Opcode table finalized with `pow`

`BINARY_OPCODE_NAMES` gains `pow` (`OP_POW` via `opcodeByName('pow')`), which
the kernel evaluates, differentiates and intervals. `recip` is expressible as
`constant(1).div(x)` and `nanfill` is an interval-internal NaN-propagation
helper, so both stay `raw`-only; `api-design.md` records that closure. This is
the only change to previously shipped `Shape` behavior and is additive; the
`shape-core` delta states the exact final list.

### D8 — Docs and ADR updated in the same change

`docs/decisions.md` gains AD-024 (generated C shims from the shared parser,
checked in and drift-checked). `docs/api-design.md` gains the final generated
surface (defaults, method rule, `text` encoding, `pow`). `docs/architecture.md`
adds the generated shim layer and updates the frozen-surface caveat.
`docs/build-system.md` adds the generator steps and link/export derivation.
`wasm/README.md` replaces the stdlib caveat with the flat shim family and string
contract. `docs/roadmap.md` flips change 5 to Done at completion.

## Risks / Trade-offs

- **Generated artifact churn on pin bumps** → deterministic output, diff
  review, and a `--check` gate; the drift check names the stale files.
- **Method-name collision after a pin bump** → the generator fails on duplicate
  or reserved names; the method-name override table is explicit and reviewed.
- **Aliases declared before their targets** (`cube_centered` precedes
  `box_mitered_centered` in the header) → aliases are resolved in a second pass
  after the full parse; an unresolved alias is a generation error.
- **Eager resolution cost at `init()`** → ~60 symbol lookups plus two table
  builds, negligible next to wasm instantiation; failure is loud and early.
- **Extra exported symbols** → ~60 tiny wrappers; `-O3 -flto` still runs
  dead-code elimination for everything not listed, and the frozen core
  manifest keeps the raw ABI stable.
- **`int`/size arguments are 32-bit** → validate integral and finite in JS;
  values outside the safe integer range are rejected by the same check.
- **Non-ASCII text silently degrading** → rejected at the boundary with a
  named `LibfiveError`; only single-byte characters are accepted, matching the
  font.

## Migration Plan

Additive for users: no existing name changes except `Shape` gaining `pow`,
transform/array methods and `loftBetween`. Rollback is reverting the change —
generated files disappear, the build returns to manifest-plus-header exports,
and the convenience layer falls back to the previous CSG table. There is no
data or packaging migration.
