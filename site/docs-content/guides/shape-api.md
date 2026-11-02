# The Shape API

Every solid is a `Shape`: a handle to a tree in the kernel's heap. This page
tours the expression vocabulary — construction, chaining, CSG and blending,
transforms and repetition.

## Constructing shapes

Instances hand out shapes from a few primitives plus the **generated standard
library** — every C stdlib function as a camelCase method:

```ts
import { init } from 'libfive-wasm';

const libfive = await init();

libfive.x(); // the x coordinate, as a shape
libfive.y();
libfive.z();
libfive.constant(1.5); // constant field 1.5
libfive.var(); // a free variable (evaluation workflows)

libfive.sphere(1);
libfive.sphere(1, [0, 0, 0.5]); // optional center
libfive.box([-1, -1, -1], [1, 1, 1]);
libfive.cylinder(0.5, 2);
libfive.torus(1, 0.3);
libfive.text('hi'); // custom f-rep font, character height 1
```

Numbers coerce to constant trees wherever a `Shape` is expected, so the
boundary between "shape" and "scalar" disappears in practice:

```ts
import { init } from 'libfive-wasm';

const libfive = await init();

const s = libfive.z().add(0.5).mul(libfive.x()); // z + 0.5, times x
```

## Arithmetic and math

`Shape` methods chain like expressions. Each call builds a kernel node;
nothing evaluates until you mesh or evaluate:

```ts
import { init } from 'libfive-wasm';

const libfive = await init();

const field = libfive
    .x()
    .mul(libfive.y())
    .abs()
    .sqrt()
    .min(1)
    .max(0);
```

The full math set — `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`,
`exp`, `log`, `sqrt`, `square`, `abs`, `neg`, `min`, `max`, `pow`, `mod`,
`nthRoot`, `compare` — mirrors the kernel's opcode table.

## CSG, blending and offsets

The stdlib's CSG section arrives as methods: `union`, `difference`,
`intersection`, `offset`, `shell`, plus blends and morphs:

```ts
import { init } from 'libfive-wasm';

const libfive = await init();

const a = libfive.sphere(1);
const b = libfive.box([-1.5, -1.5, -1.5], [0.5, 0.5, 0.5]);

const hard = a.union(b); // sharp CSG seam
const soft = a.blend(b, 0.3); // smooth blend where the shapes meet
const hollow = a.shell(0.1); // hollow out, 0.1 wall
const grown = a.offset(0.2); // grow by 0.2 (negative shrinks)
```

Blending is where f-rep shines: `blend` smooths exactly the region where two
solids meet, with a single parameter, and stays watertight no matter how the
inputs overlap.

## Transforms and repetition

Transforms return new shapes; repetition builds arrays from one base shape:

```ts
import { init } from 'libfive-wasm';

const libfive = await init();

const post = libfive.cylinder(0.2, 3).move([0, 0, 1.5]);

const railing = post.arrayX(8, 1); // 8 posts, 1 unit apart
const grid = post.arrayXY(4, 4, [1, 1]); // 4 × 4 grid
const ring = libfive.cylinder(0.1, 0.5).arrayPolar(12); // 12 around Z
```

## Remap and optimize

`remap` warps a shape through coordinate functions — the classic f-rep
distortion move — and `optimized` asks the kernel to simplify the tree:

```ts
import { init, type Shape } from 'libfive-wasm';

const libfive = await init();

const twist = (shape: Shape, turns: number): Shape => {
    const z = libfive.z();
    const cos = z.mul(turns).cos(); // cos(turns·z)
    const sin = z.mul(turns).sin();
    return shape.remap(
        libfive.x().mul(cos).sub(libfive.y().mul(sin)),
        libfive.x().mul(sin).add(libfive.y().mul(cos)),
        z,
    );
};
```

`shape.optimized()` returns a kernel-simplified copy; the original stays
untouched. Both are useful before meshing large, heavily-edited trees.

## Inspecting shapes

```ts
import { init } from 'libfive-wasm';

const libfive = await init();

const s = libfive.sphere(1);
s.toString(); // Scheme-style form, e.g. "(union (sphere 1) ...)"
s.isVar(); // whether the tree is a free variable
s.getConst(); // the constant value, or undefined
```

## What's next

- [Memory and lifecycle](./memory-lifecycle.md) — freeing shapes, safe views.
- [Mesh resolution](./mesh-resolution.md) — turning shapes into triangles.
- [API reference: Shape](../api/classes/Shape.md) — every method, generated.
