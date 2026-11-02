# Workers

Meshing is synchronous on the calling thread in v1 (AD-009). For interactive
applications, move the kernel into a Web Worker: the page stays responsive
while heavy meshes build.

## The pattern

One worker owns the wasm instance; the page sends parameters and receives
**copies** of mesh buffers:

```ts
import { init, type Libfive, type Region3 } from 'libfive-wasm';

/** The slice of the worker global this worker needs (lib-agnostic). */
interface WorkerScope {
    onmessage: ((event: MessageEvent<{ res: number }>) => void) | null;
    postMessage(message: unknown, transfer?: Transferable[]): void;
}

const scope = self as unknown as WorkerScope;

let libfive: Libfive | null = null;

const kernel = async (): Promise<Libfive> => {
    if (!libfive) libfive = await init();
    return libfive;
};

scope.onmessage = async ({ data }: MessageEvent<{ res: number }>) => {
    const kf = await kernel();
    const shape = kf.sphere(1).blend(kf.box([-1, -1, -1], [0.6, 0.6, 0.6]), 0.25);
    const mesh = shape.mesh({
        region: { min: [-2, -2, -2], max: [2, 2, 2] } satisfies Region3,
        res: data.res,
    });

    // Copies, not views: the worker's wasm heap stays private.
    const verts = mesh.copyVerts();
    const tris = mesh.copyTris();

    scope.postMessage({ verts, tris }, [
        verts.buffer as ArrayBuffer,
        tris.buffer as ArrayBuffer,
    ]);

    mesh.free();
    shape.free();
};
```

`postMessage`'s second argument **transfers** the buffers — zero-copy across
the worker boundary; the worker loses ownership, which is exactly right since
it already released the mesh views.

On the main thread:

```ts
const render = (verts: Float32Array, tris: Uint32Array): void => {
    // Hand the buffers to your renderer (see Three.js integration).
    void verts;
    void tris;
};

const worker = new Worker(new URL('./shape-worker.ts', import.meta.url), {
    type: 'module',
});

worker.onmessage = ({ data }: MessageEvent<{ verts: Float32Array; tris: Uint32Array }>) => {
    render(data.verts, data.tris);
};

worker.postMessage({ res: 12 });
```

## Rules that keep workers safe

- **One `init()` per worker.** Each instance has its own heap; never share
  `Shape` or `Mesh` objects across threads — they are raw pointers into one
  heap. Send data (typed arrays), not objects.
- **Copy before posting.** `mesh.copyVerts()`/`mesh.copyTris()` produce
  JS-owned buffers; the zero-copy views die with `mesh.free()`.
- **Free on the owning thread.** Whatever a worker builds, that worker frees.
- **Cancellation:** a meshing run cannot be aborted mid-flight. For live
  previews, send a generation counter and drop stale responses on the main
  thread; consider debouncing parameter changes.

## Bundlers

`new Worker(new URL('./shape-worker.ts', import.meta.url), { type: 'module' })`
is the standard pattern Vite, webpack 5 and Rollup understand — they bundle
the worker separately, wasm artifact included. See
[Bundlers](./bundlers.md) for the artifact side.

## See also

- [Memory and lifecycle](./memory-lifecycle.md) — why copies, not views.
- [API reference: init](../api/functions/init.md) — each worker initializes
  its own instance.
