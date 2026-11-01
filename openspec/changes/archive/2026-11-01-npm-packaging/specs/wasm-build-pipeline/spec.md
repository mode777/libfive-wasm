# Spec Delta

## ADDED Requirements

### Requirement: Package build step in the pipeline
After linking the wasm artifact, the build SHALL compile the package entry and
declaration tree into `dist/`, and SHALL fail when the TypeScript or bundling
tools are unavailable instead of packing an incomplete package.

#### Scenario: Build produces the package files
- **WHEN** `scripts/build-wasm.sh` completes a release build
- **THEN** `dist/index.js`, `dist/index.d.ts` and `dist/libfive.wasm` exist and
  the existing smoke, interval and golden suites still pass

#### Scenario: Missing package tooling fails the build
- **WHEN** the package build tools are not installed
- **THEN** the build exits non-zero with an actionable message rather than
  leaving `dist/` without an entry point
