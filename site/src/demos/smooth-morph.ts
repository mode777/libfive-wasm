import type { Libfive, Shape } from 'libfive-wasm';
import type { DemoDefinition } from './types.js';

/**
 * Morphing blends two implicit shapes by interpolating their distance fields.
 * The result is a sphere/cube hybrid with a small blended lobe.
 */
const demo: DemoDefinition = {
    meta: {
        id: 'smooth-morph',
        title: 'Smooth morph',
        description:
            'A sphere morphed into a cube, then blended with a small lobe. Shows morph and blend interpolation between shapes.',
        features: ['morph', 'blend', 'sphere', 'box'],
        sections: ['csg', 'shapes'],
        region: {
            min: [-1.6, -1.6, -1.6],
            max: [1.6, 1.6, 1.6],
        },
        res: 14,
    },

    build(libfive: Libfive): Shape {
        const ball = libfive.sphere(1);
        const cube = libfive.box([-0.85, -0.85, -0.85], [0.85, 0.85, 0.85]);
        const lobe = libfive.sphere(0.42, [0.85, 0.35, 0]);

        return ball.morph(cube, 0.55).blend(lobe, 0.2);
    },
};

export default demo;
