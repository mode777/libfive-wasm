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

## Release & publishing flow (AD-020, AD-027)

1. `build-wasm.yml` runs on every push/PR: builds `dist/` via
   `scripts/build-wasm.sh` (artifact, package entry, declarations), runs the
   smoke, interval, golden, package and consumer tests, uploads the artifact.
   This is the quality gate; it must stay green.
2. Publishing is **tag-gated and version-checked**: `publish-npm.yml` fails
   unless the pushed tag is exactly `v<package.json version>`, then installs
   dev dependencies, builds through `scripts/build-wasm.sh`, and runs the
   package + consumer suites before publishing.
3. `npm publish --access public --provenance` uses **npm trusted publishing
   (OIDC)** — no `NPM_TOKEN`. The one manual prerequisite is configuring the
   npm package to trust this repository's publish workflow and the `npm`
   GitHub environment **on the npm side**. Until that exists, the publish step
   fails with a trust/auth error; no tag should be pushed.
4. Release checklist (first release: `0.1.0`):
   - confirm `build-wasm.yml` is green on `main` and the tree is reviewed;
   - update `CHANGELOG.md`, set `package.json` version, drop `private` and keep
     `publishConfig` public/provenance;
   - complete the npm-side trust prerequisite (step 3);
   - commit, create an annotated `vX.Y.Z` tag and push it;
   - let `publish-npm.yml` publish, then run
     `node scripts/verify-release.mjs X.Y.Z` — it checks the registry version,
     `dist.integrity`, provenance attestation, and installs that exact version
     into a clean project to mesh and export STL;
   - confirm `npm view libfive-wasm@X.Y.Z`, record the wasm SHA-256, vendor pin
     and tarball integrity in the release notes.
5. Rollback: `npm unpublish libfive-wasm@X.Y.Z` within the registry window (or
   `npm deprecate` after it), then publish a patched version; use the recorded
   digest/pin to prove the replacement. Never move a published tag.

## Artifact provenance & traceability

- CI prints the SHA-256 of `dist/libfive.wasm` on every build.
- `vendor/VENDOR.md` records the pinned upstream commit; the release notes
  reference it, so any published version is reproducible from
  `scripts/deps.lock` + the pin.
