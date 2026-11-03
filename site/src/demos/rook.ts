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
        probes: {
            // The upright stack: wide base, shaft, crown merlon and centre.
            inside: [
                [0.5, 0, -0.95],
                [0.3, 0, 0],
                [0.4, 0, -0.75],
                [0.35, 0.35, 1],
            ],
            // Above the crown, below the base, beyond the base rim, and in
            // one of the four crown notches.
            outside: [
                [0, 0, 1.2],
                [0, 0, -1.1],
                [0.9, 0, -0.9],
                [0, 0.5, 1],
            ],
        },
    },

    build(libfive: Libfive): Shape {
        // libfive is Z-up: revolve the XY profiles about Y, then stand them
        // up so their axis points along +Z like every other part of the rook.
        const stand = (shape: Shape): Shape =>
            shape.revolveY(0).rotateX(Math.PI / 2);

        const baseProfile = libfive
            .rectangle([0, -1.02], [0.8, -0.84])
            .union(libfive.rectangle([0, -0.88], [0.6, -0.7]));
        const base = stand(baseProfile);
        const shaft = stand(libfive.rectangle([0, -0.8], [0.34, 0.34]));

        // A cone intersected with a cylinder: a precise tapered neck.
        const cone = libfive.coneZ(0.55, 0.9, [0, 0, 0.3]);
        const neck = cone.intersect(libfive.cylinderZ(0.46, 0.3, [0, 0, 0.3]));

        const crown = libfive.cylinderZ(0.56, 0.52, [0, 0, 0.58]);

        // Accumulate the notch cuts into one shape, seeded with emptiness().
        let notches = libfive.emptiness();
        for (const angle of [0, Math.PI / 2, Math.PI, 1.5 * Math.PI]) {
            const notch = libfive
                .boxMitered([-0.14, 0.34, 0.92], [0.14, 0.66, 1.12])
                .rotateZ(angle);
            notches = notches.union(notch);
        }

        const bore = libfive.cylinderZ(0.22, 1.96, [0, 0, -1.02]);

        return base
            .union(shaft)
            .union(neck)
            .union(crown)
            .difference(notches)
            .difference(bore);
    },
};

export default demo;
