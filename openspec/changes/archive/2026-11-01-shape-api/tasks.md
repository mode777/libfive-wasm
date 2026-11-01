# Tasks

Prerequisite for groups 2–5: a built artifact in `dist/`
(`scripts/build-wasm.sh` — the local checkout already has
`dist/libfive.wasm` + `dist/libfive.js`; CI builds it fresh on every
push). Group 1 is artifact-independent unit work.

## 1. Lifecycle foundation (`src/api/`) — no artifact needed

- [x] 1.1 Add the alive-flag token machinery: a per-instance token type `{ ptr, deleter, kind, alive }`, the idempotent `free()` path (check-and-clear alive → deleter → unregister), and the use-after-free gate that throws `LibfiveError` naming the object kind before any kernel call. Unit-test with fake deleters: double free is a no-op, a registry callback for an already-freed token is a no-op, use-after-free throws `LibfiveError` naming the kind. Verify: `npx vitest run tests/api-lifecycle.test.ts` green (new file, artifact-free unit tests).
- [x] 1.2 Add the per-instance `FinalizationRegistry` wiring: registry-driven release calls the same token path and emits a warning naming the object kind only when the instance was created with `debug: true` (AD-005); default is silent; warnings change no kernel behavior. Unit-test against a stub module with fake deleters. Verify: `npx vitest run tests/api-lifecycle.test.ts` green.

## 2. Shape core (`src/api/shape.ts`) — needs `dist/` artifact

- [x] 2.1 Implement the `Shape` class core: instance factory methods (`x`, `y`, `z`, `constant`, `var`), wrapper construction under the ownership rule (a wrapper owns exactly its root handle; coerced constants released eagerly after the parent tree exists; `Shape` operands stay owned by their creators — design D2), and boundary validation (`TFloat` kind checks, arity for non-TS callers, `LibfiveError` naming the operation before any kernel call). Add `tests/shape-core.test.ts`: construction/evaluation of coordinate and constant shapes, `var()` flagged by `isVar`, number and mixed-vector coercion equivalence, wrong-kind and wrong-arity rejections with no kernel object created. Verify: `npm run check && npx vitest run tests/shape-core.test.ts` green.
- [x] 2.2 Implement the eager opcode-method table (binary `add`, `sub`, `mul`, `min`, `max`, `div`, `atan2`, `mod`, `compare`, `nthRoot`; unary `abs`, `square`, `sqrt`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `exp`, `log`, `neg`) resolved via `opcodeByName` when the api layer is constructed, failing `init()` with a named `LibfiveError` on an unresolvable name (design D3). Extend the tests: the `api-design.md` hand-built-sphere chain evaluates negative inside / positive outside, every listed method name resolves and builds, methods return new shapes while operands stay usable, and an unknown name injected into the table fails the table construction. Verify: `npx vitest run tests/shape-core.test.ts` green.
- [x] 2.3 Implement inspection and advanced operations: `toString()` (scheme form via the kernel string path — copied and released), `getConst()` (value or `undefined`), `remap(x, y, z)`, `optimized()` (distinct usable shape, original untouched), static `Shape.fromTree(ptr)` adoption (full surface, freed exactly once, no raw double free), and the read-only `tree` handle (throws after free per the lifecycle gate). Extend the tests for each, including the `(+ 1 2)`-style print, remap composition, optimized equivalence, and the fromTree single-free adoption. Verify: `npx vitest run tests/shape-core.test.ts` green.
- [x] 2.4 Implement tree-level evaluation: `evalF(p)`, `evalR(region)` → `{ lower, upper }`, `evalD(p)` → `[dx, dy, dz]`, through the existing tree-level shims with struct refs allocated via the `raw` helpers and freed in `finally` (design D8). Extend the tests: sphere at `[0,0,0]`/`[2,0,0]`, interval bounds containing densely sampled point values, gradient of `x()` = `[1,0,0]`. Verify: `npx vitest run tests/shape-core.test.ts` green.

## 3. CSG methods (`src/api/`) — needs `dist/` artifact

- [x] 3.1 Implement the CSG table and methods — `union`, `intersect`, `difference`, `inverse`, `offset`, `clearance`, `shell`, `blend`, `blendExpt`, `blendExptUnit`, `blendRough`, `blendDifference` (optional offset), `morph`, `loft` — as handwritten wrappers calling the stdlib symbols through the module context (design D4: not on `raw`), with the glue-key mapping (prepended underscore; pin the C `_union` → `__union` case) verified at table construction and by test. Add `tests/shape-csg.test.ts`: sphere-minus-box composition evaluates correctly at discriminating points, every method (with and without the optional offset) returns an evaluable shape, blend variants' interval bounds contain sampled point evaluations, operands stay usable, and `loftBetween` does not exist on `Shape`. Verify: `npm run check && npx vitest run tests/shape-csg.test.ts` green.

## 4. Meshing + STL (`src/api/mesh.ts`, `src/api/stl.ts`) — needs `dist/` artifact

- [x] 4.1 Implement the meshing entry points `mesh({ region, res })` and `mesh(min, max, res)`: region validation (finite corners, `min` strictly below `max` per axis) and non-finite-`res` rejection before any kernel call, synchronous meshing through the `_st` shim, `NULL` → `LibfiveError` naming the meshing operation with the shape still usable, and JSDoc stating the `res` semantics — the pinned kernel meshes with `min_feature = 1/res`, so `res` is the inverse minimum feature size (larger is finer, not a voxel count; too-small values mesh empty), corrected from the outdated baseline wording (design D9). Add `tests/meshing.test.ts`: both forms produce equal-count meshes, inverted/non-finite region and `NaN`/`Infinity` res reject with named errors, and the JSDoc text states the semantics. Verify: `npm run check && npx vitest run tests/meshing.test.ts` green.
- [x] 4.2 Implement the `Mesh` type: read-only `vertCount`/`triCount`, re-binding `verts`/`tris` view getters over the current wasm memory (fresh `f32View`/`u32View` per access, AD-006), `copyVerts()`/`copyTris()` as JS-owned slices, and free semantics (idempotent; view/count access after free throws naming the freed mesh; the mesh outlives its producing shape). Extend the tests: counts non-zero with all triangle indices below `vertCount`, view lengths match counts with first vertices inside the region, a later access stays valid after forced heap growth (allocate through `raw._malloc` until the buffer detaches), copies survive `mesh.free()` unchanged, view access after free throws, and mesh data is intact after the producing shape is freed. Verify: `npx vitest run tests/meshing.test.ts` green.
- [x] 4.3 Implement `exportSTL(mesh)` in TypeScript (AD-018): 80-byte header, `uint32` triangle count, one 50-byte record per triangle (computed face normals, zero attribute bytes) into a single JS-owned `ArrayBuffer`, reading through one view acquisition; throws after `mesh.free()`; leaves the mesh unchanged. Extend the tests: count/length/layout assertions on a meshed sphere (`84 + 50 * triCount` bytes, attribute bytes zero, referenced vertices inside the region), mesh reusable after export, post-free export throws. Verify: `npx vitest run tests/meshing.test.ts` green.

## 5. Lifecycle integration — needs `--expose-gc`

- [x] 5.1 Wire the vitest invocation to pass `--expose-gc` (documented skip-with-note when the flag is unavailable) and add `tests/lifecycle-gc.test.ts`: thousands of dropped derived shapes drive the wasm heap back toward baseline between repeated cycles (GC safety net); a `debug: true` instance warns naming the released kind on registry-driven release while a default instance stays silent with identical results; a derived shape stays fully usable (evaluate, mesh, free) after its operand is freed; repeated `toString()` calls return equal text at a stable heap. Verify: `npx vitest run tests/lifecycle-gc.test.ts` green with the flag, skipped with a note without it.

## 6. Package exports + docs baseline

- [x] 6.1 Extend `src/index.ts` and the instance type with the convenience surface — `Shape` (value + type), `Mesh`, `exportSTL`, and the `TFloat`/`Vec3Arg`/`Region3`/`MeshOptions` types — and extend `tests/type-surface.ts` with a consumer-style import (`const s: Shape = (await init()).x().add(1)`) that typechecks. Verify: `npm run check` green and the type-surface test compiles.
- [x] 6.2 Update the docs baselines so they match what this change delivers and what the artifact actually does: `docs/api-design.md` — CSG section notes the `loftBetween` deferral (struct-by-value `tvec3` args → `stdlib-bindings` pointer shims, AD-022 caveat) and the meshing section + examples state the corrected `res` semantics (`min_feature = 1/res`: inverse minimum feature size, larger is finer, not a voxel count, too-small values mesh empty — design D9; `docs/architecture.md` checked: it carries no res-semantics wording, nothing to correct there). Verify: the doc's CSG section names the deferral and the meshing section states the corrected semantics; no other baseline doc is touched.
- [x] 6.3 Update `docs/roadmap.md` change 4 status to Done once all above tasks pass. Verify: the roadmap table row for `shape-api` reads Done. (`docs/decisions.md` needs no edit: this change adds, alters and supersedes no ADR — recorded in proposal.md.)

## 7. Final verification

- [x] 7.1 Full gate: `npm run check && npm run lint && npm test` all green; `git diff --stat` shows `wasm/`, `scripts/` and `src/ffi/` untouched (the frozen inputs — artifact surface and raw namespace, AD-022); `src/loader/` changes are limited to the additive instance-type and entry wiring task 6.1 specifies (design D1).
- [x] 7.2 `npx @fission-ai/openspec validate --all --strict` passes with no findings for this change.

## Workflow follow-up

- Present the implemented change for review, then archive it with
  `/opsx-archive` once the project's review requirements are satisfied
  (archive guidance: check synced specs against `docs/decisions.md` —
  this change adds no ADRs, so only conformance is checked).
