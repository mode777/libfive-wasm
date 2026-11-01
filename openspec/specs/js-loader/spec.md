# js-loader Specification

## Purpose

Defines the package's asynchronous initialization contract: how `init()`
resolves and instantiates the wasm artifact across Node, browsers and
workers, how the caller options (`wasmBinary`, `locateWasm`, `debug`) are
honored, and what happens when the artifact cannot be loaded (AD-007).
Every later capability builds on the instance this capability returns.

## Requirements

### Requirement: Asynchronous initialization
The package SHALL export `init(options?)` returning `Promise<Libfive>`,
and the resolved instance SHALL expose a functional kernel: after awaiting
`init()`, tree construction and evaluation through the raw namespace SHALL
succeed without further setup.

#### Scenario: Awaiting init yields a working kernel
- **WHEN** `await init()` completes on a checkout with a built artifact
- **THEN** the returned instance's raw namespace can construct a tree and
  evaluate it, with no additional setup calls

#### Scenario: init is promise-based
- **WHEN** `init()` is called without `await`
- **THEN** it returns a Promise that resolves to the instance and rejects
  if instantiation fails

### Requirement: Default wasm resolution
With no options, `init()` SHALL load the artifact that ships beside the
package module using the `import.meta.url`-based resolution of the
Emscripten ES6 factory, without Node-only or browser-only APIs in the
resolution path (AD-007).

#### Scenario: Default resolution in Node
- **WHEN** `init()` runs in Node ≥ 18 against the built `dist/` output with
  no options
- **THEN** the sibling `libfive.wasm` is found and instantiation succeeds

#### Scenario: Default resolution needs no option plumbing in bundlers
- **WHEN** a bundler (Vite/webpack/Rollup) processes an import of the
  package
- **THEN** the `import.meta.url`-relative artifact reference is understood
  as a static asset and no loader plugin is required

### Requirement: Caller-supplied wasm binary
`init()` SHALL accept `wasmBinary` (ArrayBuffer or ArrayBufferView) and
instantiate from exactly those bytes instead of resolving the artifact,
taking precedence over `locateWasm` and default resolution.

#### Scenario: Explicit bytes are used
- **WHEN** `init({ wasmBinary })` is called with the bytes of the built
  artifact
- **THEN** instantiation succeeds without any file/URL resolution

#### Scenario: Invalid bytes are rejected
- **WHEN** `init({ wasmBinary })` receives bytes that are not a valid wasm
  module
- **THEN** the returned Promise rejects with an error identifying the
  failed instantiation, and no partial instance is returned

### Requirement: Custom wasm location
`init()` SHALL accept `locateWasm(filename)`, mapping the artifact
filename to a URL used for fetching, for callers whose bundler or runtime
relocates assets.

#### Scenario: relocateWasm-style override
- **WHEN** `init({ locateWasm })` returns a URL under which a copy of the
  artifact is served
- **THEN** instantiation succeeds by loading from that URL

#### Scenario: Unreachable location fails with a named error
- **WHEN** `locateWasm` returns a URL that cannot be fetched
- **THEN** the returned Promise rejects with an error naming the wasm load
  failure

### Requirement: Debug option
`init()` SHALL accept a `debug` option that enables lifecycle diagnostics
for the returned instance; enabling it SHALL NOT otherwise change
instantiation or kernel behavior. The diagnostics behavior itself
(leaked-object warnings) is specified with the object-lifecycle capability
(AD-005).

#### Scenario: Debug instance behaves identically
- **WHEN** `init({ debug: true })` is called
- **THEN** initialization succeeds and all raw operations work exactly as
  on a default instance

### Requirement: Independent instances
Each `init()` call SHALL produce an independent module instance with its
own wasm heap; instances SHALL NOT share memory, and disposing of or
allocating in one instance SHALL NOT affect another.

#### Scenario: Two instances do not share memory
- **WHEN** `init()` is called twice and both Promises resolve
- **THEN** the two instances expose distinct wasm memory, and allocations
  or frees through one are not observable through the other

### Requirement: Load failures reject with identifiable errors
When the artifact cannot be resolved, fetched, or instantiated, `init()`
SHALL reject with an error that identifies the failed wasm load (message
states the cause); a failed init SHALL NOT resolve.

#### Scenario: Missing artifact
- **WHEN** default resolution cannot find `libfive.wasm`
- **THEN** `init()` rejects with an error naming the missing artifact

### Requirement: ESM-only entry point
The package SHALL be ESM-only (`"type": "module"`), targeting Node ≥ 18
and modern browsers; CommonJS consumers SHALL be served through dynamic
`import()` (AD-007).

#### Scenario: ESM import in Node
- **WHEN** the package root is imported from an ES module in Node ≥ 18
- **THEN** `init` is available as an export and calling it yields a working
  instance

#### Scenario: CJS consumer via dynamic import
- **WHEN** a CommonJS script loads the package with `await import()`
- **THEN** initialization succeeds

### Requirement: Multi-environment support
The loader SHALL work in Node, browsers, and Web Workers using only
standard platform APIs, matching the artifact's compiled-in environments
(web, node, worker) (AD-008).

#### Scenario: Node and worker environments instantiate the same artifact
- **WHEN** the loader instantiates the artifact in Node and in a
  worker-like environment
- **THEN** both produce working instances from the same artifact without
  environment-specific options

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
