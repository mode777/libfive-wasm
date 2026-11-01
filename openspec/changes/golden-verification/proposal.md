# Proposal

## Why

The build currently proves that the artifact links and that interval bounds are
conservative, but nothing proves that a given build produces the *same mesh* as
the reviewed one. The software interval policy (AD-015, AD-023) has no
artifact-level regression gate: a future vendor pin, Boost bump, flag change or
interval-policy edit could subtly change topology or vertex placement while the
smoke and interval suites stay green. Roadmap change 6 adds that regression
safety net before packaging freezes the output.

## What Changes

- Add checked-in golden meshes for four scenes exercised through the public
  `Shape`/stdlib API — sphere, gyroid, blended union and text — recording
  vertex/triangle counts plus a SHA-256 over the first *N* float32 vertex
  components. Goldens live under `tests/goldens/` and are compared by the
  artifact test suite.
- Add a capture mode (`npm run golden:capture`, writing only when explicitly
  enabled) that regenerates the golden files on the verification server. Normal
  test runs only read and compare; a missing or hand-edited golden fails.
- Add a golden-harness self-test (fault injection): a copy of a real mesh is
  perturbed by one float32 ulp and the comparator must reject it. This proves
  the suite catches the same class of subtle vertex/topology drift an
  undersized interval policy produces.
- Extend the build/CI contract so the golden suite runs against the freshly
  built `dist/` artifact on every push/PR, alongside the existing smoke,
  interval and package suites; the debug flavor can run the same comparison.
- Document the golden capture/recapture procedure (vendor pin or interval
  policy changes require a recapture) and the fault-injection check in
  `docs/build-system.md` and `README.md` contributor notes.
- Record the verification protocol as AD-025.

Out of scope: the publishable manifest, consumer README and tarball (change 7)
and the release (change 8); no meshing, API or ABI changes.

## Capabilities

### New Capabilities

- `golden-verification`: checked-in golden mesh results for canonical scenes,
  exact count/hash comparison through the public API, capture-only-when-asked
  workflow, invalidation rules on pin/policy changes, and a fault-injection
  self-test proving subtle drift is rejected (supports AD-015, AD-022).

### Modified Capabilities

- `wasm-build-pipeline`: the build/CI gate additionally runs the golden mesh
  suite against the freshly built artifact on every build, and the documented
  pipeline names the capture and fault-injection steps.
- `interval-rounding`: the artifact-level acceptance story now includes the
  golden mesh suite, and a fault-injection check demonstrates that an
  undersized policy is caught by mesh comparison as well as by the interval
  bounds suite.

## Impact

- **New code**: `tests/golden.test.ts`, `tests/support/golden.ts`,
  `tests/goldens/*.json`, `scripts/capture-goldens.mjs`, and golden-oriented
  package scripts.
- **Existing code**: `scripts/build-wasm.sh` (golden step when the test
  dependencies are available), `.github/workflows/build-wasm.yml` (explicit
  golden step after the build), `package.json` (`golden`, `golden:capture`).
- **APIs**: none; consumers see no surface change.
- **Docs**: `docs/build-system.md` (golden protocol, capture/recapture,
  fault injection), `docs/decisions.md` (AD-025), `README.md` (contributor
  verification notes), `docs/roadmap.md` (change 6 Done at completion).
- **Decisions**: introduces **AD-025** (golden mesh verification protocol:
  public-API scenes, float32 count/hash goldens, capture-only workflow,
  fault-injection self-test). Implements the verification half of AD-015 and
  supports AD-013/AD-022; alters or reverses no Accepted ADR, so no existing
  ADR is superseded.
