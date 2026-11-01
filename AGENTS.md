# AGENTS.md — libfive-wasm

WebAssembly port of the libfive solid-modeling kernel (MPL-2.0 portions only),
published as the npm module `libfive-wasm`. The repo is currently a scaffold:
docs, OpenSpec, and CI pipelines exist; **all remaining work arrives through
OpenSpec changes**.

## Non-negotiable workflow

- All functional work happens as OpenSpec changes under `openspec/changes/<name>/`
  (`proposal.md`, `specs/`, `design.md`, `tasks.md`). Do not implement features,
  build scripts, or packaging ad hoc — no matter how small they seem.
- Workflow: explore → propose → review → apply → archive. Commands live in
  `.opencode/commands/` (`/opsx-*`) and skills in `.agents/skills/`.
- Validate before committing any change:
  `npx @fission-ai/openspec@latest validate --all --strict`
- Git: work directly on `main` — commit each change there and push. Do not
  create feature branches or pull requests per change; CI
  (`build-wasm.yml`) runs on every push to `main` and is the gate.
- Keep CI green. Both workflows are intentional scaffolds that no-op gracefully
  until the real build/publish steps land via changes — preserve that property.

## Project constraints (bind every change)

- **Design baseline:** the locked architecture and decisions in `docs/`
  (`decisions.md` is the ADR log; `architecture.md`, `build-system.md`,
  `api-design.md`, `packaging.md` define the target). Implementation changes
  must conform; changing a decision requires updating the ADR in the same
  change.
- **Scope:** port only the MPL-2.0 portions of libfive — the core C library
  (`libfive.h`) and C stdlib (`libfive/stdlib/stdlib.h`). Never vendor, build, or
  link `libfive-guile`, the Python bindings, or Studio (GPL-2+).
- **Vendoring:** libfive source lives at a pinned commit under `vendor/libfive`
  with its LICENSE file intact. Record the pinned commit and rationale in the
  change that pins it.
- **Toolchain:** Emscripten `3.1.64`, identical in CI and local builds.
- **Artifacts:** build outputs go to `dist/` (gitignored); build logic lives in
  `scripts/`.
- **Package:** one npm package `libfive-wasm` — ESM-only, async `init()`,
  convenience `Shape` API + raw C namespace, generated stdlib TypeScript types,
  targets modern browsers and Node LTS (≥18).
- **Known porting hazards** (address them in design docs, not improvisation):
  - `boost::numeric::interval` must use software rounding — WASM has no
    `fesetround`; hardware rounding detection fails under Emscripten.
  - libfive's mesher worker pool: build single-threaded first; threads/pthreads
    are a separate, deliberate change.
  - Mesh results should cross the JS boundary as typed-array views into wasm
    memory (zero-copy where possible), not JSON.

## Environment notes

- Development happens in the OpenCode toolbox container (Node 24 + npm available;
  see the workspace `TOOLS.md`). Emscripten 3.1.64 is available on the SSH
  verification server (`source /opt/emsdk/emsdk_env.sh`); CI uses the same version
  via the setup-emsdk action.
- Never write secrets to files; never modify `~/.config/opencode` beyond
  tool-managed files.
- Commits: concise imperative subjects.

## Repository map

| Path | Contents |
|---|---|
| `openspec/` | Specs and change proposals — the source of truth for what exists and what is planned |
| `docs/` | Locked design baseline: ADR log, architecture, build system, API design, packaging, roadmap of OpenSpec changes |
| `.opencode/`, `.agents/` | OpenSpec agent commands and skills |
| `.github/workflows/` | `build-wasm.yml` (build artifact), `publish-npm.yml` (tag-gated publish) |
| `vendor/` | Pin record (`libfive.lock`, `VENDOR.md`), carried patches, MPL-2.0 text; `libfive/` is generated (gitignored) by `scripts/vendor-libfive.sh` |
| `scripts/` | Vendoring + dependency fetch now; Emscripten build scripts land via the next change |
| `src/` *(planned)* | JS/TS bindings |
