import type { Libfive, Shape } from 'libfive-wasm';
import type { DemoDefinition } from './types.js';

/**
 * One square column blank, twelve ways in two rows: taper, shear, per-axis
 * and uniform scales, twists about every axis with and without the radius
 * falloff, and the axis-twirl variants — all coordinate remaps of the same
 * blank.
 */
const demo: DemoDefinition = {
    meta: {
        id: 'deformations',
        title: 'Deformations',
        description:
            'A square column through twelve deformations: taper, shear, per-axis scales, twirls about every axis and the radius-free axis twirls.',
        features: ['taperXY', 'shearXY', 'scaleXYZ', 'twirlX', 'twirlAxisZ'],
        sections: ['transforms', 'math'],
        region: {
            min: [-4.0, -1.7, -1.0],
            max: [4.0, 1.7, 1.0],
        },
        res: 14,
    },

    build(libfive: Libfive): Shape {
        const blank = () =>
            libfive.boxMitered([-0.15, -0.15, -0.6], [0.15, 0.15, 0.6]);

        const backRow = [
            blank().taperXY([0, 0], 0.75, 0.55, 1),
            blank().taperXYZ([0, 0, 0], 0.75, 0.65, 1),
            blank().shearXY([0, 0], 0.75, 0.24, 0),
            blank().scaleX(0.45),
            blank().scaleY(1.6),
            blank().scaleZ(0.55),
        ];
        const frontRow = [
            blank().scaleXYZ([1.1, 0.7, 0.9]),
            blank().twirlX(0.6, 1.4),
            blank().twirlY(0.6, 1.4),
            blank().twirlAxisX(0.7, 3),
            blank().twirlAxisY(0.7, 3),
            blank().twirlAxisZ(0.7, 3),
        ];

        const columns = [-3.125, -1.875, -0.625, 0.625, 1.875, 3.125];
        let scene: Shape | null = null;
        const place = (shape: Shape, x: number, y: number): void => {
            const station = shape.move([x, y, 0]);
            scene = scene === null ? station : scene.union(station);
        };
        backRow.forEach((shape, i) => place(shape, columns[i]!, 1.0));
        frontRow.forEach((shape, i) => place(shape, columns[i]!, -1.0));
        return scene!;
    },
};

export default demo;
