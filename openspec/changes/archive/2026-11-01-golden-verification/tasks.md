# Tasks

Artifact-backed tasks (2.x, 4.x) need a release build in `dist/`; locally the
build runs on the verification server.

## 1. Golden harness

- [x] 1.1 Add `tests/support/golden.ts`: scene definitions (sphere, gyroid,
  blended union, text) built through `init()` and the public `Shape`/stdlib
  API with fixed regions/resolutions; artifact loading from `dist/`; float32
  prefix hashing (SHA-256 over `min(vertCount*3, 6144)` components); a pure
  `compareGolden`; and a capture writer used only when `GOLDEN_CAPTURE=1`.
  Verify: `npm run check` accepts the helper, and a unit test with a synthetic
  mesh shows matching input passes and changed counts/hash throw.
- [x] 1.2 Add `tests/golden.test.ts`: build each scene, mesh it, compare against
  `tests/goldens/<scene>.json`, fail on missing/malformed goldens, and add the
  one-float32-ulp fault-injection self-test. Verify: `npx vitest run
  tests/golden.test.ts` fails before capture with a clear missing-golden
  message and passes after capture.
- [x] 1.3 Add `scripts/capture-goldens.mjs` and package scripts `golden`
  (`vitest run tests/golden.test.ts`) and `golden:capture` (the capture
  script). The capture script must require a release artifact, print the vendor
  pin and wasm digest, set `GOLDEN_CAPTURE=1`, and invoke vitest. Verify:
  `npm run golden:capture` rewrites every golden, `npm run golden` is
  read-only, and running the capture without `dist/libfive.wasm` fails with an
  actionable message.
- [x] 1.4 Capture the four goldens from the current release artifact and check
  them in under `tests/goldens/`. Verify: the committed JSON entries record
  scene, region, res, counts, hashed component count, vertex hash and vendor
  commit; `npm run golden` passes against the same artifact and fails when one
  golden is perturbed.

## 2. Build and CI integration

- [x] 2.1 Extend `scripts/build-wasm.sh` to run the golden suite after the
  smoke and interval suites for release builds when the vitest binary is
  installed, skipping with a warning otherwise and honoring `--no-tests`.
  Verify: a release build with dev dependencies runs the suite and fails on a
  deliberately perturbed golden; `--no-tests` skips all three.
- [x] 2.2 Update `.github/workflows/build-wasm.yml` to install dev
  dependencies before the build (so the build's golden step is active) and keep
  the package suite step; ensure the golden mismatch fails the job. Verify: the
  workflow YAML parses and the step order is checkout → emsdk → node → npm ci →
  build → package tests → digest/upload.
- [x] 2.3 Keep the debug flavor out of the golden comparison and document why
  (release artifact is the shipped one) in the build script usage text.
  Verify: `scripts/build-wasm.sh --debug --no-tests` still works, and a debug
  build does not attempt golden comparison.

## 3. Documentation and ADR

- [x] 3.1 Add AD-025 to `docs/decisions.md`: golden mesh verification protocol
  (public-API scenes, count + float32-prefix hash goldens, capture-only
  workflow, fault-injection self-test) with its status-table row. Verify: the
  table lists AD-025 as Accepted, the entry has Context/Decision/Consequences,
  cites AD-015/AD-022, and no existing ADR text is edited.
- [x] 3.2 Update `docs/build-system.md` with the golden pipeline step, golden
  file format, capture/recapture rules (vendor pin, Boost, interval policy,
  scene change), and fault injection; update `README.md` with contributor
  commands (`npm run golden`, `npm run golden:capture`) and the recapture
  caveat. Verify: both documents name the checked-in directory, the capture
  command and the fault-injection check, and do not claim goldens are edited by
  hand.
- [x] 3.3 Update `docs/roadmap.md` change 6 status to Done once the gate
  passes. Verify: the roadmap row for `golden-verification` reads Done.

## 4. Integration checks

- [x] 4.1 Full gate: `npm run check && npm run lint && npm run golden &&
  npm test`, and `npx @fission-ai/openspec@latest validate --all --strict`.
  Verify: all commands exit zero.
- [x] 4.2 Verify `docs/decisions.md` reflects what was implemented (AD-025
  present and Accepted, no other ADR altered) and that `docs/build-system.md`,
  `README.md` and `.github/workflows/build-wasm.yml` describe the shipped
  gate. Verify: `git diff --stat` touches no `src/`, `wasm/` or `vendor/`
  entry and leaves the frozen export manifest unchanged.

## Workflow follow-up

- Present the implemented change for review, then archive it with
  `/opsx-archive` once the project's review requirements are satisfied.
- At archive, re-check the synced specs against `docs/decisions.md`: no
  requirement may contradict an Accepted ADR.
