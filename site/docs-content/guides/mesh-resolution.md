# Mesh resolution

`res` is the single most misunderstood knob in the library. This page explains
what it actually controls and how to pick a value.

## `res` is the inverse of the minimum feature size

`res` is **not** a voxel count and **not** a feature size. The kernel meshes
with `min_feature = 1 / res`: it refines the mesh until features smaller than
that size stop changing the result. Larger `res` therefore means finer meshes —
and slower ones, quickly:

| `res` | `min_feature` | unit sphere vertices (region side 2.5) |
|---|---|---|
| 1 | 1.0 | ~60 |
| 4 | 0.25 | ~800 |
| 16 | 0.0625 | ~12 000 |

Doubling `res` roughly doubles the linear detail — and multiplies the work by
 closer to four, because triangle count grows with area, not length.

## Practical guidance

- Start low (`res: 8–12`) and raise it until the surfaces you care about stop
  changing. Compare `vertCount` between runs; when it stabilizes, you have
  enough resolution.
- Match `res` to your smallest intentional feature, not your model's size: at
  `res: 10` the mesher can represent features down to 0.1 units, regardless of
  whether the region is 2 or 200 units wide.
- For interactive previewing, mesh coarse and refine on demand — or move
  meshing off the main thread entirely (see [Workers](./workers.md)).

## When meshes come out empty

A value so small that `1 / res` exceeds the region size produces an **empty
mesh** — the mesher's first sampling pass sees nothing at its minimum
resolution. If `shape.mesh({ region, res })` returns zero triangles:

- check that `res * min(region extent) > 1`, and
- check the shape actually intersects the region.

The region only bounds the work; the mesher never looks outside it, so a shape
that lives at `z: 50` will not appear in a region ending at `z: 2`.

## Quality is feature-preserving

The mesher produces watertight, feature-preserving geometry: sharp edges stay
sharp at sufficient `res`, and smooth curved regions get more triangles than
flat ones. Vertices arrive as xyz triples and triangles as vertex indices —
see [Memory and lifecycle](./memory-lifecycle.md) for how to hold on to them,
and [Three.js integration](./three-js-integration.md) for shading them well.
