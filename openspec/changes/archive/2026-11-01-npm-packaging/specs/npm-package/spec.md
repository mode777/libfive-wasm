# Spec Delta

## Purpose

Defines the shippable npm package: the publishable manifest, tarball contents,
compiled ESM entry and declarations, default and caller-supplied wasm loading
from an installed copy, bundler asset emission, and the consumer verification
that proves an installed tarball builds and meshes (AD-002, AD-007, AD-026).

## ADDED Requirements

### Requirement: Publishable package manifest
The `package.json` SHALL declare the single ESM package entry, TypeScript
types, files list, side-effect freedom, Node engine floor and MPL-2.0 license
required by `packaging.md`, while keeping `private: true` until the release
change flips it.

#### Scenario: Manifest fields match the packaging baseline
- **WHEN** `package.json` is inspected
- **THEN** it has `"type": "module"`, a `"."` export mapping to
  `./dist/index.js` with `./dist/index.d.ts` types, `types`, `files` containing
  `dist`, `README.md` and `LICENSE`, `sideEffects: false`, `engines.node` of
  `>=18`, `license: MPL-2.0`, and `private: true`

#### Scenario: No runtime dependencies
- **WHEN** the manifest and tarball are inspected
- **THEN** the package declares no runtime dependencies; build and test tools
  are dev dependencies only

### Requirement: Tarball contents
`npm pack` SHALL produce a tarball containing the compiled ESM entry, its
declaration tree, `libfive.wasm`, the README and the MPL-2.0 license, and no
source, test, build-cache or vendored-tree content.

#### Scenario: Packed file list is intentional
- **WHEN** `npm pack --dry-run --json` runs on a built tree
- **THEN** every packaged path is under `dist/` or is `README.md`/`LICENSE`,
  and `dist/index.js`, `dist/index.d.ts` and `dist/libfive.wasm` are present

#### Scenario: Build output is complete
- **WHEN** the package is built from a clean checkout with the pinned toolchain
- **THEN** the build produces `dist/index.js`, `dist/index.d.ts` and
  `dist/libfive.wasm` before packing

### Requirement: Bundled entry with inlined factory
The compiled entry SHALL bundle the package API and the Emscripten ES6 factory
into one ESM module whose `import.meta.url`-relative wasm reference remains a
static asset, so a bundler can emit `libfive.wasm` without a plugin.

#### Scenario: Default load from the installed package
- **WHEN** a consumer imports `init` from the installed package and calls it
  with no options in Node
- **THEN** the sibling `dist/libfive.wasm` is loaded and meshing succeeds

#### Scenario: Bundler emits the wasm asset
- **WHEN** a Vite production build imports the installed package and calls
  `init()` without options
- **THEN** the build succeeds and emits a wasm asset referenced by the bundled
  application

#### Scenario: wasmBinary escape hatch still works
- **WHEN** a consumer supplies `init({ wasmBinary })` with the packaged wasm
  bytes
- **THEN** instantiation succeeds without URL resolution

### Requirement: Declaration tree is consumable
The tarball SHALL include `dist/index.d.ts` and every declaration file it
references, so a TypeScript consumer can typecheck `init`, `Shape`, `Mesh`,
`exportSTL`, stdlib functions and the raw namespace without source access.

#### Scenario: Consumer typechecks
- **WHEN** a scratch TypeScript project imports the installed package and uses
  `init`, `sphere`, `mesh` and `exportSTL`
- **THEN** typechecking succeeds using only the packaged declarations

### Requirement: Consumer tarball verification
The repository SHALL provide a consumer verification that packs the real
tarball, installs it into a scratch project, meshes a canonical shape from
Node and builds a Vite consumer app, and CI SHALL run it after the artifact
build.

#### Scenario: Node consumer meshes from the tarball
- **WHEN** the consumer test installs the packed tarball and imports
  `libfive-wasm`
- **THEN** `init()`, a stdlib shape and `mesh()` succeed and report non-zero
  counts

#### Scenario: Vite consumer build succeeds
- **WHEN** the consumer test builds the scratch Vite app against the installed
  tarball
- **THEN** the build exits zero and the output contains the wasm asset

#### Scenario: CI runs the consumer check
- **WHEN** `build-wasm.yml` runs on a push or pull request
- **THEN** the consumer package verification runs against the build under test
  and fails the job on error
