# Spec Delta

## Purpose

Extend the public showcase into a feature-coverage gallery: twelve demos across
every libfive stdlib section, section filtering, inspector controls and
validated coverage.

## ADDED Requirements

### Requirement: Catalog covers every stdlib section

The demo catalog SHALL include at least one demo for each libfive stdlib
section — `csg`, `shapes`, `transforms` and `text` — and SHALL demonstrate
arrays, 2D/revolve profiles, `remap`, evaluation, shelling/clearance and the raw
escape hatch.

#### Scenario: Section coverage

- **WHEN** the coverage manifest is inspected
- **THEN** every stdlib section maps to at least one demo and the catalog has
  twelve demos

#### Scenario: Arrays and 2D are represented

- **WHEN** a visitor browses the gallery
- **THEN** at least one demo uses an array function and one uses a 2D shape
  with `revolveY` or `loftBetween`

### Requirement: Demos declare their coverage

Each demo SHALL declare the stdlib sections and feature labels it demonstrates
in its metadata, and the gallery SHALL expose those labels.

#### Scenario: Card labels

- **WHEN** a demo card is shown
- **THEN** its declared feature labels are visible on the card

#### Scenario: Section metadata is complete

- **WHEN** the catalog is validated
- **THEN** every demo has at least one section and every section label is in the
  known set

### Requirement: Gallery can filter by section

The gallery SHALL provide controls to filter the visible demos by stdlib
section, and SHALL show an empty state when a filter has no matches.

#### Scenario: Filter reduces the gallery

- **WHEN** the visitor selects the `text` section
- **THEN** only demos declaring `text` remain visible

#### Scenario: Clear the filter

- **WHEN** the visitor clears the section filter
- **THEN** every catalog demo is visible again

### Requirement: Inspector exposes mesh and tree details

The demo page SHALL expose wireframe and flat-shading toggles, the
`shape.toString()` Scheme form, mesh statistics, and a binary STL download.

#### Scenario: Wireframe toggle

- **WHEN** the visitor enables wireframe
- **THEN** the rendered material shows triangle edges, and disabling it restores
  the shaded view

#### Scenario: Scheme form

- **WHEN** the visitor opens the tree details
- **THEN** the page shows the expression produced by `shape.toString()` for the
  current demo

#### Scenario: STL export

- **WHEN** the visitor downloads the current mesh
- **THEN** the file's triangle count matches the displayed triangle count

### Requirement: Evaluation probe

The demo page SHALL provide a probe that evaluates the current shape at the
region center with `evalF` and `evalD` and displays the distance and gradient.

#### Scenario: Probe a demo

- **WHEN** the visitor activates the probe
- **THEN** the page shows the scalar value and gradient components for the
  region center

### Requirement: Gallery route loads without the viewport bundle

The gallery route SHALL load without fetching the three.js renderer or the code
highlighter; those SHALL be loaded when a demo route is opened.

#### Scenario: Initial gallery load

- **WHEN** the visitor opens the gallery route in a fresh session
- **THEN** the network requests do not include the three.js or highlighter
  chunks

#### Scenario: Opening a demo

- **WHEN** the visitor opens a demo route
- **THEN** the viewport and code-view chunks load and the demo renders

### Requirement: Coverage is validated

The test suite SHALL fail when a demo is missing a section, a known section has
no demo, a demo produces an empty or non-finite mesh, or the inspector probe
returns a non-finite value.

#### Scenario: Missing section fails CI

- **WHEN** a section in the manifest has no matching demo
- **THEN** the coverage test fails and names the section

#### Scenario: Broken demo fails CI

- **WHEN** a demo throws or meshes to zero triangles
- **THEN** the validation test fails and names the demo

### Requirement: Demo authoring is documented

The repository SHALL document how to add a demo, declare its metadata and
sections, and validate it.

#### Scenario: Authoring guide

- **WHEN** a contributor opens the showcase guide
- **THEN** it describes the demo module contract, section labels, code-view
  source rule and the validation command
