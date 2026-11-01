# Changelog

All notable changes to `libfive-wasm` are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
semantic versioning for its TypeScript API and raw C namespace.

## [0.1.0] — 2026-11-01

First public release: the MPL-2.0 portions of libfive, compiled to WebAssembly
and packaged as one ESM module for Node ≥ 18 and modern browsers.

### Added

- **Kernel** — libfive pinned at commit
  `918387a9220dbac2f7ab32fb35e274c6794439cf` (2026-10-16), trimmed to the
  MPL-2.0 C API and C stdlib, with carried patches for the Emscripten host,
  static archives, single-threaded meshing and software interval rounding.
  Built with Emscripten 3.1.64, Eigen 3.4.0 and Boost 1.92.0 headers.
- **Package API** — async `init()` with default `import.meta.url` wasm
  resolution, `wasmBinary`/`locateWasm`/`debug` options, the chainable `Shape`
  class (arithmetic, math, CSG, transforms, evaluation, remapping), `Mesh`
  with re-binding zero-copy views and JS-owned copies, `exportSTL`, and the
  typed `libfive.raw` C namespace.
- **Generated stdlib** — full `libfive_stdlib.h` coverage as camelCase
  top-level functions and `Shape` methods, generated from the vendored header
  and backed by generated flat C shims (struct-by-value arguments included).
- **Packaging** — one bundled ESM entry with the Emscripten factory inlined,
  emitted TypeScript declarations, `libfive.wasm`, MPL-2.0 license, no runtime
  dependencies, and a Vite/Node consumer verification.
- **Verification** — artifact smoke test, software-interval-rounding suite
  (conservative bounds, no `fesetround`), checked-in golden meshes for sphere,
  gyroid, blended union and text with one-ulp fault injection, and a consumer
  tarball install test.

### Notes

- Meshing is synchronous on the calling thread in v1; run `init()` and meshing
  in a Worker for interactive use.
- `res` is the inverse of the minimum feature size (`min_feature = 1/res`);
  larger values mesh finer.
- Only the MPL-2.0 upstream portions are included. Guile/Scheme and Python
  bindings and Studio (GPL-2+) are deliberately absent.

[0.1.0]: https://github.com/mode777/libfive-wasm/releases/tag/v0.1.0
