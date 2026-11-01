# meshing Specification

## Purpose

Defines meshing through the convenience API: the synchronous
single-threaded meshing entry points, the `Mesh` result with zero-copy
re-binding typed-array views, JS-owned copies, and binary STL export
(AD-006, AD-009, AD-014, AD-018).

## Requirements

### Requirement: Meshing entry points
`Shape` SHALL expose `mesh(options)` taking `{ region, res }` and a
convenience overload `mesh(min, max, res)`, both returning a `Mesh`
meshed synchronously on the caller's thread through the artifact's
single-threaded entry point (AD-009, AD-014). A kernel failure to
produce a mesh SHALL throw `LibfiveError` naming the meshing operation,
and the producing `Shape` SHALL remain usable afterwards.

#### Scenario: Object-form meshing produces a mesh
- **WHEN** `mesh({ region: { min: [-2,-2,-2], max: [2,2,2] }, res: 0.05 })`
  is called on the unit sphere shape
- **THEN** a `Mesh` with non-zero vertex and triangle counts is returned

#### Scenario: Positional convenience form meshes identically
- **WHEN** `mesh([-2,-2,-2], [2,2,2], 0.05)` is called on the same shape
- **THEN** a mesh with the same counts is produced as with the
  object form for the same region and resolution

#### Scenario: Meshing failure throws a named error
- **WHEN** the kernel returns no mesh for a required meshing call
- **THEN** `LibfiveError` naming the meshing operation is thrown, and
  the shape can still be evaluated and meshed again

### Requirement: Resolution semantics
`res` SHALL follow the pinned kernel's semantics: the kernel meshes with
`min_feature = 1/res`, so larger values produce finer meshes, and a value
so small that `1/res` exceeds the region size produces an empty mesh
(zero triangles). The meshing entry points' documentation (JSDoc and
package docs) SHALL state this prominently: `res` is the inverse of the
minimum feature size, not a voxel count and not a feature size itself.

#### Scenario: Documentation states the res semantics
- **WHEN** the meshing entry points' JSDoc or package documentation is
  inspected
- **THEN** it states that `res` is the inverse of the mesher's minimum
  feature size (`min_feature = 1/res`; larger is finer), not a voxel
  count, and that too-small values produce an empty mesh

#### Scenario: An under-resolved mesh comes back empty rather than failing
- **WHEN** `mesh` is called with a `res` so small that `1/res` exceeds
  the region size
- **THEN** the kernel returns a degenerate mesh with zero triangles,
  which the caller can inspect and free like any other mesh

### Requirement: Resolution validation
A non-finite `res` (`NaN`, `Infinity`) SHALL be rejected with
`LibfiveError` before crossing into wasm.

#### Scenario: Non-finite resolution is rejected
- **WHEN** `mesh` is called with `res: NaN` or `res: Infinity`
- **THEN** `LibfiveError` naming the resolution problem is thrown and no
  kernel meshing call is made

### Requirement: Region validation
Meshing region arguments SHALL be validated before crossing into wasm:
non-finite corner components and corners with `min` not strictly below
`max` on any axis SHALL throw `LibfiveError` naming the region problem.

#### Scenario: Inverted region is rejected
- **WHEN** `mesh` is called with a region whose `min.x` is greater than
  its `max.x`
- **THEN** `LibfiveError` naming the region problem is thrown and no
  kernel meshing call is made

#### Scenario: Non-finite corner is rejected
- **WHEN** `mesh` is called with a region containing a `NaN` or
  `Infinity` component
- **THEN** `LibfiveError` naming the region problem is thrown

### Requirement: Mesh counts and index sanity
A `Mesh` SHALL expose read-only `vertCount` and `triCount` matching the
kernel result, and every triangle index SHALL be strictly below
`vertCount`.

#### Scenario: Sphere mesh counts and indices
- **WHEN** the unit sphere is meshed over a covering region
- **THEN** `vertCount` and `triCount` are non-zero, `triCount` is
  consistent with the triangle array length, and all triangle indices
  are below `vertCount`

### Requirement: Zero-copy re-binding views
`Mesh` SHALL expose `verts` as a `Float32Array` of length
`vertCount * 3` and `tris` as a `Uint32Array` of length `triCount * 3`
as getters that create a fresh view against the wasm module's current
memory on every access without copying data (AD-006). Views obtained
from an access remain valid as long as the mesh lives; a view that a
heap growth detached does not prevent later accesses from returning
valid views.

#### Scenario: View lengths match counts
- **WHEN** the `verts` and `tris` views of a meshed sphere are taken
- **THEN** their lengths are `vertCount * 3` and `triCount * 3`, and the
  first vertex coordinates lie inside the meshing region

#### Scenario: Later accesses stay valid across heap growth
- **WHEN** a view is taken, enough wasm memory is allocated through the
  same module to force heap growth, and the views are accessed again
- **THEN** the new accesses return views over the current wasm memory
  whose contents still describe the same mesh

### Requirement: JS-owned copies
`Mesh` SHALL expose `copyVerts()` and `copyTris()` returning arrays owned
by the JavaScript caller whose contents equal the live views and which
remain valid and unchanged after `mesh.free()`.

#### Scenario: Copies survive mesh free
- **WHEN** `copyVerts()` and `copyTris()` are called, then `free()`, then
  the copies are compared element-wise against values read before the
  free
- **THEN** the copies are unchanged and reading them throws nothing

### Requirement: Mesh lifetime
`free()` SHALL release the kernel mesh and be idempotent; access to
`verts`, `tris`, `vertCount` or `triCount` after `free()` SHALL throw
`LibfiveError` naming the freed mesh. A `Mesh` SHALL outlive the `Shape`
that produced it: freeing the shape SHALL NOT invalidate the mesh, its
views, or its copies (meshes own their data; AD-006).

#### Scenario: View access after free throws
- **WHEN** `free()` is called and then `verts` or `tris` is accessed
- **THEN** `LibfiveError` naming the freed mesh is thrown

#### Scenario: Mesh survives producing shape free
- **WHEN** a mesh is produced, the producing shape is freed, and the
  mesh views and copies are then read
- **THEN** the mesh data is intact and identical to values read before
  the shape was freed

### Requirement: STL export
The package SHALL export `exportSTL(mesh)` returning a JS-owned
`ArrayBuffer` containing a valid binary STL built from the mesh views
(AD-018): an 80-byte header, the triangle count as a `uint32`, and one
50-byte record per triangle referencing the mesh's vertices; exporting
SHALL NOT consume or modify the mesh. Exporting after `mesh.free()`
SHALL throw `LibfiveError`.

#### Scenario: Binary STL structure is valid
- **WHEN** `exportSTL` is called on a meshed sphere
- **THEN** the buffer's triangle count equals `mesh.triCount`, its length
  is `84 + 50 * triCount`, every record's attribute byte count is `0`,
  and every referenced vertex lies within the meshing region

#### Scenario: Export after free throws
- **WHEN** `exportSTL` is called after `mesh.free()`
- **THEN** `LibfiveError` naming the freed mesh is thrown
