import type { Libfive, Shape } from 'libfive-wasm';
import type { DemoDefinition } from './types.js';

/**
 * A solid blended bottle profile with a cavity removed, then revolved around
 * the Y axis. The cavity leaves a thick, clean rim at the open top.
 */
const demo: DemoDefinition = {
    meta: {
        id: 'revolved-vase',
        title: 'Revolved vase',
        description:
            'A hollow bottle with a blended belly and neck, revolved around the Y axis. Shows 2D shapes, blend, difference and revolveY.',
        features: ['circle', 'rectangle', 'blend', 'difference', 'revolveY'],
        sections: ['csg', 'shapes', 'transforms'],
        region: {
            min: [-1.7, -1.7, -1.7],
            max: [1.7, 1.7, 1.7],
        },
        res: 18,
    },

    build(libfive: Libfive): Shape {
        const outer = libfive
            .circle(0.55, [1.0, 0.9])
            .blend(
                libfive.roundedRectangle([0, 0], [1.25, 1.9], 0.2),
                0.28,
            );
        const inner = libfive
            .circle(0.32, [1.0, 0.9])
            .blend(
                libfive.roundedRectangle([0, 0.15], [0.9, 2.1], 0.16),
                0.16,
            );

        return outer
            .difference(inner)
            .revolveY(0)
            .rotateX(Math.PI / 2)
            .move([0, 0, -1.0]);
    },
};

export default demo;
