# Tasks

Artifact-backed tasks need a release build in `dist/`; locally the build runs
on the verification server.

## 1. Package build

- [x] 1.1 Add `tsconfig.build.json` (extends the repo config,
  `emitDeclarationOnly`, `declaration`, `rootDir: src`, `outDir: dist`,
  `src/**/*` only) and `scripts/build-js.mjs`: bundle a virtual entry that
  imports `dist/libfive.js`, re-exports `src/index.ts` and overrides `init`
  with `initFromFactory(createLibfiveModule, options)`, using esbuild ESM at
  ES2022 into `dist/index.js`, then run `tsc -p tsconfig.build.json`. Verify:
  `node scripts/build-js.mjs` produces `dist/index.js` and `dist/index.d.ts`,
  and `npm run check` still passes.
- [x] 1.2 Add `esbuild` and `vite` as dev dependencies and the
  `build:js`/`test:package` scripts; run `npm install` so the lockfile records
  them. Verify: `npm ci` reproduces the tree and `node -p` resolves both
  packages.
- [x] 1.3 Wire `scripts/build-wasm.sh` to run `node scripts/build-js.mjs` after
  linking and before the acceptance suites, failing with an actionable message
  when `node_modules/.bin/tsc` or esbuild is missing. Verify: a release build
  on the verification server produces the entry/declarations, and the existing
  smoke/interval/golden suites still pass.

## 2. Manifest, license and tarball

- [x] 2.1 Finalize `package.json`: `exports` (`"."` → `./dist/index.js` with
  `./dist/index.d.ts`), `types`, `files` (`dist`, `README.md`, `LICENSE`),
  `sideEffects: false`, `engines.node >= 18`, package metadata; keep
  `private: true`. Verify: `npm pack --dry-run --json` lists only intended
  paths and includes `dist/index.js`, `dist/index.d.ts`, `dist/libfive.wasm`,
  `README.md`, `LICENSE`.
- [x] 2.2 Add a root `LICENSE` carrying the canonical MPL-2.0 text (matching
  `vendor/LICENSE.mpl-2.0`) and confirm `package.json` points at it. Verify:
  the file is byte-identical to the vendored license text and appears in the
  pack list.
- [x] 2.3 Confirm the tarball has no runtime dependencies (only dev
  dependencies), and that `dist/debug/`, source, tests, `vendor/` and `build/`
  are absent from the pack list. Verify: the pack JSON contains no `dependencies`
  entry and no disallowed path.

## 3. Consumer verification

- [x] 3.1 Add `scripts/test-package.mjs`: pack the tarball into a temp dir,
  install it into a scratch ESM project, run a Node check (`init`, `sphere`,
  `mesh`, non-zero counts, frees), then build a Vite app importing the installed
  package and assert the output contains a wasm asset; clean up unless
  `KEEP_PACKAGE_TEST=1`. Verify: `npm run test:package` against a built tree
  exits zero, and fails with a clear message when `dist/index.js` is absent.
- [x] 3.2 Add a TypeScript consumer check to the scratch project (or a
  separate `tsc --noEmit` invocation) that imports the installed package and
  uses `init`, `sphere`, `mesh` and `exportSTL`. Verify: typechecking succeeds
  using only packaged declarations.
- [x] 3.3 Add a "Consumer package test" step to `.github/workflows/build-wasm.yml`
  after the package suite. Verify: the workflow YAML parses and the step order
  is checkout → emsdk → node → npm ci → build → npm test → package test.

## 4. Documentation and ADR

- [x] 4.1 Add AD-026 to `docs/decisions.md` (bundled ESM entry with inlined
  Emscripten factory, declaration tree, tarball consumer verification) with its
  status-table row. Verify: the table lists AD-026 as Accepted, the entry has
  Context/Decision/Consequences, cites AD-002/AD-007/AD-012 and no existing ADR
  text is edited.
- [x] 4.2 Rewrite `README.md` for consumers: install/import, quick start,
  `res` semantics warning, Node + browser/bundler notes (default asset emission
  and `wasmBinary`), Worker recipe, memory rules, and the contributor
  build/verification commands. Verify: every example matches the shipped API and
  the document no longer describes the repo as a pre-development scaffold.
- [x] 4.3 Update `docs/packaging.md` (final manifest, `dist/` layout, bundled
  entry, consumer test) and `docs/build-system.md` (JS/declaration build step,
  tarball verification). Update `docs/roadmap.md` change 7 status to Done.
  Verify: both docs name `dist/index.js`, `dist/index.d.ts`,
  `scripts/build-js.mjs` and `scripts/test-package.mjs`, and the roadmap row
  reads Done.

## 5. Integration checks

- [x] 5.1 Full gate: `npm run check && npm run lint && npm run golden &&
  npm test`, `npm run test:package`, and
  `npx @fission-ai/openspec@latest validate --all --strict`. Verify: all
  commands exit zero.
- [x] 5.2 Verify `docs/decisions.md` reflects what was implemented (AD-026
  present and Accepted, no other ADR altered) and that the packaged layout
  matches `docs/packaging.md`. Verify: `git diff --stat` leaves the frozen
  export manifest, `vendor/` and mesh goldens unchanged.

## Workflow follow-up

- Present the implemented change for review, then archive it with
  `/opsx-archive` once the project's review requirements are satisfied.
- At archive, re-check the synced specs against `docs/decisions.md`: no
  requirement may contradict an Accepted ADR.
