import type { Libfive, Shape } from 'libfive-wasm';

import type { DemoDefinition } from './types.js';

/**
 * An engraved clock dial in the build123d gallery tradition: a thick face
 * with a raised rim, ticks engraved by a polar array, numerals engraved from
 * the kernel's f-rep font (three placed by rotating one numeral about the
 * origin), and two raised hands. Cutting the full-size glyphs into the face
 * keeps their strokes above the mesh feature size.
 */
const demo: DemoDefinition = {
    meta: {
        id: 'clock-face',
        title: 'Clock face',
        description:
            'A raised rim, twelve engraved ticks from a polar array, numerals engraved from the built-in f-rep font, and two raised hands. Text plus polar repetition.',
        features: ['ring', 'arrayPolarZ', 'text', 'rotate'],
        sections: ['shapes', 'text', 'arrays', 'transforms'],
        region: {
            min: [-2.4, -2.4, -0.45],
            max: [2.4, 2.4, 0.75],
        },
        res: 20,
    },

    build(libfive: Libfive): Shape {
        const face = libfive.cylinderZ(2.0, 0.5, [0, 0, -0.2]);
        const rim = libfive.ring(2.0, 1.8).extrudeZ(-0.2, 0.45);

        const tick = libfive.boxMitered([-0.05, 1.55, 0.1], [0.05, 1.75, 0.6]);
        const ticks = libfive.arrayPolarZ(tick, 12);

        // Glyphs are ~1 unit tall and anchor bottom-left: center one glyph at
        // the origin, rotate it, then move it to the clock position.
        const glyph = (char: string): Shape =>
            libfive.text(char, [0, 0]).extrudeZ(0.1, 0.7).move([-0.3, -0.5, 0]);
        const three = glyph('3').rotate(-Math.PI / 2).move([1.0, 0, 0]);
        const six = glyph('3').rotate(-Math.PI / 2).move([0, -1.0, 0]);
        const nine = glyph('3').rotate(-Math.PI / 2).move([-1.0, 0, 0]);
        const twelve = libfive
            .text('12', [0, 0])
            .extrudeZ(0.1, 0.7)
            .move([-0.5, 0.51, 0]);

        // Engrave the marks and numerals 0.2 deep into the 0.3-high face.
        const dial = face
            .union(rim)
            .difference(ticks)
            .difference(twelve)
            .difference(three)
            .difference(six)
            .difference(nine);

        const hourHand = libfive
            .boxMitered([-0.07, -0.15, 0.25], [0.07, 0.75, 0.5])
            .rotateZ(-2.1);
        const minuteHand = libfive
            .boxMitered([-0.05, -0.2, 0.25], [0.05, 1.1, 0.44])
            .rotateZ(0.7);
        const pin = libfive.cylinderZ(0.11, 0.55, [0, 0, 0.2]);

        return dial.union(hourHand).union(minuteHand).union(pin);
    },
};

export default demo;
