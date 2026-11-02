import type { Libfive, Shape } from 'libfive-wasm';
import type { DemoDefinition } from './types.js';

/**
 * Extruded f-rep text cut into a rounded plate. The text uses libfive's
 * built-in Latin-1 font, so no font asset is needed.
 */
const demo: DemoDefinition = {
    meta: {
        id: 'text-badge',
        title: 'Text badge',
        description:
            'Extruded text engraved into a rounded plate. The glyphs come from the kernel’s built-in f-rep font, not an external font file.',
        features: ['text', 'extrudeZ', 'roundedBox', 'difference'],
        sections: ['shapes', 'text'],
        region: {
            min: [-2.2, -1.4, -1.0],
            max: [2.2, 1.4, 1.0],
        },
        res: 14,
    },

    build(libfive: Libfive): Shape {
        const plate = libfive.roundedBox(
            [-1.9, -0.95, -0.3],
            [1.9, 0.95, 0.3],
            0.2,
        );
        const letters = libfive.text('L5', [-0.85, -0.5]).extrudeZ(0.12, 0.55);

        return plate.difference(letters);
    },
};

export default demo;
