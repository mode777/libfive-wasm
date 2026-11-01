# Spec Delta

## ADDED Requirements

### Requirement: Packaged entry loads the sibling artifact
The loader SHALL keep default `import.meta.url`-based resolution when the API
is imported from the installed package rather than from repository sources, so
`init()` with no options finds the packaged `libfive.wasm` in Node and in a
bundler output.

#### Scenario: Installed package default resolution
- **WHEN** `init()` is called with no options after importing the installed
  package's compiled entry in Node
- **THEN** the sibling `dist/libfive.wasm` is located and instantiated

#### Scenario: Bundled import still resolves as a static asset
- **WHEN** a bundler processes the compiled entry's wasm reference
- **THEN** it treats it as an asset relative to the module rather than as an
  unresolved dynamic path
