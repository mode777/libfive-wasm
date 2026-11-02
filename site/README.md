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
        probes: {
            inside: [[0, 0, 0]],
            outside: [[0, 0, 1.5]],
        },
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
  `csg`, `shapes`, `transforms`, `text`, `arrays`, `eval`, `math`, `raw`.
- `res` follows the package semantics: it is the inverse of the minimum feature
  size, so larger is finer and slowness grows quickly.
- `probes` is optional signature points in region coordinates: `inside` points
  must evaluate inside the solid (negative `evalF`) and `outside` points must
  evaluate outside it. The validation suite fails a demo whose probes disagree
  with its built shape, so update probes in the same edit as the geometry.
  Declare them for demos whose engraved, repeated or raised details are easy to
  lose silently (numerals, ticks, thin raised parts).
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
7. Capture the new thumbnail (see [Thumbnails](#thumbnails)) and commit the
   WebP plus manifest.

The Code tab reads the module through Vite's `?raw` import in `sources.ts`, so
the displayed source is the same file the worker executed. Do not duplicate the
snippet in metadata.

## Coverage

`src/demos/coverage.ts` maps every section to the demos that declare it. The
root test fails if a section has no demo, if a demo declares an unknown section,
or if any demo throws or meshes to empty/non-finite geometry. The gallery
filter is generated from the same section set.

Method-level coverage is enforced too (AD-030): root
`tests/showcase-coverage.test.ts` derives the canonical surface — every
generated stdlib function (aliases cover their targets), the `Shape`
opcode/evaluation/inspection methods, and the instance factories — and fails
CI naming any method with no call site in some demo module. Comments, string
literals and `Math.*` calls are stripped before matching, so only real calls
count. In practice: when you touch the demo catalog, run

```sh
npm test -- --run tests/showcase-coverage.test.ts
```

and when a stdlib bump adds functions (AD-017), add demos for them in the same
change.

## Documentation

The user documentation section renders inside the showcase app at `#/docs/…`
(AD-029). Content has two sources, compiled by one pipeline:

- `docs-content/guides/*.md` — hand-written guides, checked in. The sidebar
  structure lives in `docs-content/nav.json`: every listed page needs a file
  and every file must be listed (both enforced by the root
  `tests/showcase-docs.test.ts`, which also resolves intra-docs links —
  including `#anchors` — and typechecks every ` ```ts ` fence against the
  package's public types).
- `docs-content/api/` — TypeDoc output (typedoc-plugin-markdown, pinned in
  devDependencies), regenerated from the package source. **Generated and
  gitignored**; never edit it by hand.

Compile everything into the generated content module
(`src/docs/generated/content.ts`, gitignored):

```sh
npm run docs          # typedoc + compile
npm run docs:check    # same, plus structure verification (used by CI gates)
```

Relative markdown links between pages are rewritten to `#/docs/…` routes at
build time; a link that does not resolve fails the build. `build` and `check`
run `docs` first, so the Pages deployment always ships fresh docs.

### Add a guide page

1. Add `docs-content/guides/<slug>.md` starting with an `# H1` title (it
   becomes the page and sidebar title).
2. List `<slug>` in the matching section of `docs-content/nav.json`.
3. Keep every ` ```ts ` example self-contained (its own imports) so the
   typecheck harness can compile it; use ` ```ts nocheck ` for illustrative
   pseudo-code.
4. Run `npm run docs:check` and the root suite:
   ```sh
   npm test -- --run tests/showcase-docs.test.ts
   ```
5. Build the site and open `#/docs/<slug>`.

The API reference regenerates automatically from the package's TSDoc; improve
the reference by improving the doc comments on the public surface in `src/`.

## Shading

The default viewport shading is **auto-smoothed at 30°**: normals are shared
across edges at or below that angle, and edges above it stay hard. This is
derived from the mesh on the main thread (`toCreasedNormals` in
`src/viewport.ts`); it does not change the mesh counts, STL output or the
package.

The inspector's **Flat** toggle is a diagnostic per-face view. It shows the
actual triangle normals and ignores the crease rule; turning it off restores
auto-smooth shading without re-meshing.

## Thumbnails

Gallery cards use pre-rendered WebP thumbnails captured from the real demo
page. The capture route is:

```text
#/p/<id>?preview=1
```

Preview mode hides the header, tabs, meta bar, aside and footer and fixes the
stage to a 16:10 frame. The capture is **640×400 CSS pixels at deviceScaleFactor
2** (1280×800) and WebP quality 82.

Build the site, then run the capture:

```sh
npm run build
CHROME_SHELL_PATH=/path/to/chrome-headless-shell npm run thumbnails:capture
```

Or connect to an already-running Chrome DevTools browser:

```sh
CHROME_URL=http://127.0.0.1:9222 npm run thumbnails:capture
```

The script starts `vite preview` on `127.0.0.1:4173` (set `CAPTURE_BASE_URL` to
use an existing server), reads demo ids from the gallery, waits for each mesh,
and writes `src/assets/previews/<id>.webp` plus `manifest.json`. On the
verification server, use `chrome-headless-shell` with the SwiftShader flags the
script supplies. CI consumes the checked-in images; it does not run a browser.

Recapture when:

- a demo module changes — the source-hash drift test fails otherwise;
- a demo is added;
- the viewport, lighting, material or preview CSS changes — bump
  `PREVIEW_VERSION` in `scripts/capture-thumbnails.mjs` as part of that change
  and recapture.

`tests/showcase-thumbnails.test.ts` enforces manifest coverage, non-empty WebP
files, source hashes and orphan detection. If an image is missing, the gallery
falls back to the CSS orb. Images are Vite content-hashed, lazy-loaded and are
not part of the npm package.

## Deployment

`../.github/workflows/pages.yml` runs after a successful `build-wasm` on
`main`, downloads that run's `dist` artifact, installs this directory, builds
with `SITE_BASE=/libfive-wasm/`, and deploys the static `dist/`. The repository
must be public and Pages must use the workflow build source.
