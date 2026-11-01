# Spec Delta

## ADDED Requirements

### Requirement: Publishable release manifest version
At the first release the package manifest SHALL be version `0.1.0`, no longer
private, and SHALL declare public access with provenance; the packaged entry,
files, license and engines SHALL remain those verified by the packaging change.

#### Scenario: Release manifest is public and versioned
- **WHEN** the release commit's `package.json` is inspected
- **THEN** `version` is `0.1.0`, `private` is absent or false, and
  `publishConfig` sets public access and provenance

#### Scenario: Packaging guarantees still hold
- **WHEN** the release tarball is packed
- **THEN** the entry, declarations, wasm, README, LICENSE and no-runtime-
  dependency properties remain as specified by `npm-package`
