# Showcase

The public demo gallery for `libfive-wasm`. It is a **separate consumer** of the
package: it is not part of the npm tarball and is deployed to GitHub Pages from
the wasm artifact the main-branch build already tested (AD-028).

## Run

Build the package artifact first, because the site links the root package with
`file:..` and never fetches `libfive-wasm` from the registry:

```sh
scripts/build-wasm.sh
cd site
npm ci
npm run dev        # http://localhost:5173/
```

Production build and typecheck:

```sh
npm run check
npm run lint
SITE_BASE=/libfive-wasm/ npm run build
```

`SITE_BASE` is only needed for the project Pages URL; local builds default to
`/`.

## Demo contract

Each demo is a TypeScript module under `src/demos/` with metadata and a builder:

```ts
import type { Libfive, Shape } from 'libfive-wasm';
import type { DemoDefinition } from './types.js';

const demo: DemoDefinition = {
    meta: {
        id: 'my-demo',
        title: 'My demo',
        description: 'One sentence about the shape.',
        features: ['blend', 'sphere'],
        sections: ['csg', 'shapes'],
        region: { min: [-2, -2, -2], max: [2, 2, 2] },
        res: 14,
    },
    build(libfive: Libfive): Shape {
        return libfive.sphere(1);
    },
};

export default demo;
```

Rules:

- `id` is stable and kebab-case; demo routes are `#/p/<id>`.
- `sections` must use the closed set in `src/demos/sections.ts`:
  `csg`, `shapes`, `transforms`, `text`, `arrays`, `eval`, `raw`.
- `res` follows the package semantics: it is the inverse of the minimum feature
  size, so larger is finer and slowness grows quickly.
- The worker runs `build` off the main thread and owns the kernel objects.
  Demo modules must not import three.js, the DOM, or browser-only APIs: the root
  Node test imports them directly.

## Add a demo

1. Add `src/demos/<id>.ts` using the contract above.
2. Import it in `src/demos/index.ts` and append it to `demos`.
3. Add its raw source import to `src/demos/sources.ts` under the same id.
4. Pick sections that the demo actually demonstrates.
5. Run the root validation:
   ```sh
   npm test -- --run tests/showcase-demos.test.ts
   ```
6. Build the site and open the demo route.

The Code tab reads the module through Vite's `?raw` import in `sources.ts`, so
the displayed source is the same file the worker executed. Do not duplicate the
snippet in metadata.

## Coverage

`src/demos/coverage.ts` maps every section to the demos that declare it. The
root test fails if a section has no demo, if a demo declares an unknown section,
or if any demo throws or meshes to empty/non-finite geometry. The gallery
filter is generated from the same section set.

## Shading

The default viewport shading is **auto-smoothed at 30°**: normals are shared
across edges at or below that angle, and edges above it stay hard. This is
derived from the mesh on the main thread (`toCreasedNormals` in
`src/viewport.ts`); it does not change the mesh counts, STL output or the
package.

The inspector's **Flat** toggle is a diagnostic per-face view. It shows the
actual triangle normals and ignores the crease rule; turning it off restores
auto-smooth shading without re-meshing.

## Deployment

`../.github/workflows/pages.yml` runs after a successful `build-wasm` on
`main`, downloads that run's `dist` artifact, installs this directory, builds
with `SITE_BASE=/libfive-wasm/`, and deploys the static `dist/`. The repository
must be public and Pages must use the workflow build source.
