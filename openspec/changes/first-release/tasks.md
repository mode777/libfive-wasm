# Tasks

Tasks 1–3 and 4.1 are repository-side and complete. Tasks 4.2–4.4 were
performed for the `0.1.0` release (trusted publishing configured, `v0.1.0`
tagged and published, registry/provenance verified). Task 4.5 remains before
the change is archived.

## 1. Release record and manifest

- [x] 1.1 Add `CHANGELOG.md` with a `0.1.0` section (Keep a Changelog shape)
  covering the MPL-2.0 scope, pinned build inputs/toolchain, `Shape`/stdlib/
  `Mesh`/raw surface, verification gates and packaging. Verify: the heading,
  date and vendor pin are present and every shipped capability is mentioned.
- [x] 1.2 Bump `package.json` to `0.1.0`, remove `private`, and add
  `publishConfig` (`access: public`, `provenance: true`). Verify: manifest
  fields still satisfy `npm-package` and `npm pack --dry-run --json` lists the
  same intended files.
- [x] 1.3 Add the tag/version gate to `publish-npm.yml` before the build step:
  fail unless `GITHUB_REF_NAME` equals `v<package.json version>`. Verify: the
  workflow YAML parses and a simulated mismatch exits non-zero.

## 2. Post-publish verification

- [x] 2.1 Add `scripts/verify-release.mjs [version]`: query the registry for
  version/integrity/attestation, fail naming missing fields, then install the
  published package into a clean temp project and mesh + export STL. Verify:
  `node scripts/verify-release.mjs 0.1.0` exits non-zero with a clear
  "not published/attestation missing" message before the release.
- [x] 2.2 Prove publish readiness offline: `npm pack --dry-run --json` and, if
  the local npm supports it without auth, `npm publish --dry-run`; confirm the
  tarball, version and files are the release artifacts. Verify: no auth or
  network publish occurs and the dry-run output matches the packaging spec.

## 3. Documentation and ADR

- [x] 3.1 Add AD-027 to `docs/decisions.md` (release procedure: changelog,
  version/tag gate, trusted-publishing prerequisite, post-publish registry/
  attestation + clean-install verification) with its status-table row. Verify:
  the table lists AD-027 as Accepted, the entry has Context/Decision/
  Consequences, cites AD-020/AD-012 and no existing ADR text is edited.
- [x] 3.2 Update `docs/packaging.md` with the executed release checklist, the
  tag/version gate, the manual npm trust prerequisite and the rollback policy;
  update `README.md` with the release/version status and install command.
  Verify: both name `CHANGELOG.md`, `v0.1.0`, the trust prerequisite and
  `scripts/verify-release.mjs`.
- [x] 3.3 Update `docs/roadmap.md`: change 8 repository-side work done, publish
  pending the manual trust prerequisite. Verify: the roadmap row/notes match
  the actual state rather than claiming a published package.

## 4. Release gate and actual publish

- [x] 4.1 Full gate: `npm run check && npm run lint && npm run golden &&
  npm test && npm run test:package`, and
  `npx @fission-ai/openspec@latest validate --all --strict`. Verify: all exit
  zero.
- [x] 4.2 **(manual, maintainer)** Configure npm trusted publishing for this
  repository/workflow and the `npm` environment on the npm side. Verify: the
  npm package settings show the trust relationship.
- [x] 4.3 Commit the release tree and create/push the annotated `v0.1.0` tag
  once 4.2 is complete. Verify: `git tag -n` shows `v0.1.0` on the release
  commit and `publish-npm.yml` runs.
- [x] 4.4 Verify the published release:
  `node scripts/verify-release.mjs 0.1.0`, then confirm `npm view
  libfive-wasm@0.1.0` and the provenance attestation. Verify: the script exits
  zero and its clean-project mesh/STL checks pass.
- [ ] 4.5 Post-release smoke install in a clean Node and browser project from
  the registry (not the tarball). Verify: both mesh a shape.

## Workflow follow-up

- Archive this change only after 4.2–4.5 complete; the repository-side artifacts
  are ready before then.
- At archive, re-check the synced specs against `docs/decisions.md`: no
  requirement may contradict an Accepted ADR.
