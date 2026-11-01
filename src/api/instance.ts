/*
 * libfive-wasm: the convenience-API instance surface.
 *
 * `init()` returns this object: the raw namespace, the debug flag, the
 * shape factory methods (`x`, `y`, `z`, `constant`, `var`), and the
 * instance-bound `Shape` class carrying the `Shape.fromTree` escape
 * hatch (the raw handle must be interpreted against this instance's
 * heap, so the static is bound per instance — design D1).
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import type { LibfiveModule, TreePtr } from '../ffi/types.js';
import { ApiContext } from './context.js';
import { createShapeClass, Shape } from './shape.js';
import type { Libfive } from '../loader/types.js';

/** Wraps a kernel-returned handle, rejecting NULL as a kernel failure. */
function wrapTree(ctx: ApiContext, operation: string, ptr: TreePtr): Shape {
    return new Shape(ctx, ctx.wrapTree(operation, ptr));
}

/**
 * Builds the `Libfive` instance over an instantiated module. The method
 * tables resolve eagerly here (design D3): an artifact missing a needed
 * opcode or stdlib symbol fails with a named `LibfiveError`.
 */
export function createInstance(module: LibfiveModule, debug: boolean): Libfive {
    const ctx = new ApiContext(module, debug);
    const ShapeBound = createShapeClass(ctx);

    return {
        ...ctx.stdlib.functions,
        raw: ctx.raw,
        debug,
        Shape: ShapeBound,
        x: () => wrapTree(ctx, 'x', ctx.raw._libfive_tree_x()),
        y: () => wrapTree(ctx, 'y', ctx.raw._libfive_tree_y()),
        z: () => wrapTree(ctx, 'z', ctx.raw._libfive_tree_z()),
        constant: (value: number) =>
            wrapTree(ctx, 'constant', ctx.raw._libfive_tree_const(value)),
        var: () => wrapTree(ctx, 'var', ctx.raw._libfive_tree_var()),
    };
}
