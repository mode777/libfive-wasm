# Tasks

## 1. Docs tooling and ADR

- [x] 1.1 Record AD-029 (user documentation architecture: unified docs section
      in the showcase, one markdown pipeline, TypeDoc via typedoc-plugin-markdown,
      tooling in `site/`) in `docs/decisions.md` — status-table row plus a section
      matching the existing entry style. Verify: the table lists AD-029 and the
      section states Context/Decision like AD-028's.
- [x] 1.2 Add `typedoc`, `typedoc-plugin-markdown` and `marked` as exact-pinned
      devDependencies of `site/package.json`. Verify: `npm install` in `site/`
      succeeds and `package-lock.json` pins the exact versions.
- [x] 1.3 Add `site/typedoc.json` (`entryPoints: ["../src/index.ts"]`, root
      tsconfig, typedoc-plugin-markdown, output `site/docs-content/api/`) with a
      dedicated tsconfig fallback if the root tsconfig needs overrides; gitignore
      the generated output. Verify: TypeDoc runs from `site/` and emits markdown
      naming `init`, `Shape`, `Mesh`, `exportSTL` and `LibfiveError`.
- [x] 1.4 Write `site/scripts/build-docs.mjs`: compile `site/docs-content/guides/*.md`
      plus the generated `site/docs-content/api/` markdown into one generated TS
      content module (heading anchors, slug → title/section/HTML route table,
      sidebar structure) and wire site scripts `docs` (typedoc + compile),
      `docs:check` (generation must succeed with zero errors), `build`
      (`docs && vite build`) and `check` (`docs && tsc --noEmit`). Verify:
      `npm run docs` emits the content module and `npm run check` passes in `site/`.

## 2. API reference quality

- [x] 2.1 Audit the public surface exported by `src/index.ts` (`init`,
      `InitOptions`, `Libfive`, `RawLibfive`, `Shape`, `Mesh`, `exportSTL`,
      `LibfiveError`, option/mesh types) for TSDoc coverage and fill the gaps
      with doc comments only — no signature or behavior changes. Verify: the
      generated reference markdown (task 1.3) shows a non-empty summary for
      every public export.

## 3. Docs section in the showcase app

- [x] 3.1 Extend `site/src/router.ts` with docs routes (`#/docs/`,
      `#/docs/<slug>`; unknown docs slugs fall through to not-found). Verify:
      `parseRoute` handles the gallery, demo, docs and not-found cases (unit
      coverage arrives with the group-5 test suite).
- [x] 3.2 Add the lazy-loaded docs page module: docs landing (guides + API
      sections) and slug pages rendered from the generated content module with
      the sidebar navigation and active-entry highlight; wire the new route
      kinds into `site/src/app.ts`. Verify: `npm run dev`, open `#/docs/` and a
      content slug — both render; an unknown slug shows the not-found page.
- [x] 3.3 Add the docs section styles to `site/src/styles.css` from the existing
      tokens (paper/ink/accent, serif headings, mono nav labels, card/pill
      vocabulary) with prose rules for headings, lists, tables and blockquotes,
      and code blocks styled like the demo Code tab. Verify: visual check in
      `npm run dev` against the gallery/demo pages; `npm run build` in `site/`
      passes.
- [x] 3.4 Retarget the header Docs link in `site/src/chrome.ts` from the GitHub
      README to `#/docs/`. Verify: clicking Docs in the running site opens the
      docs landing.

## 4. Guide content and validation harness

- [x] 4.1 Add the checked-in nav manifest `site/docs-content/nav.json` and write
      `overview.md` (what the library is, scope, links into the docs) and
      `getting-started.md` (install → `init()` → first shape → mesh → STL).
      Add `tests/showcase-docs.test.ts` validating manifest ↔ files and
      intra-docs link resolution at source level (no generated output needed).
      Verify: `npm test -- --run tests/showcase-docs.test.ts` passes.
- [x] 4.2 Write the concept tutorials: `mesh-resolution.md` (`res` = inverse
      minimum feature size, larger = finer/slower), `shape-api.md` (coercion,
      CSG/blending/transform chaining), `memory-lifecycle.md` (`free()`,
      use-after-free errors, zero-copy views vs copies), `evaluation.md`,
      `workers.md`, `bundlers.md` — semantics matching the README where they
      overlap. Verify: the group-4 test suite stays green and each page renders
      at its `#/docs/<slug>` route in `npm run dev`.
- [x] 4.3 Write `three-js-integration.md`: a complete worked example meshing a
      shape, feeding `copyVerts()`/`copyTris()` into `BufferGeometry`
      attributes, index layout, shading-normal handling (creased/auto-smoothed
      note, as in the site viewport), and disposing copied buffers; extend the
      test suite to typecheck TypeScript fences (`libfive-wasm` resolves to
      `src/index.ts`, `three` fences resolve against the site's `three` types).
      Verify: the suite fails on an intentionally broken snippet, then passes.
- [x] 4.4 Surface the generated API reference in the docs navigation (API
      section landing + generated entries) and cover its links with the same
      link-resolution check when the content module is generated
      (`npm run docs` before the site-level checks). Verify: the sidebar lists
      guide and API entries and every entry navigates.

## 5. Baseline docs and integration

- [x] 5.1 Update `docs/architecture.md` (repo map: docs content/pipeline under
      `site/`) and `docs/roadmap.md` (add change 11 `showcase-docs`, Phase 6,
      done-when, and the change-to-ADR coverage note for AD-029). Verify: the
      described layout and status match the implemented tree.
- [x] 5.2 Document docs authoring in `site/README.md` (how to add a guide page,
      regenerate the API reference, what `docs:check` enforces). Verify: the
      documented commands run as written from a clean `site/` checkout.
- [x] 5.3 Update the root `README.md` showcase paragraph to mention the hosted
      documentation and link `#/docs/` (package `homepage` already points at the
      Pages site). Verify: the link target renders on the deployed URL shape.
- [x] 5.4 Integration check: root `npm test` (existing suites unaffected,
      showcase-docs suite green), `npm run check` and `npm run lint` in `site/`,
      `SITE_BASE=/libfive-wasm/ npm run build` in `site/`, and a `vite preview`
      smoke of `#/`, `#/p/<id>`, `#/docs/` and a docs slug. Verify: all commands
      pass and the previewed routes render.
- [x] 5.5 Confirm the npm tarball is unchanged by docs content: run the existing
      package-content check (`npm pack` inspection / `test-package` suite).
      Verify: no `site/` or docs files in the tarball listing.

## Workflow follow-up

- Push to `main`; after `build-wasm` succeeds, confirm the `pages` run deploys
  and the live site serves `#/docs/` and the header Docs link.
- Archive the change after the project's review requirements are satisfied,
  with the `showcase-site` delta synced and `docs/decisions.md` current.
