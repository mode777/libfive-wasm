# Spec Delta

## Purpose

Define the showcase viewport's normal and shading behavior so smooth surfaces
stay smooth while sharp creases remain visibly hard.

## ADDED Requirements

### Requirement: Smooth shading is crease-aware

The default shaded view SHALL average normals only across adjacent faces whose
angle is at or below 30 degrees. Edges above 30 degrees SHALL remain hard.

#### Scenario: Thin slab rim

- **WHEN** the wavy slab is shown in the default shaded view
- **THEN** the top and bottom surfaces stay smooth and the top/side rim reads as
  a hard edge without a dark averaged band

#### Scenario: Curved surface

- **WHEN** a sphere or gyroid demo is shown in the default shaded view
- **THEN** its curved surface remains smoothly shaded with no visible facet
  seams introduced by the crease rule

#### Scenario: Threshold boundary

- **WHEN** two adjacent faces meet at an angle below or equal to 30 degrees
- **THEN** their shared vertices use a shared normal

### Requirement: Flat mode remains a diagnostic per-face view

The Flat control SHALL render each triangle with its own face normal,
independent of the crease rule. Disabling Flat SHALL restore crease-aware
smooth shading.

#### Scenario: Enable flat mode

- **WHEN** the visitor enables Flat
- **THEN** each triangle is shaded with its face normal and the hard edges look
  faceted rather than smoothed

#### Scenario: Disable flat mode

- **WHEN** the visitor disables Flat
- **THEN** the view returns to crease-aware smooth shading without re-meshing

### Requirement: The shading mode is identified

The demo inspector SHALL identify the default as auto-smoothed at 30 degrees,
alongside the Flat control.

#### Scenario: Inspector label

- **WHEN** a demo page is open
- **THEN** the inspector shows that the default smooth mode uses a 30 degree
  crease threshold

### Requirement: Shading changes are display-only

Crease-aware shading SHALL NOT change mesh vertex/triangle counts, STL output,
or the published package behavior.

#### Scenario: Mesh stats and STL

- **WHEN** a demo is shaded with crease-aware normals
- **THEN** the reported vertex/triangle counts and the downloaded STL match the
  mesh produced before normal processing

#### Scenario: Package boundary

- **WHEN** the package tarball and wasm artifact are inspected
- **THEN** they contain no showcase shading code or new dependency
