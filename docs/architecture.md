# Architecture

Locked design baseline for `libfive-wasm` (see `decisions.md` for the ADR
log). Implementation lands as OpenSpec changes that conform to this document.

## The one-paragraph version

One npm package, `libfive-wasm`, ships the entire libfive kernel compiled to
a single `libfive.wasm` plus a handwritten TypeScript API modeled on
libfive's Python bindings: build functional-representation trees in JS,
mesh them to watertight triangles, get the result as zero-copy typed-array
views — in Node and in the browser, with no native dependencies. The public
showcase in `site/` is a separate consumer of that package, not part of the npm
artifact (AD-028).

## Layering

```
┌──────────────────────────────────────────────────────────────────┐
│  User code (browser, Node, bundlers, Web Workers)                │
├──────────────────────────────────────────────────────────────────┤
│  src/api/          Shape, stdlib (generated), Mesh, errors       │
│  src/ffi/          C-surface declarations, marshalling, strings  │
│  src/loader/       init(), environment detection, wasm locate    │
├──────────────────────────────────────────────────────────────────┤
│  Emscripten ES6 module factory (generated JS glue, ~small KB)    │
├──────────────────────────────────────────────────────────────────┤
│  libfive.wasm                                                    │
│    wasm/shim.c        ABI flattening helpers (ours, tiny)        │
│    wasm/stdlib_shim.c generated flat stdlib wrappers (AD-024)    │
│    libfive C API      vendor/libfive @ pinned commit             │
│    libfive C++ core   tree, evaluators, dual-contouring mesher   │
│    libfive stdlib     sphere/box/blends/transforms/text          │
│    deps               boost::interval (software rounding policy),│
│                       Eigen, libpng (Emscripten port)            │
└──────────────────────────────────────────────────────────────────┘
```

Every JS→kernel call crosses at most three layers: `api` (ergonomics, object
lifetimes) → `ffi` (pointers, structs, strings) → C export. There is no
code generation at runtime and no runtime dependency beyond the wasm module.

### Frozen artifact surface (AD-022)

The wasm module's export table is the contract between the build and the
JavaScript layers. `wasm/exports.txt` lists the core C API and handwritten shim symbols;
the build appends every C stdlib function from the vendored header and every
generated `_shim_stdlib_*` wrapper from `wasm/stdlib_shim.h`, and passes each
export as a link root. Only `libfive_tree_render_mesh_st` is present for
meshing (AD-014), and shapes/results cross the boundary through the shim
functions documented in `wasm/README.md`. Editing the manifest is an ABI
change, reviewed as one; `js-package-core` types its raw namespace against it.
Every stdlib declaration — including the `tvec2`/`tvec3` by-value signatures —
is reachable through its generated flat shim (AD-024); the curated raw
namespace stays core-only (AD-011, AD-017).

## Repository layout

| Path | Contents |
|---|---|
| `src/loader/` | `init()` factory, wasm URL resolution (`new URL('./libfive.wasm', import.meta.url)`), Node/browser/worker handling, options |
| `src/ffi/` | Typed declarations of the exported C functions and shim; struct builders (`region3`, `vec3`), string helpers, memory utilities |
| `src/api/` | `Shape` class, generated stdlib runtime and method installation, `Mesh`, error types |
| `src/gen/` | **Generated, checked in**: `stdlib.ts` from `scripts/gen-stdlib-ts.mjs` (AD-017) |
| `wasm/shim.c`, `wasm/shim.h` | Out-pointer wrappers for struct returns, pointer forms of struct-by-value arguments, region/vec builders, mesh accessors (AD-004, AD-022) |
| `wasm/stdlib_shim.c`, `wasm/stdlib_shim.h` | **Generated, checked in**: one flat wrapper per C stdlib declaration (AD-024) |
| `wasm/exports.txt` | Frozen core export manifest; stdlib symbols are appended at build time (AD-022) |
| `wasm/include/libfive_wasm/` | Software interval rounding policy (AD-015, AD-023) |
| `wasm/README.md` | Pointer, out-parameter, mesh-lifetime and absent-entry-point contract for the JS layer |
| `scripts/` | Vendoring, dependency fetch, Emscripten build overlay, build entry point, Node test harnesses (see `build-system.md`) |
| `site/` | Public showcase application (Vite + three.js + read-only code view); consumes the built package, not part of the tarball (AD-028). Includes the user documentation section: `site/docs-content/guides/` (checked-in markdown), `site/docs-content/nav.json` (sidebar manifest), and the TypeDoc-generated reference in `site/docs-content/api/` (gitignored) compiled by `site/scripts/build-docs.mjs` into a generated content module (AD-029) |
| `tests/` | Vitest suites, including the showcase catalog validation against the real artifact |
| `openspec/` | Capability specs and change records (the source of truth for planned work) |
| `vendor/` | Pinned libfive + carried patches (AD-016) |
| `dist/` | Build output (gitignored): `libfive.wasm`, `index.js`, `index.d.ts` |

## Object model and lifetimes

All kernel objects are pointers into wasm memory. Each gets a JS wrapper
with an explicit, idempotent `free()` and a `FinalizationRegistry` safety
net (AD-005):

| JS object | Backed by | Freed via | After `free()` |
|---|---|---|---|
| `Shape` | `libfive_tree` | `libfive_tree_delete` | any use throws `LibfiveError` |
| `Mesh` | `libfive_mesh*` | `libfive_mesh_delete` | view access throws |
| `Evaluator` | `libfive_evaluator` | `libfive_evaluator_delete` | any use throws |
| strings from kernel | `char*` | `libfive_free_str` (always immediate, copied into JS first) | n/a |

Freeing a `Shape` invalidates nothing else — trees are refcounted
internally by libfive (child trees survive), and meshes own copies of their
data, so a `Mesh` outlives the `Shape` that produced it. (Verify child-tree
refcounting on the pinned commit during the build change; if upstream keeps
children alive via C++ shared pointers — it does; `Tree::Data` is
refcounted — this holds.)

### Mesh view semantics (AD-006)

`libfive_mesh` stores `verts`/`tris` pointers. `mesh.verts` and `mesh.tris`
are getters that wrap the **current** wasm `Memory.buffer` in a
`Float32Array`/`Uint32Array` view on each access. This survives heap growth
(wasm memory may relocate on growth, detaching old ArrayBuffers; fresh
getters simply re-bind). Data is valid until `mesh.free()`; use
`copyVerts()`/`copyTris()` for JS-owned copies.

## Rendering / threading (AD-08, AD-09)

The kernel is compiled without pthreads. All meshing goes through
`libfive_tree_render_mesh_st` — the upstream entry point that forces
single-threaded meshing for FFI callers. It runs synchronously on whatever
JS thread calls it; the package documents a Worker recipe for interactive
use. Moving to threaded meshing (pthreads + libfive's worker pools) is a
deliberate future change and will not change this API shape.

## Error handling

- C functions that can fail return `NULL` / `false`; the `ffi`/`api` layers
  convert those into thrown `LibfiveError` with context (opcode name,
  operation).
- The kernel is built with exceptions enabled (`-fexceptions`) so internal
  C++ error paths behave; an exception escaping the C boundary to JS is
  treated as a bug in our shim/coverage and should be reported.
- Validation errors (bad region, `NaN` resolution, wrong arity) throw before
  crossing into wasm.

## Initialization flow

```
init(options)
  → locate libfive.wasm   (default: import.meta.url; or options.wasmBinary)
  → instantiate Emscripten ES6 factory   (fetch/fs per environment)
  → build ffi table from module exports
  → resolve opcodes + every generated stdlib shim (fail fast on drift)
  → construct API object: { stdlib fns, Shape factory fns, x/y/z, raw, debug }
  → returns Promise<Libfive>
```

`init()` is idempotent-ish: repeated calls create independent module
instances (documented; each has its own wasm heap). A `libfive` singleton
helper may be added later; not part of the locked surface.

## What is deliberately *not* in v1

Recorded so nobody re-litigates it accidentally (each is a future OpenSpec
change, in rough priority order):

1. **Slices / contours / pixels** (`render_slice`, `render_pixels`) — the C
   API is there; wrappers + view types are follow-up work.
2. **Evaluator-driven re-meshing with free variables** — the C API can
   update vars on an evaluator, but meshing *from* an evaluator only writes
   files (memfs round-trip or an upstream shim needed). v1 exposes
   evaluators for `evalF`-style point queries only.
3. **Threaded meshing** (pthreads, worker pools).
4. **SIMD build variant.**
5. **Tree save/load** (`libfive_tree_save/load` are file-based; would need
   memfs or an upstream buffer API).
