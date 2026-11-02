import type { Libfive, Shape } from 'libfive-wasm';
import type { DemoDefinition } from './types.js';

/**
 * Extruded f-rep text engraved into a rounded plate on BOTH faces: the same
 * cut is applied twice, once as built and once mirrored through the plate by
 * `reflectZ`. The glyphs come from the kernel's built-in Latin-1 font.
 */
const demo: DemoDefinition = {
    meta: {
        id: 'text-badge',
        title: 'Text badge',
        description:
            'Extruded text engraved into a rounded plate on both faces — the cut is reused mirrored through the plate. The glyphs come from the kernel’s built-in f-rep font.',
        features: ['text', 'extrudeZ', 'roundedBox', 'reflectZ'],
        sections: ['shapes', 'text'],
        region: {
            min: [-2.2, -1.4, -1.0],
            max: [2.2, 1.4, 1.0],
        },
        res: 18,
    },

    build(libfive: Libfive): Shape {
        const plate = libfive.roundedBox(
            [-1.9, -0.95, -0.3],
            [1.9, 0.95, 0.3],
            0.2,
        );
        const letters = libfive.text('L5', [-0.85, -0.5]).extrudeZ(0.12, 0.55);

        return plate.difference(letters).difference(letters.reflectZ());
    },
};

export default demo;
