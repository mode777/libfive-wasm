import type { Libfive, Shape } from 'libfive-wasm';
import type { DemoDefinition } from './types.js';

/**
 * A 4x4x4 array of spheres clipped to a larger sphere. The array builds the
 * pattern; the intersection gives it a clean spherical silhouette.
 */
const demo: DemoDefinition = {
    meta: {
        id: 'lattice-cube',
        title: 'Dot lattice',
        description:
            'A 4x4x4 array of spheres clipped to a larger sphere. One array call builds the whole repeating pattern.',
        features: ['arrayXYZ', 'sphere', 'intersect', 'move'],
        sections: ['shapes', 'arrays'],
        region: {
            min: [-1.6, -1.6, -1.6],
            max: [1.6, 1.6, 1.6],
        },
        res: 18,
    },

    build(libfive: Libfive): Shape {
        const dots = libfive
            .arrayXYZ(libfive.sphere(0.2), 4, 4, 4, [0.55, 0.55, 0.55])
            .move([-0.825, -0.825, -0.825]);

        return dots.intersect(libfive.sphere(1.35));
    },
};

export default demo;
