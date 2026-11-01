# Spec Delta

## ADDED Requirements

### Requirement: Golden mesh verification in the build gate
The build and CI gate SHALL run the golden mesh suite against the artifact just
produced by that build, in addition to the smoke, interval and package suites,
and SHALL fail the build on any golden mismatch (AD-025).

#### Scenario: Fresh artifact is golden-tested
- **WHEN** `scripts/build-wasm.sh` finishes linking a release artifact and test
  dependencies are available
- **THEN** the golden suite compares that artifact's canonical scenes before the
  build reports success

#### Scenario: CI runs goldens against the built artifact
- **WHEN** `build-wasm.yml` builds on a push or pull request
- **THEN** it runs the golden suite against the uploaded `dist/` artifact and
  the job fails on a mismatch

#### Scenario: Golden failure stops the build
- **WHEN** a canonical scene's counts or vertex-prefix hash differs from its
  golden
- **THEN** the build exits non-zero and names the failing scene
