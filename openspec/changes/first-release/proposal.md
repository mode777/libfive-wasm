# Proposal

## Why

Changes 1–7 leave a verified, installable package in the working tree, but it
is still version `0.0.0`, marked private, has no changelog, and the publish
workflow has never been exercised against a tagged release. Roadmap change 8
turns the verified tarball into `libfive-wasm@0.1.0`: a reviewable release
record, a publishable manifest, a tag-gated provenance publish, and post-release
verification. The npm-side trusted-publishing activation remains the one manual
prerequisite, called out explicitly so a tag cannot silently publish an
unverified tree.

## What Changes

- Add `CHANGELOG.md` with the `0.1.0` entry summarizing the first release
  (MPL-2.0 scope, wasm build, API/stdlib, packaging, verification) and the
  vendor pin/toolchain it was built from.
- Bump `package.json` to `0.1.0`, accept the publishable manifest (no longer
  `private`), and add `publishConfig` (`access: public`, provenance). Keep the
  single ESM entry, files list, license and engine floor from change 7.
- Harden `publish-npm.yml`: fail when the pushed tag is not `v<package.json
  version>`, build through `scripts/build-wasm.sh` (artifact + package entry +
  tests), and publish with `--access public --provenance` under the `npm`
  environment. Document the manual npm trusted-publishing setup (repo/workflow
  trust + `npm` environment) as the release prerequisite.
- Add `scripts/verify-release.mjs` for post-publish verification: confirm the
  registry version, integrity and provenance attestation for the released
  version, install the published package into a clean temp project, and mesh +
  export STL from both the installed package and a packaged wasm copy.
- Update `docs/packaging.md` with the executed release checklist and rollback
  policy, `README.md` with the release/version status, and `docs/roadmap.md`
  change 8 status.
- Record the release procedure and tag/version gate as AD-027.

Out of scope: changing the API, wasm ABI, mesh output or packaging layout;
publishing a different version; automating the npm-side trust setup (it has no
repository/API equivalent).

## Capabilities

### New Capabilities

- `release`: the first-release contract — changelog/version/tag consistency,
  publishable manifest, tag-gated provenance publishing with the manual trust
  prerequisite, post-publish registry/attestation verification, and a clean
  install-and-mesh smoke test (implements AD-020; supports AD-012).

### Modified Capabilities

- `npm-package`: version `0.1.0`, `private` removed for publication, and
  `publishConfig` access/provenance; the manifest shape and tarball contents
  otherwise stay as packaged and verified in change 7.
- `wasm-build-pipeline`: the publish workflow now gates on the tag matching
  `package.json` and builds the release through the same single entry point
  before publishing.

## Impact

- **New code**: `CHANGELOG.md`, `scripts/verify-release.mjs`.
- **Existing code**: `package.json` (version/private/publishConfig),
  `.github/workflows/publish-npm.yml` (tag/version gate),
  `.github/workflows/build-wasm.yml` (no functional change; version surfaced in
  docs), `README.md`.
- **APIs**: none.
- **Docs**: `CHANGELOG.md`, `docs/packaging.md` (release checklist/rollback),
  `docs/decisions.md` (AD-027), `README.md` (status/version), `docs/roadmap.md`
  (change 8).
- **Decisions**: introduces **AD-027** (release procedure: changelog +
  version/tag consistency gate, trusted-publishing prerequisite, post-publish
  registry/attestation and clean-install verification). Implements AD-020 and
  supports AD-012; alters or reverses no Accepted ADR, so no existing ADR is
  superseded.
- **Manual prerequisite**: configuring npm trusted publishing for this
  repository/workflow and the `npm` environment cannot be done from the repo;
  the release is blocked until a maintainer performs it.
