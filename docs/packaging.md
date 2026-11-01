# Packaging & publishing

How the single npm package (AD-002, AD-007) is laid out, versioned, and
shipped. ADRs: AD-002, AD-007, AD-012, AD-019, AD-020.

## Package manifest

```jsonc
{
  "name": "libfive-wasm",
  "type": "module",
  "exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } },
  "types": "./dist/index.d.ts",
  "files": ["dist", "!dist/debug", "README.md", "LICENSE"],
  "sideEffects": false,
  "engines": { "node": ">=18" },
  "license": "MPL-2.0",
  "private": true
}
```

- **Single entry point.** `Shape`/stdlib/`init`/`exportSTL` and `libfive.raw`
  all hang off the default export surface; no subpaths to stabilize.
- `dist/` contents (gitignored, produced by `scripts/build-wasm.sh`):
  `index.js` (esbuild bundle of the API and the inlined Emscripten factory),
  `index.d.ts` plus the declaration tree it references, `libfive.wasm`, and
  the raw `libfive.js` glue (kept for transparency/debugging; the bundle does
  not depend on it). `dist/debug/` is excluded from the tarball.
- `sideEffects: false` keeps consumer bundles tree-shakable (the wasm loads
  lazily inside `init()`).
- No runtime dependencies. Dev dependencies (esbuild, vite, typescript,
  vitest, …) never enter the tarball.
- `private` stays `true` until the release change flips it with the version
  bump; `npm pack` works regardless, `npm publish` does not.
- `prepack` runs `scripts/build-js.mjs`, so a pack from a built tree always has
  current JS/declarations (it still requires `dist/libfive.wasm`).

## Environment support

| Environment | Support |
|---|---|
| Node ≥ 18 (ESM) | ✅ first-class; loader reads the wasm via `fs` from `import.meta.url` |
| Modern browsers (ES2020 + wasm) | ✅ first-class; `fetch` of the sibling `.wasm` |
| Web Workers | ✅ compiled-in (`ENVIRONMENT=worker`) |
| CJS consumers | via dynamic `import()` — documented, not shipped as a build |
| Deno / Bun | expected to work (standard APIs only); not a test target |

### Bundler notes (kept in README too)

- **Vite / Rollup / webpack 5**: the bundled entry contains the Emscripten
  factory, so its literal `new URL('libfive.wasm', import.meta.url)` is
  understood natively and the wasm is emitted as an asset. No plugin required.
- **Server-side SSR (Next.js etc.)**: import with `init({ wasmBinary })` if
  the bundler relocates assets, or lazy-import inside the request handler.
- Anything exotic: `options.wasmBinary` always wins; `options.locateWasm`
  maps the artifact filename to a caller-controlled URL.

The consumer test (`scripts/test-package.mjs`) packs the real tarball, installs
it into a scratch project, meshes from Node, typechecks against the packaged
declarations, and runs a Vite production build that must emit the wasm asset.
CI runs it after the package suite.

## Versioning

- **0.x** until the API stabilizes in the wild; breaking changes allowed in
  minor bumps with a changelog entry. Start at `0.1.0` with the first
  published build.
- **1.0** once `Shape` + stdlib + `Mesh` surfaces have been exercised by
  real usage and the raw namespace is typed completely.
- Semver covers the **TypeScript API and the raw namespace**; wasm-internal
  layout is explicitly *not* stable.
- Deprecations: mark with `@deprecated` JSDoc for at least one minor
  release before removal.

## Release & publishing flow (AD-020)

1. `build-wasm.yml` runs on every push/PR: builds `dist/` via
   `scripts/build-wasm.sh`, runs the Node smoke + golden mesh tests, uploads
   the artifact. This is the quality gate; it must stay green.
2. Publishing is **tag-gated**: push a `v*` tag matching `package.json`.
3. `publish-npm.yml` builds, then `npm publish --access public --provenance`
   using **npm trusted publishing (OIDC)** — no `NPM_TOKEN`:
   - requires the npm package to be configured to trust this repo's
     workflow once, on the npm side, with the `npm` GitHub environment
     (already referenced by the workflow);
   - provenance statements come for free from the OIDC token.
4. Release checklist (in the release change): update CHANGELOG, bump
   `package.json`, tag `vX.Y.Z`, let CI publish, verify
   `npm view libfive-wasm` and the provenance attestation.

## Artifact provenance & traceability

- CI prints the SHA-256 of `dist/libfive.wasm` on every build.
- `vendor/VENDOR.md` records the pinned upstream commit; the release notes
  reference it, so any published version is reproducible from
  `scripts/deps.lock` + the pin.
