import type { Libfive, Shape } from 'libfive-wasm';
import type { DemoDefinition } from './types.js';

/**
 * The same two operands — a sphere and an overlapping cube — treated six
 * ways, in two rows of three: intersection, offset, shell, the exponent and
 * rough blends, and a loft between profiles bounded to its z band (an
 * unbounded loft would extend the 2D operands through the whole region).
 */
const demo: DemoDefinition = {
    meta: {
        id: 'blend-catalog',
        title: 'Blend catalog',
        description:
            'A sphere and a cube through six operations: intersection, offset, shell, exponent and rough blends, and a bounded loft. Compare what each CSG mode does to identical operands.',
        features: ['intersection', 'offset', 'shell', 'blendExpt', 'blendRough', 'loft'],
        sections: ['csg', 'shapes'],
        region: {
            min: [-2.1, -1.35, -0.7],
            max: [2.1, 1.35, 0.9],
        },
        res: 18,
    },

    build(libfive: Libfive): Shape {
        const operand = (x: number, y: number): [Shape, Shape] => [
            libfive.sphere(0.34, [x, y + 0.08, 0.16]),
            libfive.boxMitered([x - 0.28, y - 0.3, -0.14], [x + 0.28, y + 0.24, 0.36]),
        ];

        const [ia, ib] = operand(-1.4, 0.75);
        const [oa] = operand(0, 0.75);
        const [sa] = operand(1.4, 0.75);
        const [ea, eb] = operand(-1.4, -0.75);
        const [ra, rb] = operand(0, -0.75);
        const loftX = 1.4;
        const loftY = -0.75;

        // A loft blends the two 2D fields over zmin..zmax only; intersect the
        // band with a box so the 2D operands do not leak through the region.
        const loftBand = libfive.boxMitered(
            [loftX - 0.36, loftY - 0.36, -0.3],
            [loftX + 0.36, loftY + 0.36, 0.5],
        );
        const loft = libfive
            .circle(0.3, [loftX, loftY])
            .loft(
                libfive.roundedRectangle(
                    [loftX - 0.3, loftY - 0.3],
                    [loftX + 0.3, loftY + 0.3],
                    0.1,
                ),
                -0.3,
                0.5,
            )
            .intersect(loftBand);

        const stations = [
            ia.intersect(ib),
            oa.offset(0.14),
            // Cut the shell open so the wall thickness is actually visible.
            sa.shell(0.14).intersect(libfive.halfSpace([0, 0, 1], [0, 0, 0.16])),
            ea.blendExpt(eb, 2),
            ra.blendRough(rb, 0.32),
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
