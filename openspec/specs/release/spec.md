# release Specification

## Purpose

Defines the first-release contract: a changelog and version/tag consistency
gate, a publishable manifest, tag-gated provenance publishing with the manual
npm trust prerequisite, and post-publish verification that the registry
package installs and meshes (implements AD-020; supports AD-012, AD-027).

## Requirements

### Requirement: Release record and version
The release SHALL carry a `CHANGELOG.md` entry for the released version and a
`package.json` version that matches the changelog heading and the pushed
`v<version>` tag.

#### Scenario: Changelog and version agree
- **WHEN** the release tree is inspected
- **THEN** `CHANGELOG.md` has a `0.1.0` section and `package.json` declares
  `"version": "0.1.0"`

#### Scenario: Tag mismatch blocks publishing
- **WHEN** a tag other than `v0.1.0` is pushed while `package.json` says
  `0.1.0`
- **THEN** the publish workflow exits non-zero before publishing

### Requirement: Publishable release manifest
The release manifest SHALL no longer be private, SHALL publish with public
access and provenance, and SHALL keep the single ESM entry, files list, license
and engine floor verified by the packaging change.

#### Scenario: Manifest is publishable
- **WHEN** `package.json` is inspected at the release commit
- **THEN** it has no `private: true`, declares `publishConfig` with public
  access and provenance, and still exports `./dist/index.js` with types

#### Scenario: Tarball contents are unchanged
- **WHEN** `npm pack` runs at the release commit
- **THEN** the tarball contains the compiled entry, declarations, wasm, README
  and LICENSE only, as in the packaging verification

### Requirement: Tag-gated provenance publish
Publishing SHALL run only from the repository's tag workflow, using npm
trusted publishing (OIDC, no token secret) with provenance, and SHALL require
the maintainer-activated npm trust configuration as an explicit prerequisite.

#### Scenario: Tag push publishes with provenance
- **WHEN** the maintainer has configured npm trusted publishing for this
  repository/workflow/`npm` environment and pushes `v0.1.0`
- **THEN** `publish-npm.yml` builds through the single build entry point and
  publishes with provenance

#### Scenario: Missing trust fails visibly
- **WHEN** trusted publishing is not configured on the npm side
- **THEN** the publish step fails with an authentication/trust error and does
  not silently skip the release

### Requirement: Post-publish verification
The release SHALL be verified after publishing: the registry version, integrity
and provenance attestation SHALL be present, and the published package SHALL
install into a clean project and mesh a shape.

#### Scenario: Registry metadata matches
- **WHEN** `scripts/verify-release.mjs 0.1.0` runs after a successful publish
- **THEN** the registry reports version `0.1.0`, a dist integrity value and a
  provenance attestation, and the script exits zero

#### Scenario: Published package meshes
- **WHEN** the verification installs the published package into a clean temp
  project
- **THEN** `init()`, a stdlib shape, `mesh()` and `exportSTL()` succeed

#### Scenario: Failed release is visible
- **WHEN** the registry version is missing or the attestation is absent
- **THEN** the verification exits non-zero and names the missing artifact
