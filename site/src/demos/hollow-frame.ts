import type { Libfive, Shape } from 'libfive-wasm';
import type { DemoDefinition } from './types.js';

/**
 * A rounded block hollowed with `clearance`, then bored with a blended
 * cylindrical subtraction. Shows the clearance and blendDifference CSG forms.
 */
const demo: DemoDefinition = {
    meta: {
        id: 'hollow-frame',
        title: 'Hollow frame',
        description:
            'A rounded block with a clearance cavity and a blended cylindrical bore. Shows clearance and blendDifference.',
        features: ['roundedBox', 'clearance', 'blendDifference', 'cylinderZ'],
        sections: ['csg', 'shapes'],
        region: {
            min: [-1.6, -1.6, -1.6],
            max: [1.6, 1.6, 1.6],
        },
        res: 16,
    },

    build(libfive: Libfive): Shape {
        const block = libfive.roundedBox(
            [-1.25, -1.25, -1.25],
            [1.25, 1.25, 1.25],
            0.2,
        );
        const core = libfive.roundedBox(
            [-0.85, -0.85, -0.85],
            [0.85, 0.85, 0.85],
            0.12,
        );
        const bore = libfive.cylinderZ(0.48, 3, [0, 0, -1.5]);
        const window = libfive.roundedBox(
            [0.9, -0.55, -0.55],
            [1.6, 0.55, 0.55],
            0.08,
        );

        return block
            .clearance(core, 0.12)
            .blendDifference(window, 0.1, 0.02)
            .blendDifference(bore, 0.12, 0.03);
    },
};

export default demo;
