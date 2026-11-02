# Spec Delta

## Purpose

Provide a public, browser-based showcase of the libfive-wasm package: a curated
demo gallery, an interactive 3D view, and a read-only view of the exact source
that produced each mesh.

## ADDED Requirements

### Requirement: Showcase deploys from the tested artifact

The project SHALL publish the showcase to GitHub Pages from the wasm artifact
produced and validated by the main-branch build, without rebuilding wasm in the
Pages workflow and without installing `libfive-wasm` from the npm registry.

#### Scenario: Successful main-branch build deploys

- **WHEN** the main-branch wasm build completes successfully
- **THEN** the Pages workflow downloads that run's `dist` artifact, builds the
  site, and deploys it

#### Scenario: Failed build does not deploy

- **WHEN** the main-branch wasm build fails
- **THEN** no new showcase deployment is published

#### Scenario: Registry is not required

- **WHEN** the site is installed and built in CI
- **THEN** `libfive-wasm` resolves from the local package artifact and no
  registry fetch of `libfive-wasm` occurs

### Requirement: Gallery lists demo capabilities

The site SHALL provide a landing gallery of demos. Each entry SHALL show its
title, a short description, and the libfive features it demonstrates, and SHALL
link to a stable demo route.

#### Scenario: Gallery renders

- **WHEN** a visitor opens the site root
- **THEN** every catalog demo appears with its title, description and feature
  labels

#### Scenario: Deep link opens a demo

- **WHEN** a visitor opens a demo route directly
- **THEN** the site shows that demo's 3D view and metadata

### Requirement: Demo page offers 3D and Code views

Each demo page SHALL provide a 3D tab and a Code tab. The 3D tab SHALL be the
default. The Code tab SHALL display the source of the same demo module that the
worker executed, read-only.

#### Scenario: Default view

- **WHEN** a demo page loads
- **THEN** the 3D tab is selected and the mesh is displayed

#### Scenario: Code view matches execution

- **WHEN** the visitor selects the Code tab
- **THEN** the displayed source is the demo module executed by the worker,
  including its API calls

#### Scenario: Returning to 3D

- **WHEN** the visitor switches back from Code to 3D
- **THEN** the existing mesh is shown without requiring a new mesh run

### Requirement: Meshing runs off the main thread

The showcase SHALL build and mesh demos in a Web Worker. Mesh data SHALL cross
to the main thread as owned typed arrays, and worker failures SHALL be reported
in the demo UI.

#### Scenario: Mesh does not block interaction

- **WHEN** a demo is meshing
- **THEN** the page remains responsive to input and rendering

#### Scenario: Worker error is visible

- **WHEN** a demo builder or mesher throws
- **THEN** the demo page shows an error message naming the failure instead of a
  blank viewport

### Requirement: Interactive 3D viewport

The demo page SHALL render the mesh in an orbitable 3D viewport that frames the
model, responds to viewport resizing, and uses a consistent studio-style
material.

#### Scenario: Orbit and zoom

- **WHEN** the visitor drags or scrolls in the viewport
- **THEN** the camera orbits or zooms around the model

#### Scenario: Resize

- **WHEN** the browser window or panel is resized
- **THEN** the renderer and camera aspect update without distorting the model

### Requirement: STL export

The demo page SHALL offer a binary STL download for the current demo mesh,
produced through the package's STL export path.

#### Scenario: Download STL

- **WHEN** the visitor activates the STL download
- **THEN** the browser downloads a binary STL whose triangle count matches the
  displayed mesh

### Requirement: Every catalog demo is validated

The test suite SHALL build and mesh every demo in the catalog against the real
wasm artifact and SHALL fail when a demo throws, produces an empty mesh, or
produces non-finite vertex data.

#### Scenario: Valid catalog

- **WHEN** the demo validation suite runs
- **THEN** every demo produces at least one triangle and finite vertex
  components

#### Scenario: Broken demo fails CI

- **WHEN** a demo builder throws or meshes to zero triangles
- **THEN** the validation suite fails and names the demo

### Requirement: Showcase stays outside the published package

The published `libfive-wasm` tarball SHALL NOT contain the showcase application,
its dependencies, or its build output.

#### Scenario: Package contents

- **WHEN** the package tarball is inspected
- **THEN** it contains no `site/` files and no showcase-only dependency
