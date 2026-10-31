# libfive-wasm

> WebAssembly port of [libfive](https://github.com/libfive/libfive) — Matt Keeter's
> functional-representation solid modeling kernel — published as an npm module.

## Purpose

`libfive-wasm` brings libfive's kernel to the browser and Node.js so procedural
geometry can be generated at runtime with no native dependencies:

- **Build f-rep trees in code** — CSG with blend parameters (`union`, `subtract`,
  `intersect`, blends, offsets, shells, morphs, lofts…), all reachable through
  libfive's C standard library.
- **Mesh them to triangles** — watertight, manifold, feature-preserving output from
  libfive's adaptive dual-contouring mesher. Blended booleans ("MagicaCSG-style"
  clay) come out of the same tree.
- **Ship it as one `.wasm`** — the whole kernel compiled via Emscripten, wrapped in
  a small typed JavaScript/TypeScript API.

Motivation: libfive has no official WebAssembly build. A 2018 proof of concept
([libfive#117](https://github.com/libfive/libfive/issues/117)) demonstrated that
the C++ core compiles almost unmodified under Emscripten, but the fork was never
maintained or merged. This repo turns that result into a maintained, reproducibly
built, published npm package.

## Scope

**In scope**

- The MPL-2.0 portions of libfive: the core C library (`libfive.h`) and the
  C standard library (`libfive/stdlib/stdlib.h`).
- An Emscripten build pipeline with a pinned toolchain and reproducible artifacts.
- JavaScript/TypeScript bindings around the C API (trees in, typed-array meshes out).
- npm packaging as `libfive-wasm` (ESM, generated types).
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
archived as OpenSpec changes before code exists for it.

| Path | Purpose |
|---|---|
| `openspec/` | Living specs (`specs/`) and change proposals (`changes/`) |
| `.opencode/`, `.agents/` | OpenSpec commands and skills for coding agents |
| `.github/workflows/build-wasm.yml` | Builds the wasm artifact (no-ops until the build change lands) |
| `.github/workflows/publish-npm.yml` | Publishes the npm module on `v*` tags (inert until packaging lands) |

Toolchain: Emscripten `3.1.64` (pinned in CI and on the development verification
server).

## License

- Ported libfive source: **MPL-2.0** © Matthew Keeter — license preserved in any
  vendored copy.
- This repository's build glue and bindings: MIT (intended — finalized via an
  OpenSpec change before first publish).
- GPL-licensed upstream components are deliberately **not** part of this port.

Upstream: <https://github.com/libfive/libfive> ·
Prior art: [Omniblox WASM PoC](https://github.com/Omniblox/libfive/tree/add-web-assembly-support)
([demo](https://omniblox.github.io/libfive/))
