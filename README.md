# libfive-wasm

> WebAssembly port of [libfive](https://github.com/libfive/libfive) — Matt
> Keeter's functional-representation solid modeling kernel — as one npm module.

`libfive-wasm` puts libfive's kernel in the browser and Node.js with no native
dependencies: the compiled `.wasm`, a chainable `Shape` API modeled on the
Python bindings, the full C standard library, generated TypeScript types, and
the raw C namespace as an escape hatch.

**Current release: `0.1.0`** (see [CHANGELOG.md](CHANGELOG.md)).

- **Build f-rep trees in code.** `sphere(1).difference(box([2, 1, 1]))`,
  blends, offsets, shells, morphs, lofts, transforms, arrays and text — every
  scalar slot also accepts a plain number.
- **Mesh to triangles.** libfive's adaptive dual-contouring mesher returns
  watertight, feature-preserving geometry. Vertices and triangles arrive as
  zero-copy typed-array views; `exportSTL()` is built in.
- **One import everywhere.** ESM-only, async `init()`, the same call in Node,
  browsers and workers.

## Install

```sh
npm install libfive-wasm
```

Requires Node ≥ 18 or a modern browser with WebAssembly.

## Quick start

```ts
import { init, exportSTL } from 'libfive-wasm';
import { writeFileSync } from 'node:fs';

const libfive = await init();

const part = libfive
  .sphere(1)
  .difference(libfive.box([-2, -1, -1], [2, 1, 1]))
  .blend(libfive.sphere(0.6, [0.8, 0, 0]), 0.3);

const mesh = part.mesh({
  region: { min: [-2, -2, -2], max: [2, 2, 2] },
  res: 16,
});

console.log(`${mesh.vertCount} vertices, ${mesh.triCount} triangles`);
writeFileSync('part.stl', Buffer.from(exportSTL(mesh)));

// Zero-copy views are valid until free(); copy them to keep them.
const verts = mesh.copyVerts();
const tris = mesh.copyTris();

mesh.free();
part.free();
```

In the browser, use the same calls and feed `mesh.copyVerts()` /
`mesh.copyTris()` (or the views) into your renderer:

```ts
import { init } from 'libfive-wasm';

const libfive = await init();
const shape = libfive.sphere(1).blend(libfive.cylinder(0.4, 2).rotateX(Math.PI / 2), 0.3);
const mesh = shape.mesh({ region: { min: [-3, -3, -3], max: [3, 3, 3] }, res: 10 });
geometry.setAttribute('position', new THREE.BufferAttribute(mesh.copyVerts(), 3));
geometry.setIndex(new THREE.BufferAttribute(mesh.copyTris(), 1));
```

## `res` is the inverse of the minimum feature size

This trips up almost everyone: `res` is **not** a voxel count and **not** a
feature size. The pinned kernel uses `min_feature = 1 / res`, so larger `res`
meshes finer. A unit sphere in a 2.5-wide region is roughly 60 vertices at
`res: 1`, 800 at `res: 4`, and 12k at `res: 16`. A value so small that `1/res`
exceeds the region size produces an empty mesh.

## API at a glance

```ts
const libfive = await init(options?);

libfive.x(); libfive.y(); libfive.z();     // coordinate shapes
libfive.constant(1.5);                     // constant tree
libfive.var();                             // free variable

libfive.sphere(radius, center?);           // full generated stdlib
libfive.box([minX, minY, minZ], [maxX, maxY, maxZ]);
libfive.cylinder(radius, height, base?);   // box/torus/gyroid/text/...
libfive.move(shape, offset);               // transforms and arrays

shape.add(2).sqrt().rotateZ(Math.PI / 4);  // Shape methods (numbers coerce)
shape.union(other).blend(other, 0.3);      // CSG and blending
shape.evalF([x, y, z]);                    // point evaluation
shape.evalR(region);                       // interval bounds
shape.evalD([x, y, z]);                    // gradient
shape.toString();                          // Scheme-style form

const mesh = shape.mesh({ region, res });
mesh.verts; mesh.tris;                     // zero-copy, re-bound on access
mesh.copyVerts(); mesh.copyTris();         // JS-owned copies
mesh.free();                               // idempotent
```

- `libfive.raw` exposes the typed C API and shim helpers for advanced use.
- Every wasm-backed object (`Shape`, `Mesh`) has an idempotent `free()`.
  Forgetting it is safe — a `FinalizationRegistry` reclaims it — but explicit
  freeing keeps the wasm heap predictable. `init({ debug: true })` warns when
  the registry, rather than `free()`, releases an object.
- Misuse (bad region, NaN `res`, freed object) throws `LibfiveError`.

The full surface — generated stdlib functions, optional-argument defaults,
aliases, `Mesh` semantics and raw bindings — is documented in
[`docs/api-design.md`](docs/api-design.md).

## Bundlers

The package ships a single ESM entry whose wasm reference is the standard
`new URL('./libfive.wasm', import.meta.url)` pattern. Vite, Rollup and webpack 5
understand it and emit `libfive.wasm` as an asset; no plugin is required.

If your bundler relocates assets or you are in an SSR environment, pass the
bytes yourself:

```ts
import { readFileSync } from 'node:fs';
import { init } from 'libfive-wasm';

const libfive = await init({
  wasmBinary: readFileSync(new URL('libfive-wasm/dist/libfive.wasm', import.meta.url)),
});
```

`init({ locateWasm })` is also available to map the artifact filename to a URL.
CommonJS consumers can use `await import('libfive-wasm')`; there is no CJS build.

## Workers

Meshing is synchronous on the calling thread (v1 has no pthreads). For
interactive apps, run `init()` and meshing in a worker:

```ts
// worker.ts
import { init } from 'libfive-wasm';

const libfive = await init(); // own wasm heap in this worker
self.onmessage = async ({ data }) => {
  const shape = buildShape(libfive, data.params);
  const mesh = shape.mesh(data.region);
  self.postMessage({ verts: mesh.copyVerts(), tris: mesh.copyTris() });
  mesh.free();
  shape.free();
};
```

## Development

This repository is spec-driven: work is proposed, specified, implemented, and
archived as OpenSpec changes. The design baseline lives in [`docs/`](docs/):

| Doc | Contents |
|---|---|
| [docs/decisions.md](docs/decisions.md) | ADR log — locked decisions and rationale |
| [docs/architecture.md](docs/architecture.md) | Layering, source layout, object lifetimes |
| [docs/build-system.md](docs/build-system.md) | Vendoring, Emscripten flags, interval rounding, CI |
| [docs/api-design.md](docs/api-design.md) | Public API contract |
| [docs/packaging.md](docs/packaging.md) | npm layout, versioning, publish flow |
| [docs/roadmap.md](docs/roadmap.md) | Ordered OpenSpec change sequence |

### Build

```sh
npm ci
scripts/vendor-libfive.sh   # pinned libfive + carried patches
scripts/fetch-deps.sh       # pinned Eigen + Boost headers
scripts/build-wasm.sh       # dist/libfive.wasm, dist/libfive.js, dist/index.js, types
```

`build-wasm.sh` requires Emscripten `3.1.64` (pinned in CI and on the
verification server, where `source /opt/emsdk/emsdk_env.sh` provides it).
Use `--debug` for an unoptimized flavor under `dist/debug/`; `--no-tests` skips
the Node suites during local iteration.

### Verify

```sh
npm run check            # TypeScript
npm run lint             # ESLint
npm run golden           # checked-in canonical mesh goldens
npm test                 # full package suite (incl. goldens + fault injection)
npm run test:package     # pack, install and build a Vite consumer
node scripts/verify-release.mjs 0.1.0   # post-publish registry/attestation check
```

Golden meshes are captured only from a reviewed release artifact, never edited
by hand. When the vendor pin, Boost/Eigen pins, interval policy, Emscripten
version or a scene definition changes, recapture and review the JSON diff:

```sh
npm run golden:capture
```

## License

- Ported libfive source: **MPL-2.0** © Matthew Keeter — license preserved in the
  vendored copy and shipped in the package.
- This repository's build glue, bindings, and docs: **MPL-2.0**
  ([LICENSE](LICENSE), AD-012).
- GPL-licensed upstream components (Guile/Python bindings, Studio) are
  deliberately **not** part of this port.

Upstream: <https://github.com/libfive/libfive> ·
Prior art: [Omniblox WASM PoC](https://github.com/Omniblox/libfive/tree/add-web-assembly-support)
