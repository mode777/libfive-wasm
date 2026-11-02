# Design

## Context

The showcase (`site/`) is a Vite + TypeScript SPA with hash routing
(`#/`, `#/p/<id>`), a clay design system in `src/styles.css`, and a header
whose "Docs" link currently points at the GitHub README
(`src/chrome.ts`). It deploys to GitHub Pages from the tested wasm artifact
via `pages.yml` (AD-028), consuming the package with `file:..`. The package's
public surface (`src/index.ts`) exports `init`, `Shape`, `Mesh`, `exportSTL`,
`LibfiveError` and types, with moderate TSDoc coverage (~70 doc blocks across
`src/api/`, `src/loader/`). The site already depends on `three`,
`@types/three` and `highlight.js`. The unified docs-in-showcase approach was
chosen by the user; the architecture is recorded as a new ADR (AD-029).

## Goals / Non-Goals

**Goals**

- One docs section that looks and behaves like the rest of the showcase (same
  chrome, tokens, typography), reachable at `#/docs/…` and from the header.
- A single markdown pipeline shared by hand-written guides and the
  TypeDoc-generated API reference.
- Docs tooling lives entirely in `site/` (AD-028: the site is a separate
  consumer); the published package manifest is untouched (AD-026).
- CI-validated content: navigation ↔ files, link integrity, typechecked
  examples, generation success gating the deploy.

**Non-Goals**

- No search beyond generated heading anchors; no versioned docs; no comments.
- No live playground/editor (separate roadmap candidate).
- No changes to package runtime code or its public API (TSDoc comment
  additions only, no behavior).
- No contributor-facing translation of `docs/` ADR/baseline material into
  user pages; guides are written fresh for consumers.

## Decisions

### D1 — Docs are routes inside the showcase app (AD-029)

New `docs` variants in the router's `Route` union (`#/docs/`, `#/docs/<slug>`)
render a lazy-loaded docs module (same pattern as `demo-page.js`). The docs
landing lists guides and API sections in a persistent sidebar. Unknown slugs
reuse the existing not-found page. The header's Docs link targets `#/docs/`.

*Alternatives*: TypeDoc's HTML output with a custom theme under `/api/`
(rejected: two navigation systems and two designs to keep in sync, weakening
the design-mimicry requirement); a standalone VitePress/docusaurus deployment
(rejected: separate theme + build + deployment path contradicts AD-028's
single-consumer-site framing and the agreed unified approach).

### D2 — One build-time markdown pipeline

A `site/scripts/build-docs.mjs` compiles checked-in markdown from
`site/docs-content/guides/*.md` **and** generated TypeDoc markdown from
`site/docs-content/api/` into a single generated TS content module
(`site/src/docs/generated/content.ts`, gitignored): heading-id anchors, a
route table (slug → title, section, HTML), and the sidebar structure. Markdown
is parsed with `marked` (the only new rendering dependency); code fences are
pre-tokenized with the already-present `highlight.js`. The docs page imports
only the generated module, so the content ships in the docs route's lazy
chunk.

*Alternatives*: runtime markdown rendering (rejected: ships a parser to
visitors and pushes anchor/route derivation into app code); checking in the
generated module (rejected: unlike AD-024's stdlib surface — which other code
consumes and drift-checks — the generated docs serve only the site, are bulky
in review, and CI builds them deterministically from pinned devDeps).

### D3 — TypeDoc in `site/`, pointed at the package source

`site/typedoc.json` sets `entryPoints: ["../src/index.ts"]`,
`tsconfig: "../tsconfig.json"`, plugin `typedoc-plugin-markdown`, output
`site/docs-content/api/` (gitignored), with `typedoc` and
`typedoc-plugin-markdown` pinned exact in `site` devDependencies. Site
scripts: `docs` (typedoc → compile guides → emit content module), `docs:check`
(generation must succeed with zero errors; warnings listed). Site `build` =
`docs && vite build` and `check` = `docs && tsc --noEmit`, so `pages.yml`
needs **no changes**: it already runs `npm ci`, `npm run check`,
`npm run build` with the tested artifact. A first task audits/fills TSDoc on
public exports so the reference is substantive (comments only).

*Alternatives*: TypeDoc at the repo root (rejected: adds devDeps to the
published package's manifest for a showcase concern); TypeDoc's HTML theme
(rejected: see D1).

### D4 — Guide content set (checked in)

`site/docs-content/guides/`: `overview.md`, `getting-started.md`, concepts —
`mesh-resolution.md` (`res` = 1/min-feature), `shape-api.md` (coercion,
CSG/blending chains), `memory-lifecycle.md` (`free()`, use-after-free,
zero-copy views), `evaluation.md`, `workers.md`, `bundlers.md` — plus
`three-js-integration.md`. The three.js article mirrors the site's own
viewport practice: `copyVerts()`/`copyTris()` into `BufferGeometry`
attributes, index layout, `toCreasedNormals`-style shading note, and disposal
of copies. Examples favor snippets already proven by the README and demo
catalog.

### D5 — Docs validation without depending on generated output

Root `tests/showcase-docs.test.ts` works at source level: a checked-in nav
manifest (`site/docs-content/nav.json`) must match the guide files; intra-docs
links resolve to files/anchors; fenced ```ts blocks are extracted to a scratch
project and typechecked — `libfive-wasm` imports resolve to `src/index.ts`,
three.js snippets to the site's `three` types (`nocheck` fence tag only for
pseudo-code). TypeDoc success is enforced separately by site `docs:check` in
the Pages build (spec: generation failure fails the deploy).

*Alternatives*: validating the generated content module (rejected: couples
root tests to TypeDoc output shape); executing all examples against wasm
(rejected: slow; the typecheck plus README/demo parity is proportionate).

### D6 — Visual mimicry by reuse, not copying

Docs styles extend `site/src/styles.css` using the existing tokens
(`--paper/--ink/--accent/--serif/--mono/--radius/--shadow`), prose rules for
headings/tables/blockquotes, sidebar with the gallery's card/pill vocabulary,
and code blocks styled like the demo Code tab. No third-party doc CSS.

## Risks / Trade-offs

- [TypeDoc/plugin upgrades change generated markdown] → Pin exact versions;
  `docs:check` gates the deploy; regeneration is one command.
- [Thin TSDoc makes the reference sparse] → Dedicated TSDoc audit task before
  wiring the reference in; warnings surfaced by `docs:check`.
- [Docs content drifts from the API] → Example typecheck harness (D5) fails
  CI on stale snippets.
- [Bundle growth] → Content lives in the lazy docs chunk only; guides stay
  markdown-lean.
- [`marked` renders raw HTML] → Content is first-party, user input never
  reaches the pipeline; HTML in markdown sources is not used.
- [TypeDoc over root `src/` trips on root tsconfig layout] → Dedicated
  `typedoc.tsconfig.json` fallback; generation failure fails the build loudly
  rather than shipping empty docs.

## Migration Plan

Purely additive to `site/` and docs. Land on `main`; the next successful
`build-wasm` run publishes docs with the site through the unchanged
`pages.yml`. Rollback = revert the change; the site returns to the README
Docs link. No data, API, or artifact migration.

## Open Questions

None — slug names and page ordering are implementation details within D4's
set.
