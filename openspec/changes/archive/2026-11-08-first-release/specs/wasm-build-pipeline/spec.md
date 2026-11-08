# Spec Delta

## ADDED Requirements

### Requirement: Tag matches manifest before publishing
The publish workflow SHALL verify that a pushed `v*` tag equals
`v<package.json version>` and SHALL build the release through
`scripts/build-wasm.sh` before publishing, so a tag cannot publish a stale or
mismatched tree (AD-020, AD-027).

#### Scenario: Matching tag builds and publishes
- **WHEN** the pushed tag is `v0.1.0` and `package.json` is `0.1.0`
- **THEN** the workflow runs the build (including package entry, goldens and
  package tests) and then publishes with provenance

#### Scenario: Mismatched tag stops before publish
- **WHEN** the tag version and manifest version differ
- **THEN** the workflow fails before the publish step
