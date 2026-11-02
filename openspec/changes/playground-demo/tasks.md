# Tasks

## 1. Site scaffold and local package consumption

- [x] 1.1 Create `site/` as a Vite + TypeScript app with its own `package.json`
  (`libfive-wasm: file:..`, three, highlight.js, vite, typescript), `index.html`,
  `vite.config.ts`, `tsconfig.json` and a minimal entry page; verify
  `npm install && npm run build` in `site/` succeeds with `dist/` present.
- [x] 1.2 Configure the Vite base path for project Pages (`/libfive-wasm/` in
  CI, `/` locally), worker format and asset emission; verify a production build
  emits `libfive.wasm`, the bundled entry and a worker chunk under `site/dist`.
- [x] 1.3 Add `site/dist/` and site-local caches to `.gitignore`; verify
  `git status --ignored` shows the build output ignored and no generated
  artifacts are staged.
- [x] 1.4 Add site scripts for `dev`, `build`, `preview`, `check` and `lint`;
  verify each script exists and `npm run check` passes on the scaffold.

## 2. Demo contract, worker and validation

- [x] 2.1 Define the demo module contract (metadata: id, title, description,
  features, region, res; default builder taking `Libfive`) and a catalog that
  imports builders plus raw sources; verify the catalog typechecks and exposes
  every demo once.
- [x] 2.2 Implement four initial demos spanning CSG, shapes, transforms and
  text; verify each module builds a `Shape` and meshes to a non-empty result in
  Node against `dist/`.
- [x] 2.3 Split the worker's demo execution into a pure `runDemo(libfive,
  demoId)` helper (build, mesh, copy views, keep the current mesh, export STL,
  free the previous result) and a thin worker message layer; verify the helper
  with unit tests for mesh counts, buffer ownership and STL size.
- [x] 2.4 Implement the worker protocol (`mesh`, `stl`, error responses,
  transferables) and wire it to the app state; verify a worker error surfaces a
  named message instead of a blank viewport.
- [x] 2.5 Add `tests/showcase-demos.test.ts` that imports the catalog, meshes
  every demo at low resolution against the real artifact, and asserts non-empty
  finite geometry; verify `npm test` fails when a demo builder throws or returns
  an empty mesh.

## 3. Renderer and demo page

- [x] 3.1 Implement the three.js viewport: renderer, orbit controls, studio
  lighting/environment, clay material, shadow catcher, mesh framing and resize;
  verify a production build and a local preview render the sphere demo without
  console errors.
- [x] 3.2 Implement the 3D/Code tabs and read-only highlighted source with a
  copy button; verify the displayed source equals the demo module's raw source
  and that switching back to 3D does not trigger a new mesh request.
- [x] 3.3 Add mesh stats and an STL download that uses the worker-exported
  buffer; verify the downloaded file's triangle count matches the reported
  count.
- [x] 3.4 Add the responsive layout and loading/error states; verify the
  viewport, tabs and code panel remain usable at mobile and desktop widths.

## 4. Gallery and routing

- [x] 4.1 Implement hash routing for `#/` and `#/p/<id>` with a not-found state;
  verify direct navigation and browser back/forward work.
- [x] 4.2 Implement the gallery cards with title, description and feature
  labels; verify every catalog demo is listed and links to its route.
- [x] 4.3 Apply the site visual theme (typography, clay/studio palette,
  responsive card grid); verify the built site has no missing styles or assets.

## 5. Pages deployment

- [x] 5.1 Add `pages.yml` triggered by a successful `build-wasm` run on `main`
  with `pages: write`, `id-token: write` and `actions: read`; download the
  tested `dist` artifact, install/build `site/`, upload and deploy; verify the
  workflow YAML is valid and the artifact step names match.
- [x] 5.2 Make `site` production builds consume the downloaded `dist` artifact
  and verify the Pages workflow does not rebuild wasm or fetch `libfive-wasm`
  from the registry.
- [x] 5.3 Make the repository public and enable Pages with
  `build_type=workflow` (manual prerequisite); verify
  `gh api repos/mode777/libfive-wasm/pages` reports the workflow build type.
- [x] 5.4 Push to `main`, confirm `build-wasm` succeeds, then confirm
  `pages.yml` deploys the same run's artifact; verify the live URL returns the
  app shell and a demo route loads.
- [x] 5.5 Document the rollback path (disable Pages or revert `pages.yml`) and
  verify it does not affect the package or wasm build.

## 6. ADR and documentation

- [x] 6.1 Add **AD-028** to `docs/decisions.md` (status Accepted, table row and
  section) recording the separate, non-published showcase built from the local
  package and deployed from the tested artifact; verify the IDs are sequential
  and the existing ADRs are unchanged.
- [x] 6.2 Update `docs/roadmap.md` (status), `docs/architecture.md` (repo map),
  `docs/build-system.md` (Pages workflow), `docs/packaging.md` (site excluded
  from the tarball), `README.md` (live link) and `package.json` (`homepage`);
  verify each file describes the implemented behavior.
- [x] 6.3 Run `npx @fission-ai/openspec@latest validate --all --strict` and
  `npm run check`; verify both pass with the new change and docs.

## 7. Integration verification

- [x] 7.1 Run the full root test suite and verify the showcase demo validation
  is included and passes against the real artifact.
- [x] 7.2 Run `npm run test:package` and verify the tarball still excludes
  `site/` and the consumer build still emits the wasm asset.
- [x] 7.3 Run a clean `site` install/build from the CI artifact layout and
  verify the output contains the app shell, worker chunk, wasm and code assets.
- [x] 7.4 Smoke-test the deployed gallery and one demo page (3D, Code, STL) and
  record the live URL in the change summary.

## Workflow follow-up

- Archive the change after review and the live deployment is verified.
