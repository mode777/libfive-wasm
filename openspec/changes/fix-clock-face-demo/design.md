# Design

## Context

`site/src/demos/clock-face.ts` builds the dial from a face cylinder, a `ring`
rim, a 12-copy `arrayPolarZ` tick cut, glyph cuts for 12/3/6/9, and two raised
hand boxes. Three defects ship today: `six` and `nine` are built from
`glyph('3')`; all three side numerals share a −90° rotation while `12` is
upright; and the engraved/raised features are too thin for the mesher at the
demo's settings, so the live mesh (and the committed thumbnail) fragments into
slivers.

Relevant mechanics:

- `res` maps to `min_feature = 1/res` (site guide *Mesh resolution*): at
  `res: 20` the floor is 0.05 units, and the demo's ticks, hands and glyph
  strokes sit at 0.10–0.15 — marginal, and thinner where cuts meet the curved
  face.
- CI meshes every demo at `res` capped to ≤ 8 (`tests/showcase-demos.test.ts`)
  and asserts only non-empty, finite geometry — blind to this breakage.
- `tests/showcase-thumbnails.test.ts` pins each preview to the demo source
  hash: editing the demo without recapturing `clock-face.webp` fails the suite.
- AD-030's method-coverage matcher requires a call site for the stdlib surface
  (aliases included); `clock-face` is currently the **only** demo calling the
  `rotate` alias.
- The demo contract (including what metadata means) is documented in
  `site/README.md`.

See proposal.md for motivation and the delta spec for the new validation
behavior.

## Goals / Non-Goals

**Goals:**

- The dial reads correctly in the browser: four distinct upright numerals
  (12/3/6/9), twelve clean ticks, two distinct hands on a pin.
- The mesh resolves every feature at the demo's declared `res` within the
  interactive budget (sub-second meshing on a mid-range device; the broken
  version took ~103 ms).
- CI fails when a demo's signature features stop appearing in its geometry
  (declared probes), not just when a mesh comes back empty.
- The checked-in thumbnail matches the shipped geometry.

**Non-Goals:**

- No kernel/mesher changes (AD-014/AD-015 untouched) — this is demo content
  plus a validation refinement.
- No rework of other demos; `text-badge`'s faint engraving is a noted
  follow-up, not scope.
- No npm-package API changes; probes live in the site's `DemoDefinition`, not
  the published package.

## Decisions

### 1. Rebuild the dial with upright numerals and correct glyphs

One glyph helper centers each character about its own origin (bottom-left
anchor + half-width/height offset), then places it: `12` top, `3` right,
`6` bottom, `9` left, all upright. Hands keep their `rotateZ`-style placement;
the minute hand uses the `rotate` alias so the catalog retains an alias call
site (AD-030) and the `rotate` feature label stays truthful.

*Alternatives considered:* numerals rotated along the dial (build123d gallery
style) — rejected: rotating thin glyphs widens the axis-aligned interval
bounds the mesher evaluates through, plausibly contributing to the
fragmentation, and upright numerals are the recorded assumption in the
proposal. Keeping `3/6/9` rotated but distinct — rejected: leaves the
readability bug in place and keeps the rotated-text hazard.

### 2. Size features above the mesher floor and raise `res` to its measured convergence point

Ticks widen from 0.10 to ~0.16, hands widen to ≥0.16 and sink ≥0.05 into the
face. Feature sizing alone did not resolve the numerals: implemented, the dial
still fragmented at `res: 20` even though glyph strokes measure 0.11–0.18 —
2.2–3.6× the `min_feature` floor. Per the mesh-resolution guide's own rule
(raise `res` until surfaces stop changing), ingredient meshing shows the dial
converges exactly at `res: 30`: res 30 and res 40 produce byte-identical
meshes, while res 20 and 24 under-resolve glyph pockets. The demo ships
`res: 30`.

Cut depth revisited during implementation: the planned 0.1-deep pockets mesh
cleanly but are illegible from the gallery's oblique camera (the recapture
read as random marks despite correct geometry — confirmed by a depth-shaded
top-down render of the mesh). Depth was never the fragmenting factor, so
numeral and tick cuts ship at 0.2 deep (the original depth) with res 30
carrying the correctness load; convergence re-verified at res 30 for the
deeper cuts (~29.5k triangles, ~0.5 s).

*Alternatives considered:* `res: 20/24` with unchanged geometry — measured
insufficient (fragmented numerals). Larger glyphs to justify `res: 20` —
rejected: a ~1.6× glyph scale-up would collide with the tick band and changes
the dial's look more than the resolution bump does.

### 3. Signature probes declared in demo metadata, enforced in the showcase suite

`DemoDefinition` gains optional `probes: { inside?: Vec3[]; outside?: Vec3[] }`
(region-coordinate points). `tests/showcase-demos.test.ts` builds each probe
declaring demo and asserts `evalF` sign agreement (negative inside the solid —
confirm the convention against `tests/shape-core.test.ts` at implementation
time rather than hardcoding). An empty or non-finite meshing demo fails all of
its inside probes. Only `clock-face` ships probes initially: numeral and tick
pocket centers (outside), dial body, rim and hand mid-points (inside).

*Alternatives considered:* an AD-025 golden for the clock face — rejected:
exact-byte goldens are for the release artifact, too brittle for a demo meant
to be tweaked aesthetically; a triangle-count floor — rejected: cannot tell
"broken slivers" from "resolved dial" (the broken mesh already yields ~7,700
triangles); pure visual capture review — rejected: not CI-enforceable.

### 4. Recapture the thumbnail through the documented flow

After the geometry settles: build the site, run `npm run thumbnails:capture`
in `site/` on the verification server with `CHROME_SHELL_PATH` pointing at
chrome-headless-shell (site/README.md). No `PREVIEW_VERSION` bump — the
capture pipeline is unchanged, only demo source (the manifest `sourceHash`
check drives the recapture).

## Risks / Trade-offs

- [Exact fragmentation mechanism not proven (thin features vs. loose rotated
  bounds vs. deep slots)] → Decision 1+2 address all three candidates at once;
  the probe test plus the recaptured render verify the outcome. If fragments
  persist, escalate `res` per Decision 2 and recapture again.
- [`evalF` sign convention assumed] → verify negative-inside against existing
  shape tests before writing assertions; the helper reads the convention from
  package docs/tests, not folklore.
- [Slightly longer CI] → probes are a handful of `evalF` calls (negligible);
  the clock-face test meshes one demo at declared res (~0.1 s) instead of the
  capped res.
- [Mid-change red tests] → the thumbnail hash test fails until the recapture
  lands; expected, and the task sequence keeps it last before commit.
- [Probes can go stale under future restyles] → the modified spec makes stale
  probes a CI failure naming the demo, so restyles must update probes in the
  same edit — that is the intended pressure.

## Migration Plan

One commit on `main` (repo convention): rewrite demo → add probe contract +
suite enforcement → update `site/README.md` demo contract → run the showcase
suites → recapture thumbnail on the verification server → `openspec validate
--all --strict` → commit and push (CI `build-wasm.yml` is the gate). Rollback
is `git revert` of the commit; no data, packaging or artifact impact.

## Open Questions

None blocking: Decision 2's res escalation was resolved during implementation
by measurement — the dial converges exactly at `res: 30`, which the demo now
ships.
