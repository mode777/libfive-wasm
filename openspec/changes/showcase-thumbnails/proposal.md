# Proposal

## Why

The gallery currently represents every demo with a CSS orb, so the overview page
does not show the actual models. Loading twelve live WebGL previews would pull
three.js and the wasm worker into a route that is deliberately kept light. A
pre-rendered thumbnail gives the gallery a real, attractive preview without
changing that performance boundary.

## What Changes

- Add a **preview mode** to the demo page and a capture script that renders each
  demo with the real studio viewport in headless Chrome/SwiftShader, then writes
  a 2x WebP thumbnail (16:10, no UI chrome) under `site/src/assets/previews/`.
- Add a checked-in thumbnail manifest containing each demo's image, source hash
  and capture metadata.
- Show the thumbnail on each gallery card, with lazy loading and a subtle
  overlay; keep the existing CSS orb as a fallback when an image is missing.
- Add a **drift test** that fails when a demo changed after its thumbnail was
  captured, and document the capture/recapture procedure in `site/README.md`.
- Keep the gallery route free of three.js, the wasm worker and the highlighter;
  thumbnails are plain Vite-hashed images.

This introduces no new ADR. It is a site-only presentation improvement that
supports AD-028 and does not alter the package, wasm artifact, Pages workflow or
publish path.

## Capabilities

### New Capabilities

- `showcase-thumbnails`: pre-rendered gallery card previews, their capture
  manifest, drift validation, caching and visual treatment.

### Modified Capabilities

<!-- No existing capability requirements change. `showcase-gallery` owns
     coverage and filtering; this capability owns card preview images. -->

## Impact

- **Site:** `site/src/gallery.ts`, styles, a preview/capture mode in the demo
  page/router, `site/scripts/capture-thumbnails.mjs`, checked-in WebP assets and
  a manifest, `site/package.json` capture script/dependency, and `site/README.md`.
- **Tests:** a source-hash/manifest coverage test plus the existing gallery
  smoke; no package tests change.
- **Verification:** capture runs on the verification server with
  `chrome-headless-shell` and SwiftShader; CI consumes the checked-in images.
- **Perimeter:** no changes to the npm tarball, wasm build, golden images or
  Pages deployment workflow.
