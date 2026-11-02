# Design

## Context

The gallery route is deliberately light: it does not load the three.js viewport,
the mesh worker or the code highlighter, and the current cards use a CSS orb
(`site/src/gallery.ts`). The demo route lazy-loads `demo-page.ts`, which owns the
worker, worker client, viewport and highlighter. The demo page already frames
each mesh with a deterministic camera and studio lighting.

The verification server has `chrome-headless-shell` with SwiftShader, and the
site's screenshots are already captured there. Vite content-hashes imported
assets. Demo source files are named by demo id, and the catalog is
Node-importable; the root test suite already meshes every demo.

This is a site-only presentation change. It introduces no new ADR and supports
AD-028.

## Goals / Non-Goals

**Goals:**

- Real, attractive thumbnails on every gallery card.
- No three.js, worker or highlighter on the gallery route.
- A repeatable capture workflow and a drift check that prevents stale art.
- Graceful fallback and no layout shift.

**Non-Goals:**

- Interactive or auto-rotating previews on the overview (that needs prebuilt
  meshes plus a shared renderer and changes the gallery loading contract).
- Caching worker meshes in IndexedDB for demo revisits.
- Changing the demo page's live behavior, package artifact or Pages workflow.
- Generating thumbnails during the Pages deployment; images are reviewed and
  checked in.

## Decisions

### D1 — Static WebP thumbnails, not runtime previews

The cards use pre-rendered WebP images. This keeps the gallery at its current
lightweight boundary, avoids twelve WebGL contexts and gives deterministic,
reviewable art.

Alternatives:

- **Prebuilt low-res meshes + shared renderer**: interactive, but loads three.js
  on the gallery, adds a shared-renderer/copy-to-2D-canvas layer, and changes the
  lazy-loading contract. Deferred.
- **One hover hero canvas**: a nice compromise later, but still needs three on
  the gallery. Not part of this change.
- **Runtime mesh cache**: doesn't help the first overview load. Not part of this
  change.

### D2 — Capture from the real demo page in a preview mode

A small preview mode reuses the actual viewport rather than duplicating a
renderer:

- `parseRoute` accepts a `preview` query on `#/p/<id>?preview=1` and returns the
  flag alongside the demo id. Normal demo routes are unchanged.
- `DemoPage` adds an `is-preview` class when the flag is set. Preview CSS hides
  the site header, tabs, meta bar, aside, footer and status chrome, and sizes the
  stage body to a fixed 16:10 frame.
- The viewport still uses its deterministic default camera and studio material,
  so the image matches the live demo. No animation or interaction is needed; the
  capture waits for the mesh and a rendered frame.

The capture frame is **640×400 CSS pixels at deviceScaleFactor 2** (1280×800
output), WebP quality 82. That is crisp at the card size (roughly 300×188) and
keeps each file small.

Alternative: capture the normal demo page and hide elements from the script.
Rejected because it couples the capture script to incidental DOM classes and
makes the framing harder to keep consistent.

### D3 — Checked-in capture, not CI capture

`site/scripts/capture-thumbnails.mjs` uses `puppeteer-core` with
`CHROME_SHELL_PATH` and SwiftShader flags. It:

1. starts `vite preview` against a production build,
2. reads the demo ids from the gallery's card links,
3. opens each `#/p/<id>?preview=1`, waits for the mesh and a frame,
4. screenshots the preview surface to
   `site/src/assets/previews/<id>.webp`,
5. writes `site/src/assets/previews/manifest.json` with each demo's source hash,
   dimensions and capture settings.

It runs on the verification server (or any machine with a suitable Chrome).
CI consumes the checked-in images; the Pages workflow stays unchanged. This
matches the project's reviewed-capture pattern for goldens and avoids adding a
browser install to every deploy.

`puppeteer-core` is a site devDependency only. The capture script is not shipped
and the npm tarball is untouched.

### D4 — Gallery integration and caching

The gallery imports the images through Vite:

```ts
const previews = import.meta.glob('./assets/previews/*.webp', {
    eager: true,
    query: '?url',
    import: 'default',
});
```

The map is keyed by file basename (the demo id). A card uses an `<img>` when a
preview exists, otherwise the existing CSS orb. The image is decorative
(`alt=""`) because the card title and description already identify the demo;
explicit `width`/`height` and the existing aspect-ratio container prevent layout
shift. `loading="lazy"` and `decoding="async"` keep the initial gallery load
cheap. Vite emits content-hashed image URLs, so browser caching is automatic; no
service worker or runtime cache is needed.

The card keeps the ordinal and feature chip overlay. A subtle bottom gradient
and a soft image scale on hover make the art feel intentional without changing
the card body.

### D5 — Drift validation

The manifest stores a SHA-256 of each demo module. A root Node test
(`tests/showcase-thumbnails.test.ts`) reads the manifest with `node:fs` and
asserts:

- every catalog demo has a manifest entry and image file,
- the recorded source hash equals the current hash of
  `site/src/demos/<id>.ts`,
- the image file is non-empty,
- there are no orphan preview entries.

This catches the common drift case: a demo's shape or metadata changed but its
thumbnail was not recaptured. Visual changes to the shared viewport or card
styles are not caught by demo source hashes; the manifest's `previewVersion`
field and the `site/README.md` procedure require a recapture when the viewport,
lighting, material or preview CSS changes.

## Risks / Trade-offs

- **Headless WebGL fidelity** → capture with the same Chrome/SwiftShader setup
  used for existing screenshots; review the checked-in images; the capture is a
  deliberate, reviewable step.
- **Stale thumbnails** → source-hash test for demo changes; `previewVersion`
  bump and recapture procedure for shared visual changes.
- **Image weight** → 1280×800 WebP q82 per demo; measure the total and keep it
  under a small budget (roughly 1–1.5 MB for twelve).
- **Preview mode leaking into the normal page** → the flag only adds a CSS class
  and route metadata; normal demo routes ignore it and keep the current layout.
- **Lazy loading and first paint** → images are below the hero; native lazy
  loading plus hashed URLs keep the first card row responsive; fallback orb
  prevents broken images.
- **Capture script rot** → document the command and Chrome requirement in
  `site/README.md`; the script reads ids from the gallery rather than duplicating
  the catalog.

## Migration Plan

No data or API migration. The gallery adds images when present and keeps the orb
otherwise. Rollback is deleting the preview assets/script and reverting the card
markup; the demo page and package are unaffected.
