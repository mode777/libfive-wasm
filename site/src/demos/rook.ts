import type { Libfive, Shape } from 'libfive-wasm';
import type { DemoDefinition } from './types.js';

/**
 * A chess rook: a 2D profile revolved about the Y axis for base and shaft,
 * a cone/cylinder intersection for the tapered neck, and a crenellated
 * crown whose notch cuts accumulate starting from `emptiness()`, the union
 * identity — a fold pattern for building cut lists.
 */
const demo: DemoDefinition = {
    meta: {
        id: 'rook',
        title: 'Rook',
        description:
            'A chess rook: revolved profiles for base and shaft, a cone∩cylinder tapered neck, and a crown whose four notches accumulate into an emptiness()-seeded cut list.',
        features: ['revolveY', 'coneZ', 'emptiness', 'intersect'],
        sections: ['shapes', 'transforms', 'csg'],
        region: {
            min: [-1.3, -1.3, -1.3],
            max: [1.3, 1.3, 1.3],
        },
        res: 16,
    },

    build(libfive: Libfive): Shape {
        const base = libfive.rectangle([0, -0.95], [0.78, -0.62]).revolveY();
        const column = libfive.rectangle([0.36, -0.64], [0.6, 0.5]).revolveY();

        // A cone intersected with a cylinder: a precise tapered neck.
        const cone = libfive.coneZ(0.95, 1.5, [0, 0, -0.2]);
        const neck = cone.intersect(libfive.cylinderZ(0.68, 0.85, [0, 0, -0.25]));

        const crownSeat = libfive.cylinderZ(0.55, 0.14, [0, 0, 0.5]);
        const merlons = libfive.cylinderZ(0.58, 0.4, [0, 0, 0.62]);
        const cap = libfive.cylinderZ(0.58, 0.12, [0, 0, 1.02]);

        // Accumulate the notch cuts into one shape, seeded with emptiness().
        let notches = libfive.emptiness();
        for (const angle of [0, Math.PI / 2, Math.PI, 1.5 * Math.PI]) {
            const notch = libfive
                .boxMitered([-0.16, 0.42, 1.0], [0.16, 0.75, 1.16])
                .rotateZ(angle);
            notches = notches.union(notch);
        }

        const bore = libfive.cylinderZ(0.3, 2.0, [0, 0, -0.95]);

        return base
            .union(column)
            .union(neck)
            .union(crownSeat)
            .union(merlons)
            .union(cap)
            .difference(notches)
            .difference(bore);
    },
};

export default demo;
