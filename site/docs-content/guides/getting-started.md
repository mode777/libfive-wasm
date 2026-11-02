# Getting started

From `npm install` to a meshed, exported solid in a few minutes.

## Install

```sh
npm install libfive-wasm
```

Requires Node ≥ 18 or any modern browser with WebAssembly. The package is
ESM-only — CommonJS consumers can load it with `await import('libfive-wasm')`.

## Initialize the kernel

Everything starts with `init()`. It loads the `.wasm` artifact and returns a
promise for an instance with its own heap:

```ts
import { init } from 'libfive-wasm';

const libfive = await init();
```

In a browser application served from a bundler, the artifact is resolved next
to the module automatically (Vite, webpack 5 and Rollup all handle it; see
[Bundlers](./bundlers.md)). In Node the same call just works.

## Build a first shape

Shapes come from the instance: coordinate variables, constants, and the
generated standard library. Combine them with arithmetic and CSG — numbers are
coerced to constant trees wherever a `Shape` is expected:

```ts
import { init } from 'libfive-wasm';

const libfive = await init();

// A horizontal cylinder pierced by a box hole, blended into a sphere.
const base = libfive
    .cylinder(0.4, 2)
    .rotateX(Math.PI / 2);
const hole = libfive.box([-2, -0.3, -0.3], [2, 0.3, 0.3]);
const knob = libfive.sphere(0.7, [0, 0, 1.2]);

const part = base.difference(hole).blend(knob, 0.25);
```

`difference`, `blend` and their siblings are libfive stdlib functions exposed
as methods; `rotateX` is a transform. Every call builds a small node in the
kernel's tree — nothing is computed yet.

## Mesh it

`shape.mesh()` runs the adaptive dual-contouring mesher. You give it a region
(the axis-aligned box of interest) and `res` — the **inverse of the minimum
feature size**, not a voxel count (see
[Mesh resolution](./mesh-resolution.md)):

```ts
import { init } from 'libfive-wasm';

const libfive = await init();
const part = libfive
    .cylinder(0.4, 2)
    .rotateX(Math.PI / 2)
    .difference(libfive.box([-2, -0.3, -0.3], [2, 0.3, 0.3]))
    .blend(libfive.sphere(0.7, [0, 0, 1.2]), 0.25);

const mesh = part.mesh({
    region: { min: [-1.5, -1.5, -0.5], max: [1.5, 1.5, 2] },
    res: 12,
});

console.log(`${mesh.vertCount} vertices, ${mesh.triCount} triangles`);
```

The result is an indexed mesh: `mesh.verts` is a `Float32Array` of
`vertCount * 3` xyz triples and `mesh.tris` a `Uint32Array` of `triCount * 3`
vertex indices. Both are **zero-copy views into wasm memory** — see
[Memory and lifecycle](./memory-lifecycle.md) before holding on to them.

## Export STL

```ts
import { exportSTL, init } from 'libfive-wasm';
import { writeFileSync } from 'node:fs';

const libfive = await init();
const mesh = libfive
    .cylinder(0.4, 2)
    .rotateX(Math.PI / 2)
    .mesh({ region: { min: [-1, -1, -1], max: [1, 1, 1] }, res: 12 });

writeFileSync('part.stl', Buffer.from(exportSTL(mesh)));
```

`exportSTL` produces a binary STL from the current mesh views. In the browser,
turn the same `ArrayBuffer` into a `Blob` and download it, or feed the views
straight into a 3D engine (see
[Three.js integration](./three-js-integration.md)).

## Clean up

Every wasm-backed object has an idempotent `free()`:

```ts nocheck
mesh.free();
part.free();
mesh.free(); // safe: free() is idempotent
```

Forgetting to free is safe — a `FinalizationRegistry` eventually reclaims the
memory — but explicit freeing keeps the heap predictable in long-lived apps.

## Put it together

```ts
import { exportSTL, init } from 'libfive-wasm';
import { writeFileSync } from 'node:fs';

const libfive = await init();

const part = libfive
    .cylinder(0.4, 2)
    .rotateX(Math.PI / 2)
    .difference(libfive.box([-2, -0.3, -0.3], [2, 0.3, 0.3]))
    .blend(libfive.sphere(0.7, [0, 0, 1.2]), 0.25);

const mesh = part.mesh({
    region: { min: [-1.5, -1.5, -0.5], max: [1.5, 1.5, 2] },
    res: 12,
});

writeFileSync('part.stl', Buffer.from(exportSTL(mesh)));

mesh.free();
part.free();
```

Run it with Node and open `part.stl` in any mesh viewer.

## Next steps

- [The Shape API](./shape-api.md) — the full expression vocabulary.
- [Mesh resolution](./mesh-resolution.md) — picking `res` without guessing.
- [API reference](../api/index.md) — every export, generated from source.
