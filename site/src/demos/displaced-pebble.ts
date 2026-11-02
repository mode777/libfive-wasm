import type { Libfive, Shape } from 'libfive-wasm';
import type { DemoDefinition } from './types.js';

/**
 * Displacement fields, the feature B-rep kernels cannot do: `repel` pushes
 * the surface away from a locus and `attract` pulls toward it. The base
 * plate carries one patch per axis variant of both families; the pebble on
 * top gets its dimple and bulge from the 3-D forms.
 */
const demo: DemoDefinition = {
    meta: {
        id: 'displaced-pebble',
        title: 'Displaced pebble',
        description:
            'A pebble shaped by attract/repel fields resting on a plate that samples every axis variant of both families — displacement without meshes or controls.',
        features: ['repel', 'attract', 'blend', 'scaleXYZ'],
        sections: ['transforms', 'csg', 'shapes'],
        region: {
            min: [-2.6, -2.1, -0.75],
            max: [2.6, 2.1, 1.6],
        },
        res: 14,
    },

    build(libfive: Libfive): Shape {
        const z = -0.35;
        const r = 0.38;

        // One locus per variant: every call below is a live displacement.
        const plate = libfive
            .roundedBox([-2.2, -1.7, -0.55], [2.2, 1.7, -0.2], 0.12)
            .repel([0.9, 0.6, z], 0.5)
            .repelX([0.0, 1.2, z], r)
            .repelY([-0.9, 0.9, z], r)
            .repelZ([1.6, -0.8, z], r)
            .repelXY([-1.6, -0.5, z], r)
            .repelYZ([0.5, -1.3, z], r)
            .repelXZ([-0.5, -1.5, z], r)
            .attract([-1.1, 1.3, z], 0.45)
            .attractX([1.9, 1.1, z], r)
            .attractY([-1.9, 0.3, z], r)
            .attractZ([1.2, 0.2, z], r)
            .attractXY([0.2, 1.6, z], r)
            .attractYZ([-1.4, -1.6, z], r)
            .attractXZ([1.9, -1.5, z], r);

        // The pebble proper: blended lobes, dimpled and bulged by fields.
        const lobes = libfive
            .sphere(0.75, [0, 0, 0.35])
            .scaleXYZ([1.3, 1.0, 0.8])
            .blend(libfive.sphere(0.45, [0.7, -0.2, 0.6]), 0.3);
        const pebble = lobes.repel([0.35, 0.3, 0.85], 0.4).attract([-0.45, -0.25, 0.3], 0.45);

        return plate.union(pebble);
    },
};

export default demo;
