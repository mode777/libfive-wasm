# Design

## Context

The showcase viewport receives an indexed mesh (positions + triangle indices)
from the worker. `site/src/viewport.ts` currently calls
`geometry.computeVertexNormals()`, which averages face normals at every shared
vertex, and uses `material.flatShading` for the Flat toggle.

The wavy slab is the clearest failure case: its mesh is watertight and has no
duplicate positions, but its normal averaging crosses the top/side crease. A
topology inspection of the current `res: 18` wavy slab found:

```
vertices 11,943; triangles 23,880; duplicate positions 0
interior edges 35,820
  < 30 degrees: 35,168
  30-60 degrees: 0
  > 60 degrees: 652
```

That bimodal distribution is ideal for a crease-angle rule: a 30 degree
threshold splits the 652 hard edges and leaves the 35,168 curved-surface edges
shared. The problem is normal generation, not mesh repair or welding.

This change refines the rendering behavior of the site established by AD-028;
it introduces no new ADR and does not alter the package or deployment decisions.

## Goals / Non-Goals

**Goals:**

- Default smooth shading keeps curved surfaces smooth and sharp creases hard.
- Preserve Flat as an explicit per-face diagnostic mode.
- Make the default's 30 degree auto-smooth behavior visible in the inspector.
- Keep the change site-only, with no mesh-stat, STL, package or Pages changes.

**Non-Goals:**

- Changing libfive's mesher, adding normals to the package API, or welding or
  remeshing the kernel output.
- A full Blender-style editable smoothing-group system.
- Changing the camera, lighting, material, or gallery coverage.
- Per-demo normal overrides.

## Decisions

### D1 — Use a 30 degree crease angle with `toCreasedNormals`

The viewport builds the indexed geometry as today, rotates it into three.js's
Y-up frame, then calls the three.js addon helper:

```ts
toCreasedNormals(geometry, THREE.MathUtils.degToRad(30))
```

`toCreasedNormals` converts to non-indexed geometry, computes face normals,
groups vertices by quantized position, and averages only across faces within
the threshold. That is the same idea as Blender's Auto Smooth and matches the
observed edge distribution.

Alternatives:

- **Fully smooth normals** (current): causes the dark averaged crease; rejected.
- **Fully flat normals**: correct only as a diagnostic; rejected as the default
  because the curved surfaces would facet.
- **SDF-gradient normals** (`evalD` per vertex): accurate on smooth surfaces,
  but does not resolve hard creases without an additional split rule, and costs
  one kernel evaluation per vertex. Rejected for this fix.
- **Custom indexed edge-split**: preserves the index buffer and shares vertices
  below the threshold, but is more code and more failure modes. Deferred unless
  memory becomes a problem.

The threshold is a named constant (`CREASE_ANGLE_DEGREES = 30`) so it is
reviewable and can later be exposed as a control if needed.

### D2 — Default auto-smooth, Flat remains a toggle

The default shaded mode becomes auto-smoothed. The existing Flat toggle still
sets `material.flatShading`; when disabled, the material uses the creased normal
attribute. No three-way Smooth/Auto/Flat control is added: fully smooth shading
is exactly the behavior this change is fixing, and a third mode would add
geometry-switching complexity for no user value.

The inspector adds a small descriptive line ("Auto smooth 30°") next to the
toggles. The Flat button keeps its current semantics.

### D3 — Normal generation stays on the main thread

The worker continues to send the original positions/triangles and mesh counts.
`toCreasedNormals` runs after the transfer, while `setMesh` already creates the
display geometry. At the current sizes (largest demo about 51k triangles), the
conversion is a small O(triangles) pass and is dwarfed by meshing.

Alternatives:

- **Worker-side creasing**: would either import three.js into the worker
  (large bundle) or duplicate the algorithm; not worth it for this size.
- **Custom indexed split in the worker**: would transfer a new normal buffer and
  keep the main thread free, but adds protocol and geometry work. Revisit if
  meshes grow much larger.

The intermediate indexed geometry is disposed after the creased geometry is
created. Bounding box/sphere and the camera framing are computed from the
creased geometry.

### D4 — Display-only geometry

The `DemoMesh` counts and the worker-held mesh remain the source of truth for
stats and STL. Creasing only affects the display `BufferGeometry`; it does not
change the triangle count, vertex count, STL bytes, or the package.

### D5 — Verification

- Browser smoke on the wavy slab: default smooth view has a hard rim without the
  dark averaged band; Flat still shows facets; toggling off restores the default.
- Default views of the sphere/gyroid remain smooth.
- Mesh stats and an STL download are unchanged in count/size.
- The gallery still loads without the three.js/highlighter chunk (existing
  lazy-route behavior remains).
- A topology check on the wavy slab remains part of the evidence; no permanent
  test is added for three.js internals.

A root Node test cannot import the three.js addon without adding three to the
package's test dependencies, so the visual behavior is verified in the browser
smoke rather than the root suite.

## Risks / Trade-offs

- **Non-indexed geometry** triples the display vertex count → acceptable at the
  current ~51k-triangle maximum; monitor if meshes grow, and fall back to a
  custom indexed split if needed.
- **30 degree threshold** could split a smoothly curved high-curvature region →
  the measured edge distribution has no edges between 30 and 60 degrees, and
  30 degrees is the conventional default; the constant is easy to tune.
- **Quantized position grouping** in `toCreasedNormals` (0.01 units) could merge
  vertices closer than that for normal purposes → the exported meshes have no
  duplicate positions, and the threshold is far below the mesh feature sizes.
- **Visual-only verification** → the smoke compares the actual wavy-slab rim and
  a curved demo; the existing demo mesh validation still guards geometry.
- **Intermediate geometry leak** → dispose the indexed geometry after creasing
  and ensure every early return disposes it.

## Migration Plan

No data or API migration. The site change is reversible by reverting
`viewport.ts` and the inspector label; the package and deployment are untouched.
