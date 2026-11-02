# Memory and lifecycle

libfive-wasm hands out real kernel objects — trees, meshes, evaluators — that
live in the wasm heap. The rules are small and explicit.

## Every object has `free()`

`Shape` and `Mesh` (and the raw helpers) own kernel memory and expose an
idempotent `free()`:

```ts
import { init } from 'libfive-wasm';

const libfive = await init();

const shape = libfive.sphere(1).blend(libfive.box([-1, -1, -1], [1, 1, 1]), 0.2);
const mesh = shape.mesh({ region: { min: [-2, -2, -2], max: [2, 2, 2] }, res: 10 });

mesh.free();
shape.free();
mesh.free(); // safe: free() is idempotent
```

Calling `free()` twice, or freeing things in any order, is fine. A `Mesh` keeps
the counts it was created with; accessing views after its `free()` throws a
`LibfiveError` naming the mesh.

## The safety net

Forgetting to free is not a leak-by-crash: every object is registered with a
`FinalizationRegistry`, and once the garbage collector reclaims the JS wrapper,
the kernel memory is released too. Two consequences:

- Long-running apps should still `free()` explicitly — GC timing is not a
  memory budget, and the wasm heap only shrinks when you release objects.
- `init({ debug: true })` turns on lifecycle diagnostics: it warns when an
  object is reclaimed by the registry instead of an explicit `free()`, which
  is the signal to look for missing cleanup.

## Zero-copy views

`Mesh` does not copy triangles into a fresh JS array. Its accessors are
**live views over wasm memory** (AD-006):

```ts
import { init } from 'libfive-wasm';

const libfive = await init();
const part = libfive.sphere(1);

const mesh = part.mesh({
    region: { min: [-2, -2, -2], max: [2, 2, 2] },
    res: 10,
});

mesh.verts; // Float32Array — vertCount * 3 xyz triples
mesh.tris; // Uint32Array — triCount * 3 vertex indices
mesh.vertCount; // 3 · length(verts)
mesh.triCount;
```

The property accessors re-bind on every read, so a view is always fresh —
which matters because **the wasm heap can grow**, and a grown heap moves the
underlying buffer. Rules of thumb:

- Use views immediately: pass them to a renderer, read a bounding box, export.
  They are valid until `mesh.free()`.
- Never assume a view's `.buffer` is stable across other library calls.
- To keep the data (send it to a worker, cache it, hand it to three.js), take
  a **copy**: `mesh.copyVerts()` / `mesh.copyTris()` return JS-owned arrays.

```ts
import { init } from 'libfive-wasm';

const libfive = await init();
const part = libfive.sphere(1);
const mesh = part.mesh({
    region: { min: [-2, -2, -2], max: [2, 2, 2] },
    res: 10,
});

const verts = mesh.copyVerts(); // JS-owned Float32Array
const tris = mesh.copyTris(); // JS-owned Uint32Array
mesh.free(); // copies remain valid
```

`exportSTL(mesh)` reads through the views internally, so it must be called
before `mesh.free()`.

## Use-after-free is an error, not a crash

Touching a freed object throws `LibfiveError` naming the object and operation:

```ts nocheck
mesh.free();
mesh.vertCount; // throws LibfiveError: Mesh.vertCount after free
```

The same applies to `Shape` methods, STL export on a freed mesh, and the raw
namespace's view helpers. JavaScript objects stay valid as JS values — they
just refuse kernel access once released.

## Guidelines

- Free in reverse order of creation within a request or frame; pass
  `copyVerts()`/`copyTris()` to anything that outlives the mesh.
- In interactive apps, prefer a [worker](./workers.md) that owns the kernel:
  meshes never cross to the main thread as views, only as copies.
- See [API reference: Mesh](../api/classes/Mesh.md) for the full accessor
  contract.
