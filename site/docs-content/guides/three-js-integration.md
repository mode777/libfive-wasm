# Integrating 3D libraries (three.js)

`libfive-wasm` meshes shapes; it does not render them. This article walks
through feeding a mesh into [three.js](https://threejs.org) — the same pattern
the showcase's own viewport uses — and the parts that translate to any 3D
library: buffers, index layout, shading normals, and disposal.

## The data

`shape.mesh()` returns an indexed triangle mesh:

- `mesh.verts` — `Float32Array`, `vertCount * 3` xyz triples,
- `mesh.tris` — `Uint32Array`, `triCount * 3` indices into `verts`.

That is exactly the layout `THREE.BufferGeometry` wants: a `position`
attribute of item-size 3 and an index. Coordinates are **Z-up** (libfive's
convention), while three.js scenes are usually Y-up — rotate the display
geometry, not your shapes.

## A complete example

```ts
import { init } from 'libfive-wasm';
import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

const CREASE_ANGLE = THREE.MathUtils.degToRad(30);

async function main(): Promise<void> {
    const libfive = await init();

    // 1. Model and mesh the solid.
    const shape = libfive.sphere(1).blend(
        libfive.box([-1.6, -1.6, -1.6], [0.6, 0.6, 0.6]),
        0.3,
    );
    const mesh = shape.mesh({
        region: { min: [-2, -2, -2], max: [2, 2, 2] },
        res: 14,
    });

    // 2. Copy the buffers — the views live in wasm memory and die with
    //    mesh.free(); the renderer needs data it owns.
    const verts = mesh.copyVerts();
    const tris = mesh.copyTris();
    mesh.free();
    shape.free();

    // 3. Build the geometry: xyz triples + triangle indices.
    const indexed = new THREE.BufferGeometry();
    indexed.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    indexed.setIndex(new THREE.BufferAttribute(tris, 1));
    indexed.rotateX(-Math.PI / 2); // libfive is Z-up, three.js is Y-up

    // 4. Shade with creased normals: share normals across edges below 30°,
    //    keep edges above it hard. Splitting every edge would give flat,
    //    faceted shading; averaging everywhere would smear real rims.
    const geometry = toCreasedNormals(indexed, CREASE_ANGLE);
    indexed.dispose();

    // 5. Render.
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        100,
    );
    camera.position.set(3, 2.4, 3);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.append(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xfff8ee, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(3, 5, 2);
    scene.add(key);

    const solid = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({ color: 0xd7bfa1, roughness: 0.6 }),
    );
    scene.add(solid);

    renderer.setAnimationLoop(() => renderer.render(scene, camera));
}

void main();
```

## Why copies, not views

`mesh.verts` is a zero-copy view into wasm memory (see
[Memory and lifecycle](./memory-lifecycle.md)). Handing the view to three.js
is tempting — `new THREE.BufferAttribute(mesh.verts, 3)` works — but the
buffer belongs to the wasm heap: a heap growth moves it, `mesh.free()`
invalidates it, and the renderer keeps a reference to memory you promised to
release. `copyVerts()`/`copyTris()` produce JS-owned arrays that the renderer
can keep. They also transfer cleanly to a [worker](./workers.md) if you mesh
off the main thread — as the showcase does.

Once three.js has uploaded the buffers to the GPU, the JS-side copies are no
longer needed for rendering, but `BufferGeometry` keeps them referenced until
`geometry.dispose()`. For one-shot scenes the copies are small; for
long-lived apps with many meshes, dispose geometries you stop showing.

## Index layout

`tris` holds **vertex indices**, three per triangle — `setIndex` with a
`BufferAttribute` of item-size 1, not a flat position array. Indices are
`Uint32` because large meshes exceed the 16-bit index range; three.js accepts
that natively. The triangles are consistently wound by the mesher, so no
per-triangle fixing is needed.

## Shading normals

Three.js computes smooth normals by averaging, which smears hard edges into
dark bands on mechanical parts. Two good options:

- **Creased normals** (as above): `toCreasedNormals(geometry, angle)` from
  `three/addons/utils/BufferGeometryUtils.js` splits normals only across
  edges sharper than the angle. 30° works well for the showcase's models.
- **Flat shading**: `new THREE.MeshStandardMaterial({ flatShading: true })`
  needs no normal computation and gives a faceted, stylized look.

Compute normals *after* the Z-up rotation so they transform with the geometry.

## Other engines

The recipe is the same everywhere the input is an indexed triangle mesh:

| Engine | Position | Index | Notes |
|---|---|---|---|
| three.js | `BufferAttribute(verts, 3)` | `setIndex(tris)` | Z-up; rotate display geometry |
| regl / raw WebGL | `gl.vertexAttribPointer`, `gl.bufferData` | `ELEMENT_ARRAY_BUFFER`, `UNSIGNED_INT` | enable OES_element_index_uint on WebGL1 |
| Babylon.js | `VertexData(positions, indices)` | direct | Z-up → rotate or set `upAxis` |

The package does not include a renderer by design — mesh once, render with
whatever the project already uses.

## See also

- [Getting started](./getting-started.md) — meshing basics.
- [Memory and lifecycle](./memory-lifecycle.md) — views vs copies.
- [API reference: Mesh](../api/classes/Mesh.md) — the full accessor contract.
