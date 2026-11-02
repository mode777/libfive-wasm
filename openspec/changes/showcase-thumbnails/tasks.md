# Tasks

## 1. Preview mode and capture

- [x] 1.1 Extend hash routing to accept `#/p/<id>?preview=1` and add an
  `is-preview` layout on the demo page that hides tabs, header, meta bar, aside,
  footer and status chrome and fixes the stage to a 16:10 frame; verify normal
  demo routes are unchanged.
- [x] 1.2 Add `site/scripts/capture-thumbnails.mjs` using `puppeteer-core`,
  `CHROME_SHELL_PATH` and SwiftShader flags; it starts `vite preview`, reads demo
  ids from the gallery cards, captures each preview at 640×400 CSS / DPR 2 to
  WebP, and writes `src/assets/previews/manifest.json` with source hashes and
  capture metadata; verify a dry run names every catalog demo.
- [x] 1.3 Capture all twelve thumbnails on the verification server and check the
  WebP files and manifest into `site/src/assets/previews/`; verify every image
  opens, has the expected aspect ratio and is visually consistent.

## 2. Gallery integration

- [x] 2.1 Load preview URLs with Vite's `import.meta.glob`, render the image on
  each card when present, and keep the CSS orb fallback; verify all twelve cards
  show images in a production build.
- [x] 2.2 Add lazy loading, async decoding, explicit dimensions, a subtle bottom
  gradient and a restrained hover scale in the card visual; verify no layout
  shift and a usable mobile card grid.
- [x] 2.3 Verify the gallery route still does not request the three.js,
  wasm/worker or highlighter chunks and that thumbnails are content-hashed and
  browser-cacheable.

## 3. Drift validation and docs

- [x] 3.1 Add `tests/showcase-thumbnails.test.ts` checking every demo has a
  manifest entry and non-empty image, source hashes match the demo modules, and
  no orphan entries exist; verify a changed demo makes the test fail.
- [x] 3.2 Document the preview mode, capture command, Chrome/SwiftShader
  requirement, `previewVersion` recapture rule and fallback behavior in
  `site/README.md`; verify the documented command matches the script.

## 4. Verification

- [x] 4.1 Run root `npm test`, `npm run check`, `npm run lint` and site
  `npm run check`, `npm run lint`, `npm run build`; verify all pass and the
  package tarball still excludes preview assets and capture tooling.
- [ ] 4.2 Browser smoke the built gallery at desktop and mobile widths, confirm
  thumbnails are sharp/lazy-loaded and the gallery remains lightweight, then
  commit/push and verify `build-wasm` and `pages.yml` succeed.
- [ ] 4.3 Smoke-test the live gallery thumbnails and record the URL.
