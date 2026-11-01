# Tasks

Prerequisite for artifact-backed tasks (2.3, 2.4, 3.1, 4.1–4.3): a built
artifact in `dist/` (`scripts/build-wasm.sh`; locally this runs on the
verification server). Group 1 and the stub-based parts of group 2 are
artifact-independent.

## 1. Header parser and generators

- [x] 1.1 Add `scripts/lib/stdlib-parse.mjs`: parse `LIBFIVE_SECTION`,
  `LIBFIVE_STDLIB` declarations (name, leading-underscore raw name, doc
  comment, args typed `libfive_tree`/`tfloat`/`tvec2`/`tvec3`/`int`/
  `const char*`, `__N` defaults), and `LIBFIVE_ALIAS`, resolving aliases in
  a second pass so forward declarations work. Reject unknown argument types,
  duplicate names and unresolvable aliases. Verify: `npx vitest run
  tests/gen-stdlib.test.ts` green, with cases for every section, the
  forward-declared `cube_centered` alias, defaults `0` and `1`, and an
  unresolvable-alias error.
- [x] 1.2 Add `scripts/gen-stdlib-ts.mjs` and generate `src/gen/stdlib.ts`:
  `STDLIB_SPECS` (section, C name, camelCase name, shim symbol, argument
  kinds/defaults, doc), `STDLIB_ALIASES`, `StdlibFunctions` and
  `StdlibMethods` interfaces with JSDoc and optional arguments, and the
  method-name mapping (`intersection` → method `intersect`; every other name
  mechanical). Fail generation on duplicate JS names or collisions with
  reserved non-stdlib `Shape` members. Verify: `node
  scripts/gen-stdlib-ts.mjs --check` exits zero and the test asserts the
  checked-in file matches a fresh render, that every header declaration and
  alias appears exactly once, and that an injected duplicate name fails.
- [x] 1.3 Add `scripts/gen-stdlib-shims.mjs` and generate
  `wasm/stdlib_shim.h`/`wasm/stdlib_shim.c`: one `shim_stdlib_<name>` wrapper
  per declaration with the flattened ABI (`libfive_tree`/`tfloat` → one
  handle, `tvec2` → two, `tvec3` → three, `int` → `int`, `const char*` →
  pointer) constructing local structs. Verify: `node
  scripts/gen-stdlib-shims.mjs --check` exits zero, the test checks one shim
  per declaration plus the flattened arity of `loft_between`, `sphere` and
  `text`, and `gcc -fsyntax-only -I wasm -I vendor/libfive/libfive/include
  wasm/stdlib_shim.c` passes (skip with a note when no host compiler exists).
- [x] 1.4 Wire `"gen:stdlib"` in `package.json` to run both emitters in write
  mode and document `--check` in each script header. Verify: `npm run
  gen:stdlib` leaves `git status --porcelain` clean, and both `--check`
  invocations exit zero.
- [x] 1.5 Add AD-024 to `docs/decisions.md` — generated struct-flattening
  shims from the same parser as the TypeScript surface, checked in and
  drift-checked by the build — plus its status-table row. Verify: the status
  table lists AD-024 as Accepted, the entry has Context/Decision/Consequences
  and links to AD-017/AD-022, and no existing ADR text is edited (`git diff
  docs/decisions.md` shows only the new row and entry).

## 2. Stdlib runtime, instance surface and CSG takeover

- [x] 2.1 Add `src/api/internal.ts` (module-private `ShapeContext` symbol) and
  switch `Shape`'s context field to it; add `src/api/stdlib.ts` marshalling —
  `TFloat`/`Vec2Arg`/`Vec3Arg` coercion, integral/finite `int` validation,
  Latin-1 string encoding (reject > U+00FF), optional-default application,
  eager release of owned constant trees and string buffers, null result →
  `LibfiveError`. Verify: unit tests in `tests/stdlib-runtime.test.ts` with a
  stub module assert argument order/flattening, frees on success and on throw,
  string bytes, and named errors — no artifact needed.
- [x] 2.2 Implement `StdlibRuntime`: eager resolution of every generated shim
  at `init()` with a named `LibfiveError` on a missing symbol, the instance
  function map (`StdlibFunctions`), idempotent prototype method installation
  from `StdlibMethods`, and wiring through `createInstance`,
  `src/loader/types.ts` and `src/index.ts`. Verify: `npm run check`, `npx
  vitest run tests/loader.test.ts`, and `tests/type-surface.ts` compiles with
  `libfive.sphere(1)`, `s.rotateZ(a)` and `s.loftBetween(b, lower, upper)`.
- [x] 2.3 Retire `CSG_TABLE` and the handwritten CSG methods; CSG declarations
  resolve through the generated specs with their documented method names
  (`union`, `intersect`, `difference`, ..., `morph`, `loft`, and the new
  `loftBetween`). Update `tests/shape-csg.test.ts` to derive its table from
  the generated specs, drop the "`loftBetween` is absent" assertion, and add
  the loft scenario. Verify: `npx vitest run tests/shape-csg.test.ts` green
  against the artifact.
- [x] 2.4 Add `tests/stdlib.test.ts` covering the `stdlib-surface` delta
  against the artifact: every spec/alias callable, one shape per section,
  defaults equivalence (`sphere(1)` = `sphere(1, [0,0,0])`, `reflectX()` =
  `reflectX(0)`, `boxCentered(size)` = `boxCentered(size, [0,0,0])`), alias
  equivalence, method/top-level equivalence, text glyph and newline
  differences plus Latin-1 acceptance, receiver/operand lifetime, heap
  baseline after repeated plain-number calls, misuse errors, and `raw`
  excluding stdlib names. Verify: `npx vitest run tests/stdlib.test.ts` green.

## 3. Opcode table finalization

- [x] 3.1 Add binary `pow` to `BINARY_OPCODE_NAMES` and `Shape.pow`, and
  record in JSDoc that `recip`/`nanfill` stay raw-only. Update
  `tests/shape-core.test.ts` for the finalized exact method list, the
  `pow`-versus-repeated-multiplication scenario, and stale-name failure.
  Verify: `npm run check && npx vitest run tests/shape-core.test.ts` green.
- [x] 3.2 Update `docs/api-design.md`: the finalized opcode list (`pow`
  included, `recip`/`nanfill` raw-only), the generated stdlib surface with
  defaults and method rule, `text` Latin-1 encoding, and `loftBetween` as
  available. Verify: every name/signature in the doc matches
  `src/gen/stdlib.ts` (reviewed list), and the document no longer describes
  `loftBetween` as deferred.

## 4. Build integration and ABI documentation

- [x] 4.1 Update `scripts/build-wasm.sh` to run both generators with
  `--check` before configuring, compile `wasm/stdlib_shim.c` into the link,
  and append `_shim_stdlib_*` symbols parsed from `wasm/stdlib_shim.h` to the
  export list and link roots (core manifest untouched). Extend
  `scripts/test-smoke.mjs` to assert the generated shims are exported. Verify:
  `bash scripts/build-wasm.sh` succeeds on the verification server and the
  smoke test reports the shim exports present.
- [x] 4.2 Update `wasm/README.md` and `docs/build-system.md`: the generated
  flat stdlib shim family, Latin-1 string contract, export-list derivation
  (manifest + stdlib + generated shims), drift check, and the generator steps
  in the pipeline. Update the `wasm/exports.txt` header comment to name the
  second appended source; do not add shim symbols to the manifest. Verify:
  `npx vitest run tests/raw.test.ts` still green (raw parity unchanged) and
  the docs name every generated file.
- [x] 4.3 Update `docs/architecture.md`: the generated shim layer in the
  layering diagram/source layout, and the frozen-surface caveat now pointing
  at `wasm/stdlib_shim.*` instead of "until stdlib-bindings". Verify: the
  document's claims match the files the build actually links and exports.

## 5. Integration checks and release state

- [x] 5.1 Full gate: `npm run check && npm run lint && npm test`, and
  `npx @fission-ai/openspec@latest validate --all --strict`. Verify: all
  commands exit zero.
- [x] 5.2 Update `docs/roadmap.md` change 5 status to Done once the gate
  passes. Verify: the roadmap row for `stdlib-bindings` reads Done.
- [x] 5.3 Verify `docs/decisions.md` reflects what was implemented (AD-024
  present and Accepted, no other ADR altered) and that `docs/api-design.md`,
  `docs/architecture.md`, `docs/build-system.md` and `wasm/README.md` describe
  the shipped surface. Verify: `git diff --stat` touches `wasm/exports.txt`
  only in comments and leaves `src/ffi/raw.ts` unchanged.

## Workflow follow-up

- Present the implemented change for review, then archive it with
  `/opsx-archive` once the project's review requirements are satisfied.
- At archive, re-check the synced specs against `docs/decisions.md`: no
  requirement may contradict an Accepted ADR.
