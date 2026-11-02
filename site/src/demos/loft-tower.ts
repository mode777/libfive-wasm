import type { Libfive, Shape } from 'libfive-wasm';
import type { DemoDefinition } from './types.js';

/**
 * A hexagonal base lofted to a rotated triangular top, then twisted. This
 * exercises 2D polygons, loftBetween and a z-axis twist.
 */
const demo: DemoDefinition = {
    meta: {
        id: 'loft-tower',
        title: 'Loft tower',
        description:
            'A hexagonal base lofted to a rotated triangular top, then twisted. Shows polygon, loftBetween and twirlZ.',
        features: ['polygon', 'loftBetween', 'twirlZ'],
        sections: ['shapes', 'transforms'],
        region: {
            min: [-1.5, -1.5, -1.5],
            max: [1.5, 1.5, 1.5],
        },
        res: 16,
    },

    build(libfive: Libfive): Shape {
        const base = libfive.polygon(1.0, 6);
        const top = libfive.polygon(0.62, 3).rotateZ(Math.PI / 2);
        const tower = libfive.loftBetween(
            base,
            top,
            [0, 0, -1.35],
            [0, 0, 1.35],
        );

        return tower.twirlZ(Math.PI * 0.55, 1.2);
    },
};

export default demo;
