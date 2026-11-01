# libfive-wasm

> WebAssembly port of [libfive](https://github.com/libfive/libfive) — Matt Keeter's
> functional-representation solid modeling kernel — published as an npm module.

## Purpose

`libfive-wasm` brings libfive's kernel to the browser and Node.js as **one npm
package** — the compiled `.wasm` *plus* a convenience JavaScript/TypeScript API
(modeled on libfive's Python bindings) — with no native dependencies:

- **Build f-rep trees in code** — a `Shape` class with chainable methods
  (`sphere(1).difference(box([2, 1, 1])).blend(…)`), the full C standard
  library (blends, offsets, shells, morphs, lofts, transforms, arrays,
  text…), and every scalar slot accepting a plain `number`.
- **Mesh them to triangles** — watertight, manifold, feature-preserving output
  from libfive's adaptive dual-contouring mesher. Blended booleans
  ("MagicaCSG-style" clay) come out of the same tree. Results cross into JS
  as zero-copy typed-array views; `exportSTL()` is included.
- **Ship it as one package** — the whole kernel compiled via Emscripten into a
  single `libfive.wasm`, wrapped in the typed JS/TS API with the raw C
  bindings exposed as an advanced escape hatch. Same import in Node and the
  browser: `await init()`.

Motivation: libfive has no official WebAssembly build. A 2018 proof of concept
([libfive#117](https://github.com/libfive/libfive/issues/117)) demonstrated that
the C++ core compiles almost unmodified under Emscripten, but the fork was never
maintained or merged. This repo turns that result into a maintained, reproducibly
built, published npm package.

## Scope

**In scope**

- The MPL-2.0 portions of libfive: the core C library (`libfive.h`) and the
  C standard library (`libfive/stdlib/libfive_stdlib.h`).
- An Emscripten build pipeline with a pinned toolchain and reproducible artifacts.
- A convenience JavaScript/TypeScript API modeled on the Python bindings:
  `Shape` class + generated stdlib wrappers (trees in, typed-array meshes out),
  plus the documented raw C namespace beneath it.
- npm packaging as the single package `libfive-wasm` (ESM-only, async `init()`,
  generated types), compatible with Node LTS and modern browsers.
- GitHub Actions pipelines: build the wasm artifact on every push; publish the
  npm module on version tags.

**Out of scope (non-goals)**

- Guile/Scheme bindings, Python bindings, and Studio — the GPL-licensed parts of
  upstream. Excluded for licensing and portability; the C API covers all
  functionality.
- The GPU rendering path ([mpr](https://github.com/mkeeter/mpr/)).
- Any authoring UI beyond the programmatic API.

## Status

Pre-development scaffold. The repository purpose, CI pipelines, and the
[OpenSpec](https://github.com/Fission-AI/openspec) spec system are in place.
**Every piece of the actual port** — vendoring libfive, the Emscripten build,
bindings, packaging, publishing — lands as a tracked change under
`openspec/changes/`.

## Development

This repository is spec-driven: work is proposed, specified, implemented, and
archived as OpenSpec changes before code exists for it. The overall design is
locked in [`docs/`](docs/) and every implementation change must conform:

| Doc | Contents |
|---|---|
| [docs/decisions.md](docs/decisions.md) | ADR log — the locked decisions and their rationale |
| [docs/architecture.md](docs/architecture.md) | Layering, source layout, object lifetimes, threading |
| [docs/build-system.md](docs/build-system.md) | Vendoring, Emscripten flags, interval-rounding hazard, CI contract |
| [docs/api-design.md](docs/api-design.md) | The public JS/TS API: `Shape`, stdlib, `Mesh`, raw bindings |
| [docs/packaging.md](docs/packaging.md) | npm layout, versioning, publish flow |
| [docs/roadmap.md](docs/roadmap.md) | Ordered sequence of OpenSpec changes from scaffold to first release |

| Path | Purpose |
|---|---|
| `openspec/` | Living specs (`specs/`) and change proposals (`changes/`) |
| `scripts/vendor-libfive.sh` | Recreates the pinned, patched `vendor/libfive` tree from `vendor/libfive.lock` |
| `scripts/fetch-deps.sh` | Downloads and SHA-256-verifies the pinned Eigen + Boost headers into `build/deps/` |
| `scripts/build-wasm.sh` | Builds `dist/libfive.wasm` + ES6 glue with Emscripten 3.1.64 and runs the Node acceptance suites |
| `scripts/test-smoke.mjs` / `scripts/test-interval.mjs` | Artifact smoke test and software-interval-rounding acceptance test (AD-015) |
| `scripts/capture-goldens.mjs`, `tests/goldens/` | Golden mesh capture command and checked-in scene results (AD-025) |
| `vendor/` | Pin record (`VENDOR.md`, `libfive.lock`), carried patches, MPL-2.0 text, and the generated `libfive/` tree |
| `.opencode/`, `.agents/` | OpenSpec commands and skills for coding agents |
| `.github/workflows/build-wasm.yml` | Builds, tests and uploads the wasm artifact on every push/PR |
| `.github/workflows/publish-npm.yml` | Publishes the npm module on `v*` tags (inert until packaging lands) |

Populate the sources and build the artifact:

```sh
scripts/vendor-libfive.sh   # vendor/libfive at the pinned commit, patches applied
scripts/fetch-deps.sh       # Eigen + Boost headers under build/deps
scripts/build-wasm.sh       # dist/libfive.wasm + dist/libfive.js, then the tests
```

The first two are idempotent and cache their downloads under `build/`; add
`--check` to verify the existing trees without writing, or `--force` to rebuild.
The pin, trim list, digest, and bump procedure live in `vendor/VENDOR.md`.

`build-wasm.sh` requires Emscripten `3.1.64` (pinned in CI and on the development
verification server), where `source /opt/emsdk/emsdk_env.sh` provides it. Use
`--debug` for an unoptimized flavor under `dist/debug/`; `--no-tests` skips the
Node suites during local iteration.

After a release build (and `npm ci`), verify mesh output and the package suite:

```sh
npm run golden           # compare the four canonical scenes to tests/goldens/
npm test                 # full package suite, including goldens + fault injection
```

Goldens are captured only from a reviewed release artifact, never edited by
hand. When the vendor pin, Boost/Eigen pins, interval policy, Emscripten version
or a scene definition changes, recapture and review the JSON diff:

```sh
npm run golden:capture   # prints the pin/digest, rewrites tests/goldens/*.json
```

## License

- Ported libfive source: **MPL-2.0** © Matthew Keeter — license preserved in any
  vendored copy.
- This repository's build glue, bindings, and docs: **MPL-2.0** (locked in
  [docs/decisions.md](docs/decisions.md#ad-012)).
- GPL-licensed upstream components are deliberately **not** part of this port.

Upstream: <https://github.com/libfive/libfive> ·
Prior art: [Omniblox WASM PoC](https://github.com/Omniblox/libfive/tree/add-web-assembly-support)
([demo](https://omniblox.github.io/libfive/))
