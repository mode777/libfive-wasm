# Proposal

## Why

The package has a rich API and a verified artifact, but nothing demonstrates it
in a browser. A public showcase gives users a concrete way to see the `Shape`
API, the generated stdlib, zero-copy meshes and STL export working in a real
consumer, and gives the project a live URL for the README and npm metadata.
Shipping it now, before the npm publish, is possible because the site consumes
the locally built package rather than the registry.

## What Changes

- Add a separate Vite + TypeScript showcase app under `site/`:
  - gallery of curated demos and a demo page with **3D** and **Code** tabs;
  - the Code tab is read-only and displays the exact demo module source that
    the mesh worker executed (no live editor yet);
  - three.js viewport with orbit controls, a clay-style material, soft shadow
    and responsive sizing;
  - a module worker that instantiates `libfive-wasm`, runs the demo builder,
    meshes off the main thread, transfers typed arrays and caches the current
    mesh for STL export.
- Consume `libfive-wasm` from the locally built package (`file:..`), never
  from the npm registry. The site is not part of the published tarball.
- Add `pages.yml`: after `build-wasm` succeeds on `main`, download the tested
  `dist` artifact, build the site, and deploy it to GitHub Pages. Configure the
  repository for public Pages (manual visibility and Pages enablement are
  recorded prerequisites).
- Add a CI validation test that imports every demo builder, meshes it at low
  resolution against the real artifact, and asserts non-empty finite geometry.
- Introduce **AD-028** in `docs/decisions.md`: the showcase is a separate,
  non-published consumer app built from the locally built package and deployed
  to Pages. Update the roadmap status, architecture repo map, packaging notes,
  README and `package.json` homepage reference.

This change does not alter the package runtime, the wasm build, or any existing
public API. It implements AD-007 (browser/ESM use), AD-009 (mesh off the main
thread via a worker), AD-019 (artifact location) and AD-026 (bundled entry),
and adds AD-028.

## Capabilities

### New Capabilities

- `showcase-site`: public demo application behavior — Pages deployment from
  the tested artifact, gallery and demo navigation, 3D rendering, read-only
  code view, worker meshing, and demo validation.

### Modified Capabilities

<!-- No existing capability requirements change. -->

## Impact

- **New:** `site/` (application, demo modules, worker, tests), `pages.yml`,
  `site/package.json` and lockfile.
- **Docs:** `docs/decisions.md` (AD-028), `docs/roadmap.md` (schedule and
  status), `docs/architecture.md` (repo map), `docs/packaging.md` (explicitly
  outside the tarball), `README.md`, `package.json` `homepage`.
- **Repository settings:** public visibility and GitHub Pages enabled with a
  GitHub Actions source. These are manual prerequisites, not package changes.
- **Dependencies:** site-only dev dependencies (three.js and a small code
  highlighter); no runtime dependencies are added to `libfive-wasm`.
- **CI:** a new Pages workflow and a demo validation suite; the existing
  `build-wasm` quality gate remains the source of the deployed artifact.
