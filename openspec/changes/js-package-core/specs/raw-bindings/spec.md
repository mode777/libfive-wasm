# raw-bindings Spec Delta

## Purpose

Defines the typed raw C namespace (`libfive.raw`) that the package exposes
as an advanced escape hatch beneath the future `Shape` layer: complete,
callability-tested coverage of the frozen artifact export surface — core
libfive C API, ABI shims, allocator, heap views and string helpers —
against the manifest frozen by the wasm-build-pipeline capability
(AD-004, AD-011, AD-022).

## ADDED Requirements

### Requirement: Raw namespace completeness
The instance returned by `init()` SHALL expose `raw`, and every core
symbol in the frozen export manifest (tree construction and inspection,
opcode lookup, ABI shims, kernel-object deleters) plus the allocator
(`malloc`/`free`) SHALL be present on it as callable functions with typed
signatures matching the shim ABI; raw namespace coverage SHALL be verified
against the manifest by a test that fails when a symbol is missing or not
callable (AD-011, AD-022).

#### Scenario: Manifest parity
- **WHEN** an instance is initialized and each symbol of the core export
  manifest is looked up on `raw`
- **THEN** every symbol is present and callable

#### Scenario: Missing export breaks the test suite
- **WHEN** the artifact stops exporting a manifested symbol
- **THEN** the raw-namespace parity test fails, flagging the ABI change

### Requirement: Tree construction and inspection through raw
`raw` SHALL allow building and inspecting trees entirely from JavaScript:
coordinate and constant trees, nullary/unary/binary construction from
opcode numbers, opcode lookup by name, identity/remap/optimized
operations, and explicit tree deletion.

#### Scenario: Hand-built sphere evaluates
- **WHEN** a tree is built through raw as `sqrt(x²+y²+z²) − 1` using
  opcode lookup and the binary/unary constructors
- **THEN** interval evaluation over a region inside the sphere returns
  negative bounds and over a region outside returns positive bounds

#### Scenario: Opcode lookup round-trip
- **WHEN** an opcode name is resolved through raw
- **THEN** the resulting number drives tree construction, and an unknown
  name reports failure instead of returning a valid opcode

### Requirement: Struct marshalling helpers
`raw` SHALL provide utilities to allocate, fill and free the C structs the
JS boundary needs — `libfive_region3`, `libfive_vec3`, and interval/vec3
out-parameters — through the artifact's ABI shims, so JavaScript never
encodes C struct offsets itself.

#### Scenario: Region built by helpers drives evaluation
- **WHEN** a `libfive_region3` is allocated and filled with the raw
  helpers, then passed to the shimmed region-evaluation entry point
- **THEN** the lower/upper bounds are readable from the out-parameter
  without manual offset arithmetic

### Requirement: String and memory utilities
`raw` SHALL expose UTF-8 string utilities (allocate a JS string into wasm
memory, read a NUL-terminated C string back) and the exported heap views,
and SHALL document that strings returned by the kernel are read out and
released through `libfive_free_str` by the caller-side helper (AD-011).

#### Scenario: String round-trip through the kernel
- **WHEN** a tree is printed via `libfive_tree_print` through raw and the
  returned C string is read with the string helper and released
- **THEN** the text matches the printed tree expression and no manual
  byte handling is needed

#### Scenario: Binary round-trip through heap views
- **WHEN** bytes are written into wasm memory via the allocator and heap
  views and read back
- **THEN** the bytes round-trip unchanged

### Requirement: Raw meshing flow
`raw` SHALL support the full single-threaded meshing flow: region in,
mesh pointer out through the `_st` shim entry point, vertex/triangle
counts and base addresses read through the mesh accessors, and the mesh
released through `libfive_mesh_delete` (AD-014).

#### Scenario: Sphere meshes through raw
- **WHEN** a sphere tree is meshed through raw with a region and
  resolution
- **THEN** non-zero vertex/triangle counts are returned, every triangle
  index is below the vertex count, and freeing the mesh through raw
  succeeds

### Requirement: Raw namespace is an escape hatch, not the surface
`raw` SHALL be documented as an advanced, semver-relevant namespace whose
contents track the artifact's export manifest; typed C stdlib wrappers are
NOT part of this capability — they arrive generated from
`libfive_stdlib.h` with the stdlib-bindings capability (AD-011, AD-017).

#### Scenario: Stdlib wrappers are absent from raw
- **WHEN** the raw namespace is inspected after this change
- **THEN** it contains the core manifest surface, allocator, heap and
  string utilities only, and no generated stdlib functions
