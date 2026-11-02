# Tasks

## 1. Capture script port selection

- [x] 1.1 In `site/scripts/capture-thumbnails.mjs`: add a free-port probe (loopback bind on port 0), spawn `vite preview --port <port> --strictPort`, derive `baseUrl` from it when `CAPTURE_BASE_URL` is unset, and update the header usage comment; verify `node --check site/scripts/capture-thumbnails.mjs` passes.
- [x] 1.2 Update the capture section of `site/README.md` to document free-port selection and the `CAPTURE_BASE_URL` override; verify the documented flow matches the script exactly.

## 2. End-to-end verification and landing

- [x] 2.1 On the verification server (port 4173 occupied): sync, build the site, run `npm run thumbnails:capture` WITHOUT `CAPTURE_BASE_URL` and confirm it completes ("wrote 25 thumbnails"); check `git diff` on `site/src/assets/previews/` and restore the files if only `capturedAt` churned (no visual change expected).
- [x] 2.2 Run root `npm test` and `cd site && npm run check`; confirm green (thumbnail hash test unaffected).
- [ ] 2.3 Run `npx @fission-ai/openspec@latest validate --all --strict`, commit on `main` (concise imperative subject) and push; verify CI `build-wasm.yml` is green.

## Workflow follow-up

- Archive the change after review (`/opsx-archive`) — `skip_specs` change, no spec sync.
