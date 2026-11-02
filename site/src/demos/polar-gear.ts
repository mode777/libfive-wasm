import type { Libfive, Shape } from 'libfive-wasm';
import type { DemoDefinition } from './types.js';

/**
 * A 2D ring with twelve polar-arrayed teeth, a center hole and an extrusion.
 * This is the compact "array + extrude" demo.
 */
const demo: DemoDefinition = {
    meta: {
        id: 'polar-gear',
        title: 'Polar gear',
        description:
            'A ring with twelve polar-arrayed teeth and a center hole, extruded into a gear. Shows arrayPolarZ, ring and extrudeZ.',
        features: ['ring', 'rectangle', 'arrayPolarZ', 'extrudeZ', 'difference'],
        sections: ['shapes', 'arrays', 'transforms'],
        region: {
            min: [-1.6, -1.6, -1.6],
            max: [1.6, 1.6, 1.6],
        },
        res: 18,
    },

    build(libfive: Libfive): Shape {
        const ring = libfive.ring(1.12, 0.55);
        const tooth = libfive.rectangle([0.78, -0.19], [1.32, 0.19]);
        const teeth = libfive.arrayPolarZ(tooth, 12);
        const bore = libfive.circle(0.3);

        return ring
            .union(teeth)
            .difference(bore)
            .extrudeZ(-0.35, 0.35);
    },
};

export default demo;
