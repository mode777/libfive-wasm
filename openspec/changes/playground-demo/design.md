# Design

## Context

The package is built as a single ESM entry with the Emscripten factory inlined
and `libfive.wasm` beside it (AD-026). `dist/` is gitignored and produced by
`build-wasm.yml`; the same workflow runs the golden, interval, package and
consumer suites (AD-019, AD-020). The npm package is not published yet, so the
showcase must consume the locally built artifact.

Meshing is synchronous on the calling thread (AD-009). The documented way to
keep an interactive UI responsive is to run `init()` and meshing in a Worker.
The site itself is a new, non-published consumer of the package; the repo
roadmap already anticipated it as `playground-demo`.

## Goals / Non-Goals

**Goals:**

- A public, static showcase deployed to GitHub Pages from the artifact the main
  branch build already validated.
- A gallery and demo route with a 3D view and a read-only Code view.
- Demo source with a single source of truth: the code shown is the module the
  worker executed.
- A small, maintainable app: no general-purpose editor, no arbitrary code
  execution, no backend.
- Demo correctness enforced by tests against the real wasm artifact.

**Non-Goals:**

- Live editing, Monaco, debounced re-meshing, permalinks carrying user code.
  Those belong to the later `playground-editor` candidate.
- Changing the package API, wasm artifact, build system, or npm publish flow.
- Server-side rendering, analytics, authentication, or a custom domain.
- Showcasing every stdlib function; coverage expands in `playground-gallery`.

## Decisions

### D1 — Separate `site/` app with its own manifest

The showcase lives in `site/` with its own `package.json`, lockfile and Vite
config. The root package keeps its runtime and dev dependencies focused on the
library and its test suites, and `site/` is excluded from the tarball by the
root `files` list.

Alternatives: adding three.js/highlighter to root `devDependencies` (simpler
install, muddies the package manifest); a separate repository (extra
coordination, loses the artifact/CI coupling). The separate directory matches
AD-028 and the roadmap's "not part of the npm package" boundary.

### D2 — Consume the locally built package, not the registry

`site/package.json` declares `"libfive-wasm": "file:.."`. npm links the root
package, and its `exports` resolve to `dist/index.js`, which carries the inlined
factory and the sibling `libfive.wasm`. This is a real package resolution, not
an import of `src/`.

A packed tarball was considered, but the site's lockfile would pin an integrity
hash that changes on every wasm build, breaking `npm ci`. The packed-tarball
path remains covered by `scripts/test-package.mjs`. If Vite's symlink handling
misbehaves, the fallback is an explicit alias from `libfive-wasm` to
`../dist/index.js` with matching TypeScript paths; the Pages build still needs
only the `dist` artifact. Vite must not pre-bundle the linked package in a way
that hides the wasm asset; the build is verified by the emitted-asset check.

### D3 — Deploy the artifact the main build already tested

A dedicated `pages.yml` is triggered by `workflow_run` for `build-wasm`,
filtered to `event == push`, `head_branch == main`, `conclusion == success`. It
checks out `github.event.workflow_run.head_sha`, downloads the `libfive-wasm`
artifact from that run, installs the site, runs the showcase tests, builds, and
deploys with `actions/deploy-pages`.

Alternatives: adding a deploy job to `build-wasm.yml` (couples package CI with
Pages permissions and risks concurrency cancellation); rebuilding wasm inside
the Pages workflow (duplicate compute and weaker provenance). The chosen flow
deploys exactly the artifact that passed the package gate.

Prerequisites: the repository must be public (GitHub Free does not serve Pages
from private repositories) and Pages must be configured with
`build_type=workflow`. These are manual, one-time repository settings recorded
in the change, not workflow side effects.

### D4 — Demo modules are the single source of truth

Each demo is a TypeScript module under `site/src/demos/` exporting metadata and
a default `build(libfive)` function. The catalog imports the builder for the
worker; the Code tab imports the same file with Vite's `?raw` query and displays
it. There is no duplicated snippet string and no `new Function`.

Consequences: the code view is the module source (including its imports and
function wrapper), which is honest and cannot drift; demos are type-checked and
linted like the rest of the site. A future editor can add string evaluation
without changing the catalog shape.

### D5 — Worker protocol and mesh ownership

One module worker owns one `init()` instance for the page session. The main
thread sends `{ type: 'mesh', demoId }`; the worker imports the catalog, builds
with that demo's module, calls `shape.mesh({ region, res })`, reads
`copyVerts()`/`copyTris()` (JS-owned copies), keeps the current `Mesh` alive
for STL export, and posts the buffers back as transferables. Switching demos
frees the previous shape and mesh before building the next.

Errors are posted as `{ type: 'error', demoId, message }` and rendered in the
demo panel. There is no cancellation protocol in this phase because demos are
small and static; a slow demo simply resolves when it finishes, and the UI
shows a building state.

STL requests use `{ type: 'stl' }`; the worker calls `exportSTL()` on the
current mesh and transfers the resulting `ArrayBuffer`. The main thread never
needs a `Mesh` object, so no wasm memory is exposed to UI code.

### D6 — Renderer: three.js with a studio look

The renderer is three.js, lazy-loaded with the demo route. A `WebGLRenderer`
with capped device pixel ratio, `OrbitControls`, a `PerspectiveCamera`, a
`MeshStandardMaterial` (clay roughness, neutral albedo), a `RoomEnvironment`
PMREM for soft reflections, a key directional light with a soft shadow, and a
shadow-catcher plane. The model is framed from the mesh bounds on load and on
resize. Rendering pauses when the Code tab is active or the page is hidden.

Alternatives: raw WebGL2 (smaller but costly to build camera, controls,
lighting); a matcap texture (simple, but another asset and less flexible). The
studio setup gives good results without external image assets and leaves room
for the gallery's material toggles.

### D7 — Hash routing and a static host

Routes are `#/` (gallery) and `#/p/<id>` (demo). Hash routing means GitHub
Pages needs no SPA fallback or `404.html` rewrite, and deep links work from a
plain static file server. The gallery is rendered from the demo catalog; an
unknown id renders a not-found state with a link back.

### D8 — Code view uses a small highlighter, not Monaco

The Code tab renders highlighted HTML from the raw module source with
highlight.js (TypeScript/JavaScript grammar and a local theme). A copy button
copies the source. No language service, diagnostics, or editing surface is
loaded. This keeps the site bundle small and avoids the Monaco worker/type
integration that belongs to the editor candidate.

### D9 — Demo validation lives in the package test suite

A root vitest test imports `site/src/demos/`, initializes the real artifact, and
meshes each demo at its declared region with a reduced resolution. It asserts a
non-zero triangle count and finite vertex components, and names the failing
demo on error. Running it in the existing `npm test` gate means every push and
PR validates catalog correctness, including changes that only touch `site/`.

Demo modules must therefore depend only on the package API and plain
TypeScript — no three.js or DOM imports — so Node can import them.

### D10 — ADR and documentation updates

This change adds **AD-028** to `docs/decisions.md` (status Accepted): the
showcase is a separate, non-published Vite app that consumes the locally built
package and deploys the tested artifact to GitHub Pages. It implements AD-007,
AD-009, AD-019 and AD-026; it does not alter or supersede them. The change also
updates `docs/roadmap.md` (status), `docs/architecture.md` (repo map),
`docs/build-system.md` (Pages workflow), `docs/packaging.md` (explicitly outside
the tarball), `README.md` (live link) and `package.json` `homepage`.

## Risks / Trade-offs

- **`file:..` + Vite symlink/wasm resolution** → spike the worker + wasm build
  first; verify the emitted `.wasm` asset in `site/dist`; fall back to an alias
  to `../dist/index.js` if needed.
- **`workflow_run` provenance plumbing** → filter event/branch/conclusion,
  check out `head_sha`, and request `actions: read`; fail loudly if the artifact
  is missing.
- **Pages prerequisites are manual** → document the visibility and
  `build_type=workflow` steps; the first deploy is a deliberate verification.
- **Bundle size** → lazy-load three.js and the demo route, keep the highlighter
  to one grammar, and avoid Monaco.
- **Mobile rendering** → cap pixel ratio, pause offscreen, and keep the initial
  demo mesh modest.
- **Public visibility is effectively one-way** → audit history and settings
  before flipping; no secrets are known to be tracked.
- **Demo drift** → the catalog test runs in the package gate, and the Code tab
  reads the same module file.
- **Synchronous mesh in the worker** → no cancel; keep demo scenes modest and
  show a building state. A future editor needs worker recycling/cancellation.

## Migration Plan

1. Land the site and tests with the repository still private; verify the build
   and package-consumption path locally/CI.
2. Add `pages.yml` and the ADR/docs updates.
3. Flip the repository to public and enable Pages with the workflow source.
4. Push to `main`, confirm `build-wasm` succeeds, then confirm `pages.yml`
   deploys the same artifact and the live URL renders a demo.
5. Rollback: disable Pages or revert `pages.yml`; the package and wasm build are
   unaffected.

## Open Questions

None blocking. The first-change demo set and visual polish can be tuned without
changing the specs; the gallery expansion is explicitly deferred to
`playground-gallery`.
