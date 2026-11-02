import type { Libfive, Shape } from 'libfive-wasm';
import type { DemoDefinition } from './types.js';

/**
 * The brick that every code-CAD gallery models: a 4×2 stud brick built from
 * an exact box, shelled hollow, with studs placed by a 4×2 array and
 * underside clutch tubes placed by a 1-D array doubled across Y.
 */
const demo: DemoDefinition = {
    meta: {
        id: 'lego-brick',
        title: 'Stud brick',
        description:
            'A 4×2 stud brick: an exact box shelled hollow, studs placed with a 4×2 array and clutch tubes underneath. The code-CAD gallery classic, in f-rep.',
        features: ['boxExact', 'shell', 'arrayXY', 'arrayX'],
        sections: ['shapes', 'csg', 'arrays'],
        region: {
            min: [-1.9, -1.1, -0.7],
            max: [1.9, 1.1, 1.0],
        },
        res: 16,
    },

    build(libfive: Libfive): Shape {
        const body = libfive
            .boxExact([-1.6, -0.8, -0.55], [1.6, 0.8, 0.55])
            .shell(0.2);

        // Arrays extend from their seed, so seeds sit at the grid's low corner.
        const stud = libfive.cylinderZ(0.25, 0.3, [-1.2, -0.4, 0.55]);
        const studs = libfive.arrayXY(stud, 4, 2, [0.8, 0.8]);

        const tubeRow = libfive.arrayX(
            libfive.ring(0.19, 0.13, [-0.8, -0.4]).extrudeZ(-0.55, 0.12),
            3,
            0.8,
        );
        const tubes = libfive.arrayXY(tubeRow, 1, 2, [0, 0.8]);

        return body.union(studs).union(tubes);
    },
};

export default demo;
