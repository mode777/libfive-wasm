# Proposal

## Why

The `clock-face` showcase demo renders as garbage on the live site: the ticks are
fragmentary, the numerals are broken slivers at wrong angles, and three of the
four numerals are literally the same glyph (`3`). The committed gallery preview
(`site/src/assets/previews/clock-face.webp`) shows the same breakage, so the demo
shipped broken and CI could not see it: `tests/showcase-demos.test.ts` meshes
every demo at `res` capped to ≤ 8 and only asserts a non-empty, finite mesh.

## What Changes

- Fix the demo's geometry bugs in `site/src/demos/clock-face.ts`:
  - `six` and `nine` are built from `glyph('3')` — they must be `'6'` and `'9'`.
  - All three side numerals share one rotation while `12` is upright; the dial
    reads wrong even where the mesh survives.
  - Features are too thin for the mesher at the demo's resolution: 0.1-wide tick
    and hand slivers and thin glyph strokes fragment at `res: 20`
    (`min_feature = 0.05`). Ticks, hands and glyph cut depth are thickened and
    `res` re-tuned so the mesh resolves them.
- Add a declared probe contract to the demo metadata (`DemoDefinition`) and
  enforce it in the showcase validation suite: a demo may declare sample points
  that must evaluate inside/outside the solid, so an engraved numeral or tick
  that fails to appear in the geometry fails CI instead of shipping.
  (Closes the validation gap that let this ship: "meshes non-empty" ≠ "looks
  right".)
- Recapture the stale `clock-face` gallery thumbnail and its manifest entry
  (the `showcase-thumbnails` source-hash check fails otherwise).

Assumption (recorded, minor): the repaired dial keeps one numeral at each of the
12/3/6/9 positions, rendered upright (classic wall-clock style) rather than
rotated along the dial.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `showcase-gallery`: the "Coverage is validated" requirement is strengthened —
  the validation suite must fail not only for empty/non-finite meshes but also
  when a demo's declared inside/outside probe points disagree with the built
  shape, so demos with missing or misplaced signature features cannot pass CI.

## Impact

- `site/src/demos/clock-face.ts` — rewritten geometry (numerals, ticks, hands,
  pin, `res`/`region` meta).
- `site/src/demos/types.ts` — optional probe metadata on `DemoDefinition`.
- `tests/showcase-demos.test.ts` — probe validation added to the showcase suite.
- `site/src/assets/previews/clock-face.webp` + `manifest.json` — recaptured via
  the documented `npm run thumbnails:capture` flow (chrome-headless-shell).
- No kernel, package, or vendored-source changes; no public npm API changes.
- Decision impact: implements AD-028 (public showcase site); alters no Accepted
  ADR — this is demo content plus a validation refinement inside AD-028's scope.

Observed but out of scope: `text-badge`'s engraving is also very shallow/faint in
its preview; a follow-up can apply the same probe + depth guidance.
