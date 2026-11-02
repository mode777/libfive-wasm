# What is libfive-wasm?

`libfive-wasm` is a WebAssembly port of [libfive](https://github.com/libfive/libfive),
Matt Keeter's functional-representation (f-rep) solid-modeling kernel. It ships
as a single npm module: the compiled `.wasm` artifact, a chainable `Shape` API
modeled on libfive's Python bindings, the full generated C standard library,
TypeScript types, and the raw C namespace as an escape hatch.

## Solid modeling as functions

Traditional mesh modeling moves vertices. F-rep modeling describes a **solid as
a function**: for any point in space, the function answers whether that point is
inside the material, outside it, or on the boundary. A sphere is `x² + y² + z² − r²`;
a rounded box is a few more terms; a smooth blend between two solids is a small
formula that softens exactly where they meet.

Because shapes are functions, they compose like functions — arithmetic, CSG,
transforms, repetitions and blends are all cheap operations that build a tree in
memory. The kernel evaluates that tree on demand: to mesh it, to test a point,
or to measure an interval. Nothing is baked until you ask.

```ts
import { init } from 'libfive-wasm';

const libfive = await init();

const part = libfive
    .sphere(1)
    .difference(libfive.box([-2, -1, -1], [2, 1, 1]))
    .blend(libfive.sphere(0.6, [0.8, 0, 0]), 0.3);

const mesh = part.mesh({
    region: { min: [-2, -2, -2], max: [2, 2, 2] },
    res: 12,
});
console.log(`${mesh.vertCount} vertices, ${mesh.triCount} triangles`);
part.free();
mesh.free();
```

## What's in the package

- **`init()`** — loads the wasm kernel and returns an independent instance with
  its own heap. See [Getting started](./getting-started.md).
- **`Shape`** — build trees from coordinates, constants and variables; combine
  them with arithmetic, math, CSG, blending, transforms and arrays. See
  [The Shape API](./shape-api.md).
- **Generated stdlib** — every function of libfive's C standard library
  (spheres, boxes, tori, gyroids, text, arrays, …) as camelCase instance
  methods, with optional-argument defaults.
- **`Mesh` and `exportSTL()`** — adaptive dual-contouring meshes as zero-copy
  typed-array views plus binary STL export.
- **`raw`** — the typed C namespace for advanced use.

## Scope and limits

The port covers the MPL-2.0 portions of upstream: the core C library and its C
standard library. The GPL tooling (Guile bindings, Python bindings, Studio) is
out of scope. v1 meshes synchronously on the calling thread — for interactive
pages, run the kernel in a Web Worker (see [Workers](./workers.md)). There is
no GPU renderer here; you bring your own 3D engine, and
[Three.js integration](./three-js-integration.md) shows the recipe.

## Where to go next

- [Getting started](./getting-started.md) — install, `init()`, first mesh, STL.
- [Mesh resolution](./mesh-resolution.md) — what `res` really means.
- [API reference](../api/index.md) — generated from the package source.
