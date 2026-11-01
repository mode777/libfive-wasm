# Design

## Context

The package has a working loader (`src/loader/`), a typed raw namespace
(`src/ffi/`, manifest-parity-tested per AD-022), and tests that run
against the real artifact in Node. The artifact already exports, besides
the core manifest, every `LIBFIVE_STDLIB` C symbol (the build appends
them to the export list with a prepended underscore, `scripts/build-wasm.sh`),
so the CSG section of the stdlib is compiled in and callable where its
signature is flat. Struct-by-value stdlib entry points are not
JS-callable until the pointer shims of `stdlib-bindings` (recorded
caveat in `wasm/README.md`, AD-022). The convenience layer is this
change's deliverable; see proposal.md for motivation and the three spec
deltas for the behavior contracts.

Constraints that shape the design: handwritten TypeScript over plain C
exports (AD-004), `Shape` class with chainable methods (AD-003),
camelCase naming (AD-010), raw stays the frozen core surface without
stdlib wrappers (AD-011, AD-017), synchronous `_st` meshing (AD-009,
AD-014), zero-copy views valid until `mesh.free()` (AD-006), explicit
`free()` + `FinalizationRegistry` (AD-005), STL in TypeScript (AD-018).

## Goals / Non-Goals

**Goals:**

- A `src/api/` layer that turns `raw` primitives into the `api-design.md`
  surface, with lifetimes and misuse handling that make unmanaged use
  safe (registry net) and managed use exact (idempotent `free()`).
- Kernel-object ownership rules precise enough that no tree or mesh is
  double-freed or leaked, including coerced constants and shared
  operands.
- An opcode/CSG method table verified against the live artifact so
  drift fails the suite, not user code.
- Tests for every scenario in the three deltas, runnable in CI against
  the freshly built artifact.

**Non-Goals:**

- Generated stdlib surface: top-level constructors, transforms, `text`,
  `loftBetween`, pointer shims for struct-by-value signatures
  (`stdlib-bindings`, AD-017).
- A public `Evaluator` wrapper: not in the locked v1 surface
  (`api-design.md`); evaluation goes through the tree-level shims, and
  evaluator entry points remain reachable via `raw`.
- Any change to `wasm/`, `scripts/`, the artifact, or the raw namespace
  (frozen inputs, AD-022).
- Golden-image verification and the publishable manifest (changes 6–7).

## Decisions

### D1 — `src/api/` hangs the convenience surface off the instance; `raw` untouched

`initFromFactory` gains the factory methods on the returned instance
(`x`, `y`, `z`, `constant`, `var`) plus package-level `Shape`, `Mesh`
and `exportSTL` exports. Each `Shape`/`Mesh` instance privately holds
its owning module context (the `RawLibfive` object and the debug flag),
so wrappers are instance-scoped by construction and two `init()`
instances cannot hand each other incompatible handles (js-loader
already guarantees per-instance heaps). The public `Shape` class is a
single exported class; `Shape.fromTree(ptr, ...)` adopts a raw handle.
Alternative considered: standalone factory functions taking the
instance as first argument — rejected: contradicts the locked
`Shape`-class shape of the API (AD-003) and `api-design.md`.

### D2 — Ownership: a wrapper owns exactly its root handle; intermediates are released eagerly

`libfive_tree_delete` decrements a refcount and parents hold references
to their children, so the safe ownership rule (verified upstream behavior
recorded in `architecture.md`) is: a `Shape` owns only the root handle
returned by its constructor; child handles created as intermediates
(e.g. the constant tree a `number` coercion wraps, or the operand
handles a method pulls out of a `TFloat` argument) are released
immediately after the parent tree is constructed; `Shape` operands
remain owned by whoever created them. Consequences: freeing an operand
never corrupts a derived shape (matches the `object-lifecycle` delta),
and coerced constants do not leak (the tree-level `debug` net would
otherwise warn about each of them). `Mesh` owns its `libfive_mesh*` —
meshes own their data, so a `Mesh` outlives its producing `Shape`
(AD-006). Alternative considered: wrappers own the full operand
closure and free it collectively — rejected: it fights the kernel's
refcounting, double-frees shared subtrees, and breaks "derived objects
survive operand free".

### D3 — Method tables are resolved eagerly against the artifact and fail fast

The arithmetic/math table (the `api-design.md` opcode list) and the CSG
table (the flat-callable `csg` section symbols) are declared as static
name lists and resolved once when the api layer is constructed, via
`opcodeByName` for opcodes and a module-key lookup for CSG symbols
(C name with a prepended underscore as the module key — e.g.
`_intersection`, `__union` for C `_union`; verified against the actual
glue keys by the table unit test). An unresolvable name throws
`LibfiveError` at `init()` naming the missing symbol: ABI drift surfaces
at load time, mirroring the raw manifest-parity philosophy. Alternatives
considered: lazy per-call resolution (drift would surface at first use,
deep in user code) and hand-writing raw opcode numbers (rejects the
kernel's own name table, brittle across pin bumps).

### D4 — CSG methods call stdlib exports through the module context, not through `raw`

The CSG methods are handwritten TypeScript (AD-004) that invokes the
stdlib C symbols on the module context directly. The curated `raw`
object deliberately excludes stdlib symbols (AD-011, AD-017; the
`raw-bindings` spec requires their absence), so the api layer uses the
module context it already holds. This keeps `raw` frozen while the
convenience layer gets full access to what the artifact exports.
`loftBetween` is excluded: its C signature takes `tvec3` twice by
value, which no JS call can express; it lands with the generated
stdlib surface once `stdlib-bindings` adds the pointer shims.
Alternatives considered: adding `loftBetween` shims to `wasm/shim.c`
now (rejected: an ABI change owned by `stdlib-bindings`, widens this
change into `wasm/`), and exposing stdlib symbols on `raw` (rejected:
contradicts the `raw-bindings` spec).

### D5 — Mesh views are re-binding getters; copies slice; STL is built from views

`Mesh` stores the mesh pointer and counts; `verts`/`tris` call the
existing `f32View`/`u32View` helpers on every access (fresh views over
the current wasm buffer, AD-006) after checking the alive flag.
`copyVerts()`/`copyTris()` are `view.slice()` — JS-owned, structurally
equal to the live views. `exportSTL(mesh)` (AD-018) writes an 80-byte
zero header, a `uint32` triangle count and one 50-byte record per
triangle (normal computed from the cross product, vertices in local
floats, zero attribute bytes) into a single `ArrayBuffer`, reading
through one view acquisition per export. After `free()`, view/count
access and `exportSTL` throw `LibfiveError` naming the freed mesh.
Alternative considered: caching views and invalidating on growth —
rejected: there is no growth callback; fresh getters are the locked
mechanism (AD-006).

### D6 — Lifecycle: one registry, alive-flag tokens, debug warnings on registry-driven release

A single `FinalizationRegistry` per module instance holds a token per
kernel object (`{ ptr, deleter, kind, alive }`). Explicit `free()`
checks-and-clears `alive` (idempotent, race-free within the single
thread), calls the deleter and unregisters the token; the registry
path does the same when the wrapper is collected, emitting a
`console.warn` naming the kind only when the instance was created with
`debug: true` (AD-005). Because `alive` lives on the token, a
registry callback for an already-freed object is a no-op — the
double-release no-op the lifecycle delta requires. The same alive-flag
gate backs use-after-free errors: every method and property access
checks it first and throws `LibfiveError` naming the object kind
before any kernel call. Kernel strings keep the existing
`readKernelString` discipline (copy immediately, free the kernel
string — `raw-bindings`). GC-pressure tests run with Node's
`--expose-gc` (wired into the vitest invocation) and skip with a clear
note when the flag is unavailable.

### D7 — Validation happens at the boundary; kernel failures are converted, not propagated

All misuse checks (argument kinds, arity on non-TS callers, region
min/max sanity and finiteness, non-finite `res`) run before the first
kernel call and throw `LibfiveError` with a message naming the
operation (`architecture.md` error handling). Kernel calls that must
produce a tree/mesh and signal failure (`NULL`) throw `LibfiveError`
naming the operation, leaving the operands untouched. Wrong arity from
TypeScript is already a type error; the runtime check covers plain-JS
consumers. Alternative considered: mapping kernel failures to a
separate error subclass — rejected: `api-design.md` and the deltas
specify `LibfiveError` for both, distinguished by message.

### D8 — Evaluation uses the tree-level shims with the existing struct refs

`evalF`/`evalD` allocate a `Vec3Ref`, `evalR` a `Region3Ref` +
`IntervalRef`, through the existing `raw` helpers, and free them in a
`finally` block — no evaluator object is created, matching the locked
v1 surface (evaluators stay a `raw`-level facility). Mixed
`TFloat`/`Vec3Arg` components are coerced per D2's ownership rule.

### D9 — `res` is documented as the kernel actually defines it: the inverse minimum feature size

The baseline docs (`api-design.md`, `architecture.md`) describe mesh
`res` with libfive's historical docstring — "approximately half the
smallest feature size; subdivision halts when all region sides are below
it". The pinned kernel does something else, verifiably:
`libfive_tree_render_mesh_st` builds `BRepSettings` with
`min_feature = 1/res` (upstream `libfive/src/libfive.cpp` at the pin), so
the JS-facing `res` is the **reciprocal of the minimum feature size** —
larger values mesh finer. Empirically on the unit sphere in a 2.5-wide
region: res 16 → 12,369 vertices, res 4 → 777, res 1 → 57, res ≤ 0.25 →
a degenerate 1-vertex/0-triangle mesh (the wasm-build-pipeline smoke
test's `res = 16` already reflected this). Documenting the historical
wording would make the docs a footgun (small `res` values produce empty
meshes), so this change documents the artifact's actual semantics:
JSDoc, `MeshOptions` type docs, the validation error message, and the
`api-design.md`/`architecture.md` baselines all state that `res` is the
inverse minimum feature size (`min_feature = 1/res`, larger = finer,
not a voxel count, too-small values mesh empty). The `mesh({region, res})`
surface shape is unchanged; only its documented meaning is corrected, so
no ADR changes — this aligns the docs with the artifact the Accepted
ADRs (AD-014, AD-022) already froze, and the correction travels with the
`stdlib-bindings`/`npm-packaging` README work as one consistent story.

## Risks / Trade-offs

- [Glue key naming for stdlib exports (the `__union` double-underscore
  case) could differ from the assumed prepend-underscore rule] → the
  D3 table construction resolves every CSG name at `init()` and the
  table unit test pins the mapping; a mismatch fails loudly, not
  silently.
- [Eager opcode resolution adds a one-time cost at `init()`] → it is a
  few dozen string lookups; negligible against wasm instantiation, and
  it buys fail-fast ABI drift detection.
- [Registry-driven reclamation is nondeterministic; leak tests can
  flake without cooperation] → GC-pressure tests run under
  `--expose-gc`, assert a bounded-heap property over repeated cycles
  rather than exact collection counts, and skip with a clear note when
  the flag is absent; explicit-`free()` stability assertions run
  unconditionally.
- [Debug warnings use `console.warn`, which apps may silence or
  reroute] → acceptable for a diagnostics flag; the warning content
  (kind + pointer) is the contract, the channel stays `console`
  (AD-005's "logs a warning").
- [Coercion allocates a tree per number, per call — hot loops could
  pressure the heap] → eager release of intermediates (D2) keeps the
  steady state flat; the registry net covers pathological cases;
  documented guidance is to hoist constants out of loops (README
  belongs to change 7; JSDoc carries it meanwhile).
- [`libfive_tree_var` trees treat variables as zero in
  `evalF`/`evalR`/`evalD` (documented upstream TODO)] → the deltas
  specify evaluation only for variable-free trees; the JSDoc states
  the var-evaluates-as-zero semantics so `isVar()` screening has a
  documented rationale.

## Migration Plan

Purely additive package layer: new `src/api/` files, extended exports
in `src/index.ts`, new tests; no existing behavior changes and no
artifact/build changes, so CI stays green by construction. Rollback is
reverting the change. The `docs/api-design.md` note (loftBetween and
struct-by-value stdlib entry points arrive with `stdlib-bindings`) and
the roadmap status flip are the only baseline-document edits, both
within this change.

## Open Questions

None. The scope boundaries (stdlib surface and `loftBetween` → change
5, golden verification → change 6, packaging → change 7) follow from
the roadmap and AD-022; the glue-key question under D3 is pinned by
task-time verification against the real artifact, not an open design
unknown.
