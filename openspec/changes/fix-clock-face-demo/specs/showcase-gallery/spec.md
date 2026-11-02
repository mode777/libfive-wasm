# Spec Delta

## MODIFIED Requirements

### Requirement: Coverage is validated

The test suite SHALL fail when a demo is missing a section, a known section has
no demo, a demo produces an empty or non-finite mesh, the inspector probe
returns a non-finite value, or a declared signature probe disagrees with the
built shape (AD-028).

#### Scenario: Missing section fails CI

- **WHEN** a section in the manifest has no matching demo
- **THEN** the coverage test fails and names the section

#### Scenario: Broken demo fails CI

- **WHEN** a demo throws or meshes to zero triangles
- **THEN** the validation test fails and names the demo

#### Scenario: Stale signature feature fails CI

- **WHEN** a demo's engraved, repeated or raised detail is broken, moved or
  removed while its declared probes still describe the old geometry
- **THEN** the validation test fails and names the demo and the disagreeing
  probe

#### Scenario: Repaired clock face passes validation

- **WHEN** the `clock-face` demo is validated after its geometry is rebuilt
- **THEN** every declared probe agrees: each numeral and tick position samples
  as engraved, and each hand and dial body position samples as solid

## ADDED Requirements

### Requirement: Demo signature probes

A demo SHALL be able to declare signature probe points in its demo metadata:
points that MUST evaluate as inside the solid and points that MUST evaluate as
outside it, both expressed in the demo's region coordinates. The validation
suite SHALL evaluate every declared probe against the demo's built shape and
SHALL treat empty-mesh demos as failing all inside probes.

#### Scenario: Probe contract is enforced

- **WHEN** the validation suite runs a demo that declares probes
- **THEN** it fails and names the demo if any inside point evaluates as empty
  or any outside point evaluates as solid

#### Scenario: Demos without probes are unaffected

- **WHEN** a demo declares no probe points
- **THEN** the suite applies only the existing mesh checks to it
