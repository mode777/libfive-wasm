# Design

## Context

Change 2 left the repo with a reproducible artifact: `dist/libfive.wasm` +
an Emscripten ES6 factory (`dist/libfive.js`, default export
`createLibfiveModule`, `MODULARIZE=1`/`EXPORT_ES6=1`), a frozen core
export manifest (`wasm/exports.txt`, AD-022), struct-flattening shims
(`wasm/shim.c`, contract in `wasm/README.md`), and exported runtime
helpers (`HEAPU8`…`HEAPF32`, `UTF8ToString`, `stringToUTF8`,
`lengthBytesUTF8`, `getValue`, `setValue`). There is no `package.json` and
no `src/` yet. The binding layer is handwritten TypeScript over plain C
exports (AD-004); the entry point is an async `init()` in an ESM-only
package (AD-007); the raw surface is public and typed (AD-011). See
proposal.md for motivation; the behavior contracts are the `js-loader` and
`raw-bindings` deltas.

## Goals / Non-Goals

**Goals:**

- A typed, minimal `src/ffi/` that mirrors the frozen ABI exactly
  (manifest parity is tested, not assumed).
- An `init()` whose option handling and failure modes are unit-testable
  without instantiating wasm.
- Integration tests that run against the real artifact in Node, reusing
  the loading pattern `scripts/lib/wasm-test-utils.mjs` already proved
  (import glue, pass `wasmBinary`).
- Package scaffolding (dev deps only) that change 7 can finalize into the
  publishable manifest without rework.

**Non-Goals:**

- The `Shape`/`Mesh`/evaluator convenience layer, `FinalizationRegistry`
  net, misuse validation (roadmap change 4).
- Generated stdlib TypeScript, stdlib pointer shims (change 5).
- The publishable `exports` map, `files`, bundled single-file
  `dist/index.js`/`index.d.ts`, README rewrite, bundler validation
  (change 7). `package.json` here is a working scaffold (`"private":
  true`), not the shipping manifest.
- Any change to the artifact build, its flags, or its export surface
  (AD-022 is a hard input, not a deliverable, of this change).

## Decisions

### D1 — The Emscripten factory is the wasm locator; the loader only maps options

The generated glue resolves its sibling `libfive.wasm` through its own
`import.meta.url` (`_scriptName`), which *is* the AD-007 default
(`new URL('./libfive.wasm', import.meta.url)`). Reimplementing resolution
in the loader would duplicate it and drift. So:

- `init()` with no wasm options forwards an empty Module arg → the
  factory's default resolution applies (Node ≥ 18, browsers, workers —
  environments are compiled into the artifact, AD-008).
- `wasmBinary` → `{ wasmBinary }` bytes pass-through (ArrayBuffer or
  ArrayBufferView, verified as typed values before crossing the seam).
- `locateWasm(fn)` → `{ locateFile: fn }` (Emscripten's `(path, prefix)`
  signature is adapted; the user function receives the artifact filename).
- `debug` → recorded on the instance (`libfive.debug`), consumed by the
  lifecycle diagnostics that arrive with the object model (AD-005);
  enabling it changes nothing else in this change.

Alternative considered: fetch/read the wasm in the loader ourselves and
always pass `wasmBinary`. Rejected: it would need environment-conditional
code (fs vs fetch) that the glue already contains and already tests, and
it would break the bundler story that packaging.md documents for the
`import.meta.url` pattern.

### D2 — Factory acquisition is one seam: `loadFactory()` with an `initFromFactory` test/internal entry

`src/loader` resolves the glue at `new URL('./libfive.js',
import.meta.url)` — the convention that the compiled loader module sits
beside the glue in the shipped layout (change 7 owns the final shape,
including its "inlined ESM glue re-export"). Because `dist/` is generated
and the compiled layout does not exist until the packaging change, the
loader also exports `initFromFactory(factory, options)` (JSDoc
`@internal`, not part of the documented surface): the test suite — and
later the compiled entry — supply the factory directly, exactly like
`scripts/lib/wasm-test-utils.mjs` already does. `init(options)` is then a
thin composition: resolve factory → `initFromFactory`.

Consequence: option-handling and failure tests run against a stub factory
(fast, no artifact); integration tests run `initFromFactory` against the
real glue + wasm; one artifact-side test instantiates the real glue with
no options to prove the factory's default resolution still works in Node.
The end-to-end default path (compiled package in a consumer project) is
specified but exercised by the packaging change's consumer test — a
deliberate, recorded deferral, consistent with build-system.md's note that
artifact tests instantiate "with `wasmBinary`, so they do not depend on
glue path resolution".

Alternative considered: an `_factory` key inside public `InitOptions`.
Rejected: it leaks internals into the documented option surface that
api-design.md defines exhaustively; a separate internal function keeps the
public options exactly as designed.

### D3 — `raw` is a curated typed view over the module, not the bare instance

`libfive.raw` is a plain object whose members are the module's functions
re-exposed under their verbatim module keys (`_libfive_tree_x`,
`_shim_region3_set`, `_libfive_tree_delete`, `_malloc`/`_free`, …) plus
the exported heap views and runtime helpers (UTF-8 string helpers). The
artifact does not export a `memory` property — the frozen
`EXPORTED_RUNTIME_METHODS` list is the memory-accessor contract — so heap
access goes through the live views (`HEAPU8.buffer` et al.), which the
glue reassigns on growth. Naming keeps the exported C symbols as-is including
Emscripten's leading underscore — no renaming, so raw and the artifact
stay in lockstep and the parity test can enforce it (every
`wasm/exports.txt` symbol must be present and callable on `raw`; a missing
export fails the suite, flagging the ABI change).

Why not simply cast and expose the module instance: the module namespace
also carries stdlib symbols (appended at build time) and Emscripten
internals. AD-011 scopes raw to the core C API plus shim helpers, AD-017
assigns stdlib wrappers to generation, and architecture.md defers
struct-by-value stdlib entry points to `stdlib-bindings`; a curated object
makes those boundaries real in the type system and at runtime. When
`stdlib-bindings` lands, it amends this surface additively (its own spec
delta).

The `src/ffi` helper layer (struct allocators, string utilities,
heap-view accessors) is exported through `raw` as the "memory utilities"
surface but is implemented as ordinary TypeScript over those primitives;
the `Shape` layer consumes it internally in later changes.

### D4 — Pointer-strong typing without runtime cost

All handles are `number` (wasm offsets are 32-bit, per `wasm/README.md`)
behind branded aliases (`TreePtr`, `MeshPtr`, `VoidPtr`, …) declared in
`src/ffi/types.ts`. Signatures transcribe `libfive.h` + `wasm/shim.h`
(`shim_tree_eval_f(tree, vec3Ptr)`, interval/vec3 out-pointers,
int32-as-bool results). Struct layout knowledge stays in the shim: JS
never hardcodes offsets; `src/ffi/structs.ts` only sizes allocations
(`region3` = 24 B, `vec3` = 12 B, interval out = 8 B) and routes every
write through `shim_region3_set`/`shim_vec3_set` or typed heap views on
out-pointers.

### D5 — `LibfiveError` is introduced here, used by the loader

The loader must reject with an identifiable error (js-loader delta:
"Load failures reject with identifiable errors"). Rather than introduce a
throwaway loader-specific error class, this change defines the package
error type `LibfiveError` (`src/errors.ts`, `name = 'LibfiveError'`,
exported from the root) and throws it for wasm resolution/instantiation
failures and option misuse. The *misuse-validation story* for API objects
(bad region, NaN res, freed objects — architecture.md) remains change 4's
scope; nothing in that story is pre-empted, it extends this class.

### D6 — Package scaffold and toolchain

- `package.json`: `name: libfive-wasm`, `"type": "module"`, `"private":
  true` (removed at packaging), `version: 0.0.0`, `engines.node >= 18`,
  `license: MPL-2.0`, no `exports`/`files` yet (change 7). No runtime
  dependencies (AD-002). Dev deps: `typescript`, `vitest`,
  `eslint` + `typescript-eslint`, `prettier`. A committed lockfile makes
  CI installs reproducible.
- `tsconfig.json`: `strict`, `module: nodenext`, `target: es2022`,
  `noEmit` typecheck script (`npm run check`); emitted JS is a packaging
  change concern, so nothing is compiled into `dist/` here — `dist/` stays
  the artifact directory owned by `build-wasm.sh` (AD-019).
- Vitest (`vitest.config.ts`, node environment): `tests/` at package
  scope, `npm test` fails fast with a clear message when `dist/libfive.wasm`
  is missing ("run scripts/build-wasm.sh first") instead of a confusing
  import error.
- CI (`build-wasm.yml`): after the existing build step, `npm ci` +
  `npm test` run the package suite against the freshly built artifact
  (Node 24 is already set up). `publish-npm.yml` is untouched.

## Risks / Trade-offs

- [Glue layout drift: the loader's default glue URL assumes the shipped
  sibling layout that only change 7 finalizes] → `initFromFactory` is the
  only path the test suite depends on for artifact loading; the packaging
  change must update `loadFactory()` when it fixes the layout, and its
  consumer test will catch drift. Recorded as an explicit handoff.
- [Curated `raw` could silently miss a manifest symbol as the ABI evolves]
  → the parity test iterates `wasm/exports.txt` on every run and fails on
  any missing or non-callable member, so drift is caught by the suite, not
  by users.
- [`init()` accepting `debug` before diagnostics exist could look like a
  no-op lie] → spec text scopes the option to "accepted, enables
  diagnostics for the instance", and the js-loader delta names the later
  capability that defines the warnings (AD-005).
- [Vitest version churn on Node 18/20/24] → devDependency lockfile pins
  what CI and developers get; engines floor (≥18) matches packaging.md.
- [Two init paths (public `init`, internal `initFromFactory`) could
  diverge in behavior] → `init` is a two-line composition over
  `initFromFactory`; option mapping lives in exactly one place.

## Migration Plan

Additive introduction of a new package layer; no existing behavior is
removed or changed. `build-wasm.sh`, the artifact, and its specs are
untouched; CI gains one test step after the build (if it fails, the
workflow already treats the job as red). Rollback = revert the change;
nothing persisted depends on it.

## Open Questions

None. The deferrals (compiled layout → change 7, diagnostics semantics →
change 4, stdlib surface → change 5) are recorded scope boundaries, not
unknowns.
