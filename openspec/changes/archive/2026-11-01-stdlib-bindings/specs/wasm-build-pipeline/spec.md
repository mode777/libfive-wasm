# wasm-build-pipeline Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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
