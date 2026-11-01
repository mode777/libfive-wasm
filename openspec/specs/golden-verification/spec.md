# golden-verification Specification

## Purpose
Provides artifact-level regression verification: canonical scenes meshed
through the public API are compared against checked-in golden results so any
change in mesh output is a reviewable, failing event (AD-025, supports
AD-015/AD-022).

## Requirements

### Requirement: Canonical golden scenes
The repository SHALL check in golden results for a fixed set of canonical
scenes — at minimum a sphere, a gyroid, a blended union and a text glyph —
meshed through the package's public `Shape`/stdlib API with fixed regions and
resolutions.

#### Scenario: Every canonical scene has a golden
- **WHEN** the golden suite runs against a built artifact
- **THEN** each canonical scene is built through the public API, meshed with
  its recorded region and resolution, and compared with a checked-in golden
  entry

#### Scenario: Goldens cover the interval-sensitive features
- **WHEN** the golden set is inspected
- **THEN** it includes transcendental/periodic geometry (gyroid), blended
  implicit surfaces, and glyph geometry in addition to a plain sphere

### Requirement: Golden comparison is exact for counts and vertices
A golden entry SHALL record the mesh vertex count, triangle count, and a
cryptographic hash over a fixed prefix of the float32 vertex components, and
the suite SHALL fail when any of those differ from the freshly meshed result.

#### Scenario: Matching artifact passes
- **WHEN** a scene is meshed by the reviewed artifact with unchanged vendor pin,
  interval policy and toolchain
- **THEN** its counts and vertex-prefix hash equal the golden and the suite
  passes

#### Scenario: Changed mesh fails
- **WHEN** counts or any float32 component in the hashed prefix differ from the
  golden
- **THEN** the suite fails naming the scene and the mismatching field

#### Scenario: Missing or malformed golden fails
- **WHEN** a golden file is absent, unparsable, or lacks a required field
- **THEN** the suite fails instead of skipping the scene

### Requirement: Goldens are generated, never hand-edited
Goldens SHALL be written only by the documented capture mode, which is enabled
explicitly and refuses to run as part of a normal test pass; ordinary runs
SHALL be read-only.

#### Scenario: Normal runs do not write
- **WHEN** the golden suite runs without the capture switch
- **THEN** no golden file is created or modified, even when comparisons fail

#### Scenario: Capture mode rewrites goldens
- **WHEN** the capture procedure runs on the verification server against a
  freshly built artifact
- **THEN** every golden entry is regenerated from that artifact's meshes and the
  files are left for review

#### Scenario: Recapture is required after a pin or policy change
- **WHEN** the vendor pin, Boost version, interval policy or golden scene
  definition changes
- **THEN** the documented procedure requires a fresh capture and review, and
  the old goldens are not adjusted by hand

### Requirement: Golden harness fault injection
The golden harness SHALL include a fault-injection self-test that perturbs a
real mesh by one float32 least-significant bit and asserts that the comparator
rejects it, proving that subtle drift — the effect of an undersized interval
policy — cannot pass unnoticed.

#### Scenario: One-ulp perturbation is rejected
- **WHEN** the fault-injection self-test perturbs one vertex component of a
  freshly meshed scene by one float32 ulp
- **THEN** the comparator reports a mismatch rather than accepting the mesh

#### Scenario: Fault injection runs with the suite
- **WHEN** the golden suite runs in CI
- **THEN** the fault-injection self-test runs too and fails the suite if the
  comparator accepts the perturbed mesh

### Requirement: Golden suite gates builds
The golden suite SHALL run against the freshly built artifact on every CI
build and before a release, using the artifact produced by the build under
test (not a previously cached mesh).

#### Scenario: CI build runs goldens
- **WHEN** `build-wasm.yml` builds an artifact on a push or pull request
- **THEN** the golden suite runs against that `dist/` artifact and fails the
  job on any mismatch

#### Scenario: Package suite includes goldens
- **WHEN** `npm test` runs against a built artifact
- **THEN** the golden comparison and fault-injection self-test are part of the
  test run
