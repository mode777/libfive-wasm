# Design

## Context

`capture-thumbnails.mjs` spawns `vite preview --host 127.0.0.1 --port 4173
--strictPort`, waits for `http://127.0.0.1:4173/`, then captures each demo's
`?preview=1` route with puppeteer. On the verification server a foreign
listener already owns 4173, so the script exits before launching the browser.
The script already supports an external server via `CAPTURE_BASE_URL`, but
that leaves the operator to start and clean up a server by hand.

See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**

- `npm run thumbnails:capture` succeeds regardless of what listens on 4173.
- Deterministic server URL without parsing vite's stdout.
- Keep `CAPTURE_BASE_URL` behavior unchanged for externally managed servers.

**Non-Goals:**

- No changes to capture content (viewport, quality, manifest schema,
  `PREVIEW_VERSION`) — thumbnails stay byte-identical.
- No retry/timeout changes around browser or mesh waits.

## Decisions

### 1. Probe a free port with a loopback bind, then hand it to vite with `--strictPort`

Before spawning the preview server, bind `net.createServer` to `127.0.0.1:0`,
read the assigned port, close the socket, and start `vite preview --port
<port> --strictPort`. Derive `baseUrl` from the chosen port. `--strictPort`
keeps vite from silently drifting to another port (which would desync the
URL we wait on); the probe-to-bind race window is negligible for a dev
capture and fails loudly if hit.

*Alternatives considered:* parse vite's printed "Local:" URL from stdout —
rejected: output format is vite-version-dependent and already interleaved
with other output; retry loop over hardcoded ports — rejected: more moving
parts for no benefit over an OS-assigned port; keep 4173 with a
`CAPTURE_PORT` override — rejected: still fails by default on the server
where it matters.

## Risks / Trade-offs

- [Probe-to-bind race (another process takes the port in between)] →
  `--strictPort` makes vite fail loudly instead of drifting; rerunning gets a
  fresh port. Accepted for a developer tool.
- [Verified only on the real server, not in CI] → CI never runs a browser
  capture (script header documents this); the suites that guard thumbnails
  check manifest/images, which this change does not alter.

## Migration Plan

Single commit: script change + README docs → run the real capture on the
verification server (no `CAPTURE_BASE_URL`, port 4173 still occupied — the
exact failure conditions) → confirm success, restore any byte-identical
preview churn → suites + strict validation → commit and push; CI gate as
usual. Rollback: revert the commit (tooling only).

## Open Questions

None.
