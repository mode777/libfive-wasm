import type { Libfive, Shape } from 'libfive-wasm';

import type { DemoDefinition } from './types.js';

/**
 * An engraved clock dial reading 10:10: a thick face with a raised rim,
 * ticks cut by a polar array, upright numerals cut from the kernel's f-rep
 * font, and two raised hands. Every engraved feature is at least twice the
 * mesher's minimum feature size (1/res), cuts are deep enough to read from
 * the gallery camera, and res is raised to the measured convergence point,
 * so the mesh resolves them instead of fragmenting.
 */
const demo: DemoDefinition = {
    meta: {
        id: 'clock-face',
        title: 'Clock face',
        description:
            'A raised rim, twelve engraved ticks from a polar array, upright numerals engraved from the built-in f-rep font, and two raised hands. Text plus polar repetition.',
        features: ['ring', 'arrayPolarZ', 'text', 'rotate'],
        sections: ['shapes', 'text', 'arrays', 'transforms'],
        region: {
            min: [-2.4, -2.4, -0.45],
            max: [2.4, 2.4, 0.8],
        },
        // res 30 is the measured convergence point: the glyph pocket floors
        // and tick walls stop changing between 30 and 40, while res 20
        // fragments the numerals (mesh-resolution guide: raise res until
        // surfaces stabilize).
        res: 30,
        // Signature probes the showcase suite checks against the built
        // shape: engraved pockets must sample empty, the body must sample
        // solid. Mid-pocket z=0.25 for cuts, hand centerlines mid-height.
        probes: {
            inside: [
                [1.2, -0.6, 0.05], // face body
                [1.9, 0, 0.38], // raised rim
                [-0.26, 0.18, 0.42], // hour hand (10:10)
                [0.39, 0.23, 0.35], // minute hand (10:10)
                [0, 0, 0.6], // pin
            ],
            outside: [
                [0, 1.62, 0.25], // 12 o'clock tick pocket
                [0.98, 0.01, 0.25], // '3' stroke pocket
                [0, -0.97, 0.25], // '6' stroke pocket
                [-0.975, 0.01, 0.25], // '9' stroke pocket
                [0.125, 0.89, 0.25], // '12' stroke pocket
                [1.5, 1.5, 0.5], // open air above the dial
            ],
        },
    },

    build(libfive: Libfive): Shape {
        const face = libfive.cylinderZ(2.0, 0.5, [0, 0, -0.2]);
        const rim = libfive.ring(2.0, 1.8).extrudeZ(-0.2, 0.45);

        // Ticks are 0.16 wide and cut 0.2 deep into the 0.3-high face; the
        // 0.08 lip to the rim keeps every wall above the feature floor.
        const tick = libfive.boxMitered([-0.08, 1.52, 0.1], [0.08, 1.72, 0.6]);
        const ticks = libfive.arrayPolarZ(tick, 12);

        // Glyph metrics measured from the f-rep font at height 1: full width
        // and the horizontal center relative to the bottom-left anchor.
        const glyphMetrics = {
            '3': { width: 0.54, center: 0.3 },
            '6': { width: 0.54, center: 0.27 },
            '9': { width: 0.53, center: 0.275 },
            '12': { width: 0.95, center: 0.475 },
        } as const;
        type Glyph = keyof typeof glyphMetrics;

        // Center each upright glyph on its measured midpoint, then place it
        // at radius ~1 on the dial. Cuts span z 0.1..0.7: 0.2 deep pockets,
        // so the strokes read from the gallery's oblique camera.
        const numeral = (char: Glyph, x: number, y: number): Shape => {
            const { center } = glyphMetrics[char];
            return libfive.text(char, [0, 0])
                .extrudeZ(0.1, 0.7)
                .move([x - center, y - 0.49, 0]);
        };
        const three = numeral('3', 0.98, 0);
        const six = numeral('6', 0, -0.98);
        const nine = numeral('9', -0.98, 0);
        const twelve = numeral('12', 0, 0.98);

        const dial = face
            .union(rim)
            .difference(ticks)
            .difference(twelve)
            .difference(three)
            .difference(six)
            .difference(nine);

        // Hands at 10:10, raised 0.16-0.2 above the face and sunk 0.05 into
        // it, wide enough to survive the feature floor. The minute hand
        // goes through the `rotate` alias (Z-axis rotation).
        const hourHand = libfive
            .boxMitered([-0.09, -0.2, 0.25], [0.09, 0.68, 0.5])
            .rotateZ(0.96);
        const minuteHand = libfive
            .boxMitered([-0.08, -0.22, 0.25], [0.08, 1.02, 0.46])
            .rotate(-Math.PI / 3);
        const pin = libfive.cylinderZ(0.13, 0.55, [0, 0, 0.2]);

        return dial.union(hourHand).union(minuteHand).union(pin);
    },
};

export default demo;
