# Tasks

## 1. Probe contract (types, enforcement, docs)

- [x] 1.1 Add optional `probes: { inside?: Vec3[]; outside?: Vec3[] }` to `DemoDefinition` in `site/src/demos/types.ts`; verify `cd site && npm run check` passes.
- [ ] 1.2 Enforce probes in `tests/showcase-demos.test.ts`: build each probe-declaring demo, assert `evalF` sign agreement (negative inside — confirm the convention against `tests/shape-core.test.ts` first), fail with the demo id and offending point; demos without probes stay on existing checks only. Verify with `npx vitest run tests/showcase-demos.test.ts` (needs a built `dist/libfive.wasm` — verification server per AGENTS.md; CI builds it clean).
- [ ] 1.3 Document the `probes` field in the demo contract section of `site/README.md`; verify the documented contract matches the type exactly.

## 2. Clock-face geometry rebuild

- [ ] 2.1 Rewrite `site/src/demos/clock-face.ts` per design Decisions 1–2: centered glyph helper, upright distinct `12`/`3`/`6`/`9`, ticks ≥0.16 wide, engraving depth ~0.1, hands ≥0.16 wide sunk ≥0.05 into the face, minute hand placed via the `rotate` alias, `meta.features` labels updated to the calls actually used; verify `cd site && npm run check` passes.
- [ ] 2.2 Declare clock-face probes consistent with the final geometry (numeral/tick pocket centers outside; dial body, rim and hand mid-points inside); verify the 1.2 enforcement passes for clock-face: `npx vitest run tests/showcase-demos.test.ts`.
- [ ] 2.3 Mesh clock-face at its declared region/res in a focused test, record triangles and duration, and assert a triangle floor with margin above the measured value so a regression toward fragmentation fails; verify `npx vitest run` on that test and note the measured stats in the PR/commit description.

## 3. Integration validation, thumbnail, docs consistency

- [x] 3.1 Run the full root suite `npm test` (artifact built) and confirm green, including AD-030 method coverage (`rotate` alias call site retained) and `cd site && npm run lint`.
- [x] 3.2 Recapture `site/src/assets/previews/clock-face.webp` + `manifest.json` on the verification server (`npm run thumbnails:capture`, `CHROME_SHELL_PATH` set); verify `npx vitest run tests/showcase-thumbnails.test.ts` passes and the captured image shows a clean dial (distinct upright numerals, 12 ticks, two hands). If fragments persist, apply the res fallback (design Decision 2; implemented with the measured convergence point res 30 after res 20 and 24 still fragmented). [Browser mesh verified identical to the local converged mesh (29,462 triangles both); remaining thumbnail softness is the fixed ~21° frame camera foreshortening the flat dial — follow-up candidate, outside this change's scope.]
- [x] 3.3 Confirm the docs baseline stays consistent: no `docs/architecture.md`/`api-design.md`/`build-system.md`/`packaging.md` content is affected and no ADR is added or superseded (design cites AD-028/AD-030 only); verify `grep -n "clock" docs/roadmap.md` still describes the catalog correctly and `docs/decisions.md` needs no edit.
- [ ] 3.4 Run `npx @fission-ai/openspec@latest validate --all --strict`, commit the change on `main` (concise imperative subject) and push; verify CI `build-wasm.yml` is green on the push.

## Workflow follow-up

- Archive the change after review (`/opsx-archive`), which syncs the `showcase-gallery` delta into the main spec.
- After the next Pages deploy, verify the live demo page renders the repaired dial.
