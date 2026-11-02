import type { Libfive, Shape } from 'libfive-wasm';
import type { DemoDefinition } from './types.js';

/**
 * Builds a unit sphere through the raw C namespace and wraps the final tree
 * with Shape.fromTree. This is the advanced escape hatch, not the normal API.
 */
const demo: DemoDefinition = {
    meta: {
        id: 'raw-escape',
        title: 'Raw escape hatch',
        description:
            'A unit sphere built from raw C tree calls and wrapped with Shape.fromTree. The advanced path beneath the Shape API.',
        features: ['raw', 'Shape.fromTree', 'opcodeByName'],
        sections: ['raw', 'shapes'],
        region: {
            min: [-1.5, -1.5, -1.5],
            max: [1.5, 1.5, 1.5],
        },
        res: 12,
    },

    build(libfive: Libfive): Shape {
        const raw = libfive.raw;
        const mul = raw.opcodeByName('mul');
        const add = raw.opcodeByName('add');
        const sub = raw.opcodeByName('sub');

        const x = raw._libfive_tree_x();
        const y = raw._libfive_tree_y();
        const z = raw._libfive_tree_z();
        const one = raw._libfive_tree_const(1);

        const xx = raw._libfive_tree_binary(mul, x, x);
        const yy = raw._libfive_tree_binary(mul, y, y);
        const zz = raw._libfive_tree_binary(mul, z, z);
        const xy = raw._libfive_tree_binary(add, xx, yy);
        const sum = raw._libfive_tree_binary(add, xy, zz);
        const tree = raw._libfive_tree_binary(sub, sum, one);

        for (const ptr of [x, y, z, one, xx, yy, zz, xy, sum]) {
            raw._libfive_tree_delete(ptr);
        }
        return libfive.Shape.fromTree(tree);
    },
};

export default demo;
