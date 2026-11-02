# Proposal

## Why

The thumbnail capture script starts its `vite preview` server on the hardcoded
port 4173 with `--strictPort`. The shared verification server currently has a
leftover listener on 4173 (a process from another PID namespace that this
account cannot kill), so every capture run dies at startup with "Port 4173 is
already in use" and the workaround (manually starting a server elsewhere plus
`CAPTURE_BASE_URL`) is undocumented toil.

## What Changes

- `site/scripts/capture-thumbnails.mjs`: when starting its own preview server,
  probe a free localhost port instead of hardcoding 4173, pass that port to
  `vite preview --strictPort`, and derive the base URL from it. The external
  `CAPTURE_BASE_URL` path is unchanged. No manifest, viewport, quality or
  capture-pipeline changes — thumbnails are byte-identical, so no
  `PREVIEW_VERSION` bump.
- `site/README.md`: the capture section documents the free-port behavior and
  the `CAPTURE_BASE_URL` override.

Pure developer tooling with no spec-level behavior change: gallery behavior,
manifest invariants and drift validation are untouched, so this change opts
out of specs (`skip_specs: true`).

Decision impact: none — no ADR added or superseded; the capture flow remains
the AD-028 showcase capture, now tolerant of an occupied default port.

## Capabilities

### New Capabilities

(none — skipped: pure tooling change)

### Modified Capabilities

(none)

## Impact

- `site/scripts/capture-thumbnails.mjs` — free-port probe + dynamic base URL.
- `site/README.md` — capture docs.
- No published-package, manifest, or thumbnail-image changes; verification is
  a real capture run on the verification server while port 4173 is occupied.
