# Proposal

## Why

The package currently ends at `libfive.raw`: a user can build and mesh a
tree, but only through C-shaped calls with manual pointer and lifetime
management. Roadmap change 4 adds the convenience API core — the `Shape`
class with chainable methods, the `Mesh` result type with zero-copy views,
STL export, and the object-lifecycle/error story — which is the layer every
real consumer touches and the prerequisite for `stdlib-bindings` (change 5).

## What Changes

- Add `src/api/` with the `Shape` class (AD-003): coordinate/constant/var
  construction (`libfive.x()`, `libfive.y()`, `libfive.z()`,
  `libfive.constant(v)`, `libfive.var()`), `number` → constant-tree
  coercion in every scalar slot (`TFloat`), arithmetic and math opcode
  methods (`add`, `sub`, `mul`, `min`, `max`, `div`, `atan2`, `mod`,
  `compare`, `nthRoot`, `abs`, `square`, `sqrt`, `sin`, `cos`, `tan`,
  `asin`, `acos`, `atan`, `exp`, `log`, `neg`), inspection
  (`toString`, `isVar`, `getConst`, `remap`, `optimized`, `Shape.fromTree`,
  read-only `tree` handle), and evaluation (`evalF`, `evalR`, `evalD`).
- Add the CSG methods that map the stdlib `csg` section (`union`,
  `intersect`, `difference`, `inverse`, `offset`, `clearance`, `shell`,
  `blend`, `blendExpt`, `blendExptUnit`, `blendRough`, `blendDifference`,
  `morph`, `loft`), implemented as handwritten wrappers over the stdlib C
  symbols the artifact already exports (AD-022). `loftBetween` is deferred
  to `stdlib-bindings`: its C signature takes `tvec3` by value, which
  JavaScript cannot call until the stdlib pointer shims land (recorded
  caveat in `wasm/README.md`); `api-design.md` gains a note marking that.
- Add the `Mesh` type and meshing entry points: `shape.mesh({region, res})`
  (plus the `shape.mesh(min, max, res)` convenience) through the frozen
  `_st` shim (AD-009, AD-014), `vertCount`/`triCount`, zero-copy
  `verts`/`tris` views that re-bind to the current wasm memory on every
  access (AD-006), JS-owned `copyVerts()`/`copyTris()`, and idempotent
  `free()`.
- Add `exportSTL(mesh): ArrayBuffer` — binary STL built in TypeScript from
  the mesh views (AD-018).
- Add the object-lifecycle layer: explicit idempotent `free()` on `Shape`
  and `Mesh`, a `FinalizationRegistry` safety net, `debug: true` warnings
  when the registry (not the user) releases an object (AD-005), and
  use-after-free errors.
- Add the misuse-validation story: bad region, non-finite `res`, wrong
  argument kinds/arity, and freed objects throw `LibfiveError` before
  crossing into wasm; kernel `NULL` where a result is required throws
  `LibfiveError` naming the operation (`architecture.md` error handling).
- Extend the package root exports (`Shape`, `Mesh`, `exportSTL`, the
  `TFloat`/`Vec3Arg`/`Region3`/`MeshOptions` types) and the vitest suite:
  lifecycle, coercion, opcode-method, CSG, evaluation, meshing, STL and
  no-leak tests running against the real artifact.

Out of scope (later roadmap changes): the generated stdlib surface —
top-level constructors (`sphere`, `box`, …), transforms, `text`,
`loftBetween` and all other struct-by-value wrappers (change 5), golden
verification (change 6), the publishable manifest and consumer README
(change 7), release (change 8). A public `Evaluator` wrapper is not part
of the locked v1 surface (`api-design.md`); evaluation goes through the
tree-level `evalF`/`evalR`/`evalD` shims, and the evaluator entry points
remain reachable via `raw`.

## Capabilities

### New Capabilities

- `shape-core`: the `Shape` class contract — construction, scalar
  coercion, arithmetic/math opcode methods, CSG methods over the stdlib
  `csg` section, inspection/remap/optimization, and tree-level evaluation
  (AD-003, AD-010, AD-014).
- `meshing`: meshing entry points and the `Mesh` result — synchronous
  `_st` meshing, resolution semantics and boundary validation, zero-copy
  re-binding views, JS-owned copies, and `exportSTL` (AD-006, AD-009,
  AD-014, AD-018).
- `object-lifecycle`: kernel-object lifetimes across the convenience API —
  explicit idempotent `free()`, the `FinalizationRegistry` safety net,
  `debug` leak warnings, use-after-free errors, and kernel-string copying
  (AD-005). This is the capability the `js-loader` spec already names for
  the diagnostics behavior.

### Modified Capabilities

None — `js-loader` and `raw-bindings` requirements are unchanged; this
change only consumes the instance and raw surface they already define.

## Impact

- **New code**: `src/api/` (`Shape`, `Mesh`, STL export, lifecycle
  registry, opcode-method table), new test files under `tests/`.
- **Existing code**: `src/index.ts` gains exports and `src/loader/` gains
  the additive instance-type/entry wiring (design D1: the instance carries
  the shape factories and the bound `Shape` class) — the convenience layer
  otherwise consumes `raw`'s primitives, and `src/ffi/` is untouched.
  `wasm/`, `scripts/` and the artifact are unchanged: every needed symbol
  is already exported (AD-022).
- **APIs**: introduces the convenience surface (`Shape`, `Mesh`,
  `exportSTL`, factory methods on the `init()` instance) for the first
  time; nothing existing is removed or broken. The `raw` namespace stays
  exactly as frozen — stdlib wrappers are not added to it (AD-011,
  AD-017).
- **Docs**: `docs/api-design.md` gains a note that `loftBetween` (and the
  struct-by-value stdlib entry points generally) arrive with the
  `stdlib-bindings` pointer shims; `docs/roadmap.md` change 4 flips to
  Done at completion. No other baseline doc changes.
- **Decisions**: no architecture/design decision is introduced, altered or
  reversed. Implements AD-003 (core half — the stdlib half belongs to
  change 5), AD-005, AD-006, AD-009, AD-018; conforms to AD-004, AD-007,
  AD-010, AD-011, AD-013, AD-014, AD-022; no ADR is superseded, so
  `docs/decisions.md` needs no new or modified entry.
