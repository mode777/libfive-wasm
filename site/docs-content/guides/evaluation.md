# Evaluation

Shapes are functions — beyond meshing, you can ask them for values directly.

## Point values: `evalF`

`evalF` returns the field value at a point: negative inside the solid, zero on
the surface, positive outside:

```ts
import { init } from 'libfive-wasm';

const libfive = await init();
const ball = libfive.sphere(1);

ball.evalF([0, 0, 0]); // negative: deep inside
ball.evalF([1, 0, 0]); // ~0: on the surface
ball.evalF([2, 0, 0]); // positive: outside
```

Components may be plain numbers or constant `Shape`s; non-constant shapes
cannot act as coordinates and throw a `LibfiveError`.

## Interval bounds: `evalR`

`evalR` returns bounds guaranteed to contain all field values across a whole
region — an interval-arithmetic promise, not a sample:

```ts
import { init } from 'libfive-wasm';

const libfive = await init();
const ball = libfive.sphere(1);

const bounds = ball.evalR({
    min: [-2, -2, -2],
    max: [2, 2, 2],
});
// bounds.lower <= every value in the region; bounds.upper >= every value
```

If `bounds.lower > 0`, the solid provably misses the region; if
`bounds.upper < 0`, the region is provably solid throughout. That makes
`evalR` a cheap, exact culling test before meshing or rendering.

## Gradients: `evalD`

`evalD` returns the gradient `[dx, dy, dz]` — the surface normal direction for
points on the boundary:

```ts
import { init } from 'libfive-wasm';

const libfive = await init();
const ball = libfive.sphere(1);

const gradient = ball.evalD([1, 0, 0]); // ~[1, 0, 0]
```

## Free variables evaluate as zero

Trees built with `libfive.var()` are parameterized: v1 evaluates free
variables as **zero** in `evalF`/`evalR`/`evalD`. Parameter sweeps need the
evaluator workflow through the [raw namespace](../api/interfaces/RawLibfive.md)
(`_shim_tree_evaluator` with a vars table), and re-meshing on parameter change
is a planned capability — today, rebuild the tree per parameter value and mesh
again.

## Scheme form

`shape.toString()` returns the kernel's Scheme-style rendering of the tree —
handy for debugging what a chain of calls actually built:

```ts
import { init } from 'libfive-wasm';

const libfive = await init();

libfive.sphere(1).union(libfive.box([-1, -1, -1], [1, 1, 1])).toString();
// e.g. "(union (sphere 1) (box ...))"
```

## Costs

Evaluation walks the tree per query. `evalF` on a large tree is far cheaper
than meshing, but not free — batch point probes in a worker for interactive
use, and prefer `evalR` for region questions since one call answers for the
whole box. See [API reference: Shape](../api/classes/Shape.md) for signatures.
