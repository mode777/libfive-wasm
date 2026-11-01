# wasm-build-pipeline Specification

## Purpose

Defines the reproducible contract that turns the pinned libfive source and
dependencies into the shipped `dist/libfive.wasm` artifact and its ES6 module
glue, including the export surface and ABI the JavaScript package binds to.

## Requirements

### Requirement: Single build entry point
The repository SHALL provide `scripts/build-wasm.sh` as the one command that
builds the WebAssembly artifact. Run without arguments it SHALL produce a
release artifact and SHALL exit non-zero if any step fails.

#### Scenario: Clean build produces the artifact
- **WHEN** `scripts/build-wasm.sh` runs on a checkout with network access and no
  prior build state
- **THEN** it exits zero and leaves `dist/libfive.wasm` and its ES6 module glue
  in `dist/`

#### Scenario: Failure propagates
- **WHEN** any step (vendoring, configure, compile, link, or test) fails
- **THEN** the script exits non-zero and does not report the build as
  successful

### Requirement: Pinned toolchain enforcement
The build SHALL use Emscripten 3.1.64 and SHALL refuse to build with a different
toolchain version instead of silently producing an artifact with a different
compiler.

#### Scenario: Matching toolchain
- **WHEN** `emcc` reports version 3.1.64
- **THEN** the build proceeds

#### Scenario: Mismatched toolchain is rejected
- **WHEN** the active `emcc` reports a version other than 3.1.64
- **THEN** the script exits non-zero, names the required and detected versions,
  and produces no artifact

### Requirement: Build from verified pinned inputs
Before compiling, the build SHALL ensure the vendored libfive tree and the
pinned Eigen/Boost headers are present and verified, using the vendoring and
dependency entry points rather than unpinned downloads.

#### Scenario: Inputs are prepared automatically
- **WHEN** the build runs on a checkout where `vendor/libfive/` or `build/deps/`
  is absent
- **THEN** the script prepares them through the pinned acquisition scripts
  before configuring the build

#### Scenario: Input verification failure stops the build
- **WHEN** a vendored tree or dependency tree fails verification
- **THEN** the script exits non-zero before compiling and names the failing
  input

### Requirement: Portable artifact configuration
The artifact SHALL be a single WebAssembly module usable in Node, browsers and
workers, with an ES6 module factory, memory growth enabled, no filesystem
support, and no threads or SIMD.

#### Scenario: Artifact metadata matches the baseline
- **WHEN** the built artifact is inspected or instantiated in Node and in a
  worker-like environment
- **THEN** it loads through its ES6 factory and uses no filesystem, no pthread
  API and no SIMD instructions

#### Scenario: File-based kernel APIs are not reachable
- **WHEN** the artifact is linked
- **THEN** only the v1 surface is exported and file-based/libfive save/load
  entry points are absent from the export table

### Requirement: Explicit export surface
The build SHALL export exactly the symbols recorded in a checked-in core
export manifest plus the C standard-library symbols and the generated flat
stdlib shims, together with the allocator entry points needed by callers.
Every manifest symbol SHALL be present and callable at runtime; the core
manifest SHALL remain the frozen ABI for the typed raw namespace (AD-011,
AD-022, AD-024).

#### Scenario: Manifest symbols are exported
- **WHEN** the artifact is instantiated
- **THEN** every symbol named in the core export manifest and the memory
  allocator entry points are callable, and every C stdlib function and
  generated `_shim_stdlib_*` wrapper is present in the module's export table

#### Scenario: Unlisted kernel symbols stay internal
- **WHEN** a symbol outside the manifest, stdlib and generated shim sets is
  looked up on the module
- **THEN** it is not exported

### Requirement: JS-safe C ABI shims
The artifact SHALL provide C shims that make struct-returning, struct-by-value
and `bool`-out-parameter entry points usable from JavaScript through pointers
and 32-bit out-parameters, including a flat wrapper for every C stdlib
declaration that takes a struct by value, and SHALL document that ABI
contract.

#### Scenario: Struct-returning call is usable from JS
- **WHEN** JavaScript calls the shimmed region-evaluation entry point with a
  region built in wasm memory
- **THEN** the lower and upper bounds are written to a caller-provided
  out-pointer and are readable as floats

#### Scenario: Struct-by-value call is usable from JS
- **WHEN** JavaScript calls a shimmed meshing or point-evaluation entry point
- **THEN** the vector/region argument is passed by pointer and no struct-bytes
  argument is required from JavaScript

#### Scenario: Struct-by-value stdlib calls are usable from JS
- **WHEN** JavaScript calls a stdlib declaration whose C signature takes
  `tvec2`/`tvec3` by value (for example the loft-between or sphere
  constructors) through its generated shim
- **THEN** the vectors are passed as flattened tree handles and no struct
  bytes cross the JS boundary

#### Scenario: ABI contract is documented
- **WHEN** a maintainer reads `wasm/README.md`
- **THEN** the pointer width, out-parameter conventions, mesh accessors, the
  generated flat stdlib shim family, and string handling are described

### Requirement: Single-threaded meshing
All meshing in the artifact SHALL execute through the single-threaded kernel
entry point, and the artifact SHALL NOT spawn worker threads or reference
pthread APIs.

#### Scenario: Meshing runs synchronously
- **WHEN** a tree is meshed through the shimmed render entry point
- **THEN** the call returns the mesh on the caller's thread and no worker
  thread is created

#### Scenario: No thread runtime is linked
- **WHEN** the built wasm is inspected for pthread symbols
- **THEN** none are present

### Requirement: Build flavors
The build SHALL produce a release artifact by default and SHALL offer an
explicit debug flavor that is distinguishable from the release output.

#### Scenario: Debug flavor is opt-in
- **WHEN** the build runs with its debug flag
- **THEN** it produces an unoptimized artifact with debug information and does
  not overwrite the release artifact with it

### Requirement: Artifact digest reporting
Every successful build SHALL print the SHA-256 of the produced WebAssembly
module so drift between builds is observable, and two clean builds from the
same inputs SHALL yield the same digest.

#### Scenario: Digest is printed
- **WHEN** a build succeeds
- **THEN** the script prints the artifact path and its SHA-256

#### Scenario: Repeat build is stable
- **WHEN** two clean builds run from the same pinned inputs and toolchain
- **THEN** they report the same wasm digest

### Requirement: Node smoke test
The build SHALL verify the artifact by importing it in Node, building an
implicit sphere from raw exports, meshing it through the single-threaded
entry point, and asserting non-empty, index-consistent mesh output. A failed
assertion SHALL fail the build.

#### Scenario: Sphere meshes successfully
- **WHEN** the smoke test runs against a freshly built artifact
- **THEN** it reports non-zero vertex and triangle counts, all triangle indices
  are below the vertex count, and the implicit value has the expected sign
  inside and outside the sphere

#### Scenario: Broken artifact fails the build
- **WHEN** the smoke test cannot import the artifact, a manifested export is
  missing, or mesh output is empty/inconsistent
- **THEN** the build exits non-zero

### Requirement: CI builds and publishes the artifact
The build workflow SHALL run the real build on pushes and pull requests,
upload the `dist/` artifact, and report the wasm digest. The publish workflow
SHALL keep calling the same build entry point before publishing.

#### Scenario: Push builds the artifact
- **WHEN** a commit is pushed or a pull request is opened
- **THEN** `build-wasm.yml` runs `scripts/build-wasm.sh`, uploads `dist/`, and
  fails the job if the build or its tests fail

#### Scenario: Publish uses the same build
- **WHEN** a version tag triggers `publish-npm.yml`
- **THEN** it invokes the same build entry point and does not build through a
  separate path

### Requirement: Generated bindings drift check
The build SHALL verify that the checked-in generated bindings — the
TypeScript stdlib surface and the C stdlib shim source — match what the
vendored `libfive_stdlib.h` produces, and SHALL fail naming the stale files
when they do not, rather than building an artifact with a divergent surface.

#### Scenario: Up-to-date bindings pass
- **WHEN** the build runs with generated files that match the vendored header
- **THEN** the drift check succeeds and the build proceeds

#### Scenario: Stale bindings fail the build
- **WHEN** a declaration, alias or default in the vendored header changes
  without regenerating the checked-in output
- **THEN** the build exits non-zero before linking and names the stale
  generated files
