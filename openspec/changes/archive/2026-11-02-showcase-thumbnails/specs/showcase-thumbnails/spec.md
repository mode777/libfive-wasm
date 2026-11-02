# Spec Delta

## Purpose

Give every gallery card a pre-rendered studio thumbnail of its actual demo
without loading the 3D viewport, wasm worker or highlighter on the overview
route.

## ADDED Requirements

### Requirement: Every demo has a thumbnail

The gallery SHALL show a pre-rendered thumbnail for every demo in the catalog.
The thumbnail SHALL be an image of the real demo mesh, not a placeholder shape.

#### Scenario: Catalog coverage

- **WHEN** the gallery is rendered
- **THEN** every demo card displays its thumbnail and no card falls back to the
  CSS orb

#### Scenario: Image matches the demo

- **WHEN** a thumbnail for a demo is captured
- **THEN** it shows that demo's mesh with the same studio lighting and material
  as the live 3D view

### Requirement: Thumbnails have a consistent presentation

Thumbnails SHALL be captured at the same aspect ratio, camera framing, scale and
background, with no tabs, sidebar, stats or other UI chrome. The images SHALL be
2x resolution for the card size.

#### Scenario: Visual consistency

- **WHEN** the gallery is viewed at desktop or mobile width
- **THEN** all thumbnails share the same framing and background treatment and
  remain sharp on high-density displays

#### Scenario: No UI in the image

- **WHEN** a thumbnail is inspected
- **THEN** it contains only the model, ground/shadow and studio background, not
  the demo controls or page chrome

### Requirement: Gallery stays lightweight

The gallery route SHALL NOT load the three.js viewport, the wasm worker or the
code highlighter to display thumbnails. Thumbnails SHALL use lazy loading and
content-hashed URLs.

#### Scenario: Initial gallery load

- **WHEN** a visitor opens the gallery in a fresh session
- **THEN** the network requests do not include the viewport/wasm/highlighter
  chunks, and thumbnail images are loaded lazily

#### Scenario: Cached assets

- **WHEN** the visitor reloads the gallery
- **THEN** unchanged thumbnails are served from the content-hashed cached URLs

### Requirement: Thumbnails are validated for drift

The repository SHALL record a source hash for each demo and its thumbnail. A test
SHALL fail when a demo has no thumbnail, when a manifest entry is missing, or
when a demo's source hash no longer matches its captured thumbnail.

#### Scenario: Stale thumbnail fails CI

- **WHEN** a demo module changes without recapturing its thumbnail
- **THEN** the drift test fails and names the demo

#### Scenario: Missing thumbnail fails CI

- **WHEN** the manifest or an image file is missing for a demo
- **THEN** the coverage test fails and names the demo

### Requirement: Missing images degrade gracefully

If a thumbnail image is unavailable, the gallery SHALL keep the existing CSS
orb and card layout instead of showing a broken image.

#### Scenario: Development fallback

- **WHEN** the site runs without a captured preview for a demo
- **THEN** that card uses the CSS orb and the rest of the gallery remains usable

### Requirement: Thumbnails stay outside the package

The published `libfive-wasm` tarball and wasm artifact SHALL NOT include
thumbnail images, capture scripts or preview-only dependencies.

#### Scenario: Package boundary

- **WHEN** the package tarball is inspected
- **THEN** it contains no preview assets or capture tooling
