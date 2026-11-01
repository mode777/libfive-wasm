# Design

## Context

See `proposal.md` for motivation and the three spec deltas for contracts. The
release leans on what changes 1–7 already proved:

- `scripts/build-wasm.sh` builds the artifact, the package entry/declarations,
  and runs smoke, interval, golden and (via CI) package/consumer suites.
- `scripts/test-package.mjs` already proves a packed tarball installs in Node
  and a Vite build.
- `publish-npm.yml` is tag-gated, uses `id-token: write`, the `npm`
  environment and `npm publish --access public --provenance`, but has never
  been exercised and does not check the tag against `package.json`.
- The package is not on the registry (`npm view libfive-wasm` → 404) and this
  environment has no npm credentials or trusted-publishing relationship.

## Goals / Non-Goals

**Goals:**

- A release commit/tag that is self-describing and hard to publish by mistake.
- Provenance publishing through the existing workflow, with the npm-side trust
  setup as the only manual gate.
- Post-publish verification that inspects the registry and installs the real
  package.
- A documented rollback path.

**Non-Goals:**

- Publishing from this working environment (no npm auth; trust is maintainer-
  side).
- Changing API/ABI/packaging layout or the version strategy (0.x).
- Automating npm-side trusted-publishing setup; npm exposes no repository API
  for it.

## Decisions

### D1 — One release record: changelog, manifest version and tag (AD-020, AD-027)

`CHANGELOG.md` starts with `## 0.1.0 — 2026-11-01` (Keep a Changelog shape)
summarizing the release: MPL-2.0 scope, pinned build, `Shape`/stdlib/`Mesh`
surface, raw namespace, verification gates and packaging. `package.json` is
`0.1.0`; the release tag is annotated `v0.1.0`. The tag is created only after
the release commit is reviewed; the version/tag match is enforced in CI rather
than by convention.

Alternatives considered: a generated changelog from commits (rejected — the
repository's history is OpenSpec-shaped, and the first release deserves a
curated narrative) and versioning from git tags (rejected — `package.json` is
the single manifest consumers and npm read).

### D2 — Flip `private` and declare publish config at release (AD-002, AD-020)

`private` is removed and `publishConfig` becomes
`{ "access": "public", "provenance": true }`. The workflow still passes
`--access public --provenance` explicitly, so the behavior is identical from
either entry point. Everything else in the manifest (exports, types, files,
sideEffects, engines, license, no runtime dependencies) is unchanged from the
packaging change; the release tarball is the same tree the consumer test
verified.

### D3 — Tag/version gate before build and publish (AD-020, AD-027)

`publish-npm.yml` gains a first step that compares `GITHUB_REF_NAME` with
`v$(node -p "require('./package.json').version")` and fails on mismatch. The
existing build step (`scripts/build-wasm.sh`) and publish step remain; the
build runs the golden and package suites, so a tag cannot publish an artifact
that the normal gate would reject. The workflow keeps `environment: npm`,
`contents: read`, `id-token: write` and the single `npm publish` invocation.

Alternatives considered: publishing from `build-wasm.yml` on version bumps
(rejected — a tag is the explicit release act) and a separate release branch
(rejected — the project works on `main` per AGENTS.md).

### D4 — Post-publish verification is a script, not a checklist (AD-020, AD-027)

`scripts/verify-release.mjs [version]` (default: `package.json` version):

1. `npm view libfive-wasm@<version> version dist.integrity dist.attestations
   --json` and assert the version/integrity exist and an attestation entry is
   present (provenance); fail naming the missing field.
2. Create a temp project, install `libfive-wasm@<version>` from the registry,
   run `init()`, build `sphere(1)`, mesh, `exportSTL()` and assert non-zero
   counts/valid STL size.
3. Print the registry tarball integrity and the vendor pin from the release
   commit so the verification is traceable.

The script is manual/post-CI (run after the workflow succeeds) and needs
network; it is not part of `npm test`.

### D5 — Manual prerequisite and rollback (AD-027)

The npm package must be configured to trust this repository's publish workflow
with the `npm` GitHub environment (npm-side setting). Until then the publish
step fails; no tag is pushed from this change. If a published release is wrong,
the documented rollback is `npm unpublish libfive-wasm@<version>` within the
registry window (or `npm deprecate` after it), followed by a patch release;
the wasm digest, vendor pin and tarball integrity are recorded in the release
notes so the replacement can be verified.

### D6 — Docs and ADR in the same change

`docs/packaging.md` gains the executed checklist, the tag/version gate, the
manual trust prerequisite and the rollback policy. `README.md` states the
current release/version and the install command. `docs/decisions.md` gains
AD-027. `docs/roadmap.md` records the release state: repo-side work Done, the
actual publish pending the manual npm trust prerequisite.

## Risks / Trade-offs

- **Publishing by accident from a tag** → the tag/version gate, the `npm`
  environment (required reviewer), and the manual trust setup all have to be
  satisfied; no tag is pushed by this change.
- **Trusted publishing misconfiguration** → the verification script treats a
  missing attestation/integrity as failure and names the field.
- **Registry test install needs network** → it is a release-time check, not a
  CI gate; the offline consumer test already covers the tarball contents.
- **Version/tag drift after a later change** → the workflow check fails on
  every tag, so the manifest is always the source of truth.
- **Cannot publish from this environment** → explicitly recorded as the manual
  prerequisite; the repository-side release is complete and reviewable, and
  the publish/verify steps are ready to run once trust is configured.
