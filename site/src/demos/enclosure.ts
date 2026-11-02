import type { Libfive, Shape } from 'libfive-wasm';
import type { DemoDefinition } from './types.js';

/**
 * A project enclosure in the OpenSCAD/CadQuery tradition: a shelled box with
 * an open top, an inner lip that accepts a lid, a front connector cutout
 * grown with `offset`, and screw bosses whose holes are clearance-fitted
 * around a screw size.
 */
const demo: DemoDefinition = {
    meta: {
        id: 'enclosure',
        title: 'Enclosure',
        description:
            'A shelled enclosure with an open top, an inner lid lip, a connector cutout and clearance-fitted screw bosses. Practical thin-walled modeling.',
        features: ['boxMitered', 'shell', 'offset', 'clearance'],
        sections: ['shapes', 'csg', 'arrays'],
        region: {
            min: [-1.8, -1.2, -1.0],
            max: [1.8, 1.2, 1.0],
        },
        res: 16,
    },

    build(libfive: Libfive): Shape {
        const outer = libfive.boxMitered([-1.6, -1.05, -0.85], [1.6, 1.05, 0.85]);
        const walls = outer.shell(0.16);

        // Open top for the lid, then an inner lip ring for it to seat against.
        const opening = libfive.boxMitered([-1.38, -0.83, 0.32], [1.38, 0.83, 0.95]);
        const lip = opening
            .offset(-0.1)
            .difference(opening.offset(-0.22))
            .move([0, 0, -1.02]);
        const tray = walls.union(lip).difference(opening);

        // Front connector ports: one modeled, its left/right twin mirrored
        // into the same wall with reflectYZ.
        const connector = libfive.boxMitered([-0.55, -1.2, -0.45], [0.55, -0.7, 0.05]);
        const port = connector.offset(0.14);
        const body = tray.difference(port).difference(port.reflectYZ());

        // Corner screw bosses: sleeves with holes kept clear of the screw.
        const sleeve = libfive.cylinderZ(0.17, 1.5, [0, 0, -0.83]);
        const screw = libfive.cylinderZ(0.09, 1.5, [0, 0, -0.83]);
        const bosses = libfive.arrayXY(sleeve.clearance(screw, 0.03), 2, 2, [2.7, 1.7]);

        return body.union(bosses);
    },
};

export default demo;
