import type { Libfive, Shape } from 'libfive-wasm';
import type { DemoDefinition } from './types.js';

/**
 * A gyroid surface clipped to a rounded block. The gyroid is one expression;
 * the block supplies the outer boundary and turns the infinite surface into a
 * clean, printable sculpture.
 */
const demo: DemoDefinition = {
    meta: {
        id: 'gyroid-surface',
        title: 'Gyroid surface',
        description:
            'A gyroid surface clipped to a rounded block. One compact expression produces the smooth, repeating saddle.',
        features: ['gyroid', 'intersect', 'roundedBox'],
        sections: ['shapes', 'csg'],
        region: {
            min: [-2.2, -2.2, -1.4],
            max: [2.2, 2.2, 1.4],
        },
        res: 16,
    },

    build(libfive: Libfive): Shape {
        const lattice = libfive.gyroid(
            [2 * Math.PI, 2 * Math.PI, 2 * Math.PI],
            0.3,
        );
        const block = libfive.roundedBox(
            [-1.8, -1.8, -1.05],
            [1.8, 1.8, 1.05],
            0.18,
        );

        return lattice.intersect(block);
    },
};

export default demo;
