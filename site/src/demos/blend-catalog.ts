import type { Libfive, Shape } from 'libfive-wasm';
import type { DemoDefinition } from './types.js';

/**
 * The same two operands — a sphere and an overlapping cube — treated six
 * ways, in two rows of three: intersection, offset, shell, the exponent and
 * rough blends, and a loft between profiles bounded to its z band.
 */
const demo: DemoDefinition = {
    meta: {
        id: 'blend-catalog',
        title: 'Blend catalog',
        description:
            'A sphere and a cube through six operations: intersection, offset, shell, exponent and rough blends, and a bounded loft. Compare what each CSG mode does to identical operands.',
        features: [
            'intersection',
            'offset',
            'shell',
            'blendExpt',
            'blendRough',
            'loft',
        ],
        sections: ['csg', 'shapes'],
        region: {
            min: [-3.6, -1.9, -0.9],
            max: [3.6, 1.9, 0.9],
        },
        res: 20,
    },

    build(libfive: Libfive): Shape {
        const operand = (x: number, y: number): [Shape, Shape] => [
            libfive.sphere(0.4, [x, y + 0.04, 0.1]),
            libfive.boxMitered(
                [x - 0.34, y - 0.34, -0.16],
                [x + 0.34, y + 0.34, 0.3],
            ),
        ];

        // Back row (y=+1) and front row (y=-1) are offset in x so each
        // station lines up in a screen column under the gallery camera.
        const [ia, ib] = operand(-2.7, 1);
        const [oa, ob] = operand(-1, 1);
        const [sa] = operand(0.7, 1);
        const [ea, eb] = operand(-0.7, -1);
        const [ra, rb] = operand(1, -1);
        const loftX = 2.7;
        const loftY = -1;

        const common = ia.intersect(ib);
        // A window cut into the sphere shell exposes the wall without leaving
        // the shell as an open half-object.
        const shell = sa
            .shell(0.12)
            .difference(
                libfive.boxMitered([0.78, 0.86, 0.25], [1.25, 1.16, 0.62]),
            );

        const loft = libfive
            .circle(0.34, [loftX, loftY])
            .loft(
                libfive.roundedRectangle(
                    [loftX - 0.34, loftY - 0.34],
                    [loftX + 0.34, loftY + 0.34],
                    0.1,
                ),
                -0.2,
                0.3,
            );

        const stations = [
            common,
            oa.intersect(ob).offset(0.12),
            shell,
            ea.blendExpt(eb, 2),
            ra.blendRough(rb, 0.3),
            loft,
        ];

        let scene = stations[0]!;
        for (const station of stations.slice(1)) {
            scene = scene.union(station);
        }
        return scene;
    },
};

export default demo;
