# Proposal

## Why

The package ships with a README and an ADR/design baseline written for
contributors, but a consumer visiting the GitHub Pages site has no user
documentation: the header's "Docs" link falls back to the repository README
(`site/src/chrome.ts`), and there are no hosted overview, tutorial, concept or
integration pages. The library's trickiest ideas (`res` as the inverse minimum
feature size, the explicit memory model, worker/bundler wiring) are exactly the
ones that need proper prose documentation, and the installed-generated API
surface has none.

## What Changes

- Add a **documentation section to the showcase site** on GitHub Pages, using
  the unified approach agreed for this change: markdown content rendered by the
  showcase app itself, through its existing clay design system (same header,
  footer, typography, cards), at new hash routes under `#/docs/…`.
- Hand-written **guides**: a library overview page, a "Getting started"
  tutorial (install → `init()` → first shape → mesh → STL), tutorials for the
  most important concepts (`res`/meshing quality, the Shape API and CSG
  chaining, memory and object lifecycle, evaluation, workers, bundlers), and an
  article on integrating JS 3D libraries with a worked **three.js** example
  (buffers, indexing, creased normals, disposal) consistent with how the
  showcase's own viewport consumes the package.
- A generated **API reference** produced by TypeDoc from the package's
  TypeScript entry point (`src/index.ts`), converted to markdown
  (`typedoc-plugin-markdown`) and rendered through the same docs pipeline and
  design system as the guides — one navigation, one look, one deployment.
- Docs **navigation**: a docs landing page (`#/docs/`) with a persistent
  sidebar/table of contents; the site header's "Docs" link now targets
  `#/docs/` instead of the GitHub README; the README's showcase paragraph and
  the package `homepage` keep pointing at the live site (docs included).
- **Build integration**: TypeDoc and the markdown conversion live as
  devDependencies of the showcase app (`site/`), run as a docs build step that
  emits generated markdown into the site's content tree before `vite build`;
  the existing Pages workflow deploys docs and showcase together with no new
  deployment path and no registry fetch of `libfive-wasm`.
- **Validation**: CI checks that every guide page exists and links resolve
  within the docs section, that the TypeDoc generation succeeds and covers the
  package's documented exports, and that no docs file leaks into the npm
  tarball.
- Record the docs architecture as a new ADR (AD-029) and update the roadmap.

Out of scope: a live playground/editor (separate roadmap candidate), search
infrastructure beyond TypeDoc's generated index anchors, versioned/multi-release
docs, translating the contributor-facing `docs/` baseline into user pages, and
any change to the package's runtime code or public API.

## Capabilities

### New Capabilities

- `showcase-docs`: the user documentation contract for the GitHub Pages site —
  a docs section rendered by the showcase app in its own design system, with an
  overview, getting-started and concept tutorials, a three.js/3D-library
  integration article, a TypeDoc-generated API reference rendered through the
  same pipeline, docs navigation and deep links, the retargeted header Docs
  link, deployment with the existing Pages workflow, and CI validation of
  content presence, link integrity and tarball exclusion (implements AD-029).

### Modified Capabilities

- `showcase-site`: the Pages deployment requirement is exercised for a site
  that now bundles the docs section — the docs build step runs inside the same
  `pages.yml` build with the same constraints (tested artifact, no registry
  fetch, single deployment); no existing scenario's outcome changes.

## Impact

- **New code**: `site/src/docs/` (markdown content, docs renderer, routes) and
  a docs build script under `site/scripts/`; generated TypeDoc markdown output
  (gitignored, built fresh in CI and locally).
- **Modified code**: `site/src/chrome.ts` (Docs link target), `site/src/router.ts`
  and `site/src/app.ts` (docs routes), `site/src/styles.css` (docs styles reusing
  existing tokens), `site/index.html`, `.github/workflows/pages.yml` (docs build
  step), `README.md` (docs link), `docs/roadmap.md` (new change), and
  `docs/decisions.md` (AD-029).
- **Dependencies**: `typedoc` and `typedoc-plugin-markdown` added to
  `site/package.json` devDependencies only; the npm package gains no
  dependencies.
- **Specs**: new `showcase-docs` capability; a deployment-note delta to
  `showcase-site`. No runtime, wasm, ABI or packaging behavior changes.
