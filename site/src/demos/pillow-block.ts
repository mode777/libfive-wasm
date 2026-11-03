import type { Libfive, Shape } from 'libfive-wasm';
import type { DemoDefinition } from './types.js';

/**
 * The CadQuery gallery's pillow block, translated to f-rep: a bolted base
 * carrying a vertical hub with a horizontal bore. Side ribs are duplicated
 * with `reflectX`, the bolt pattern is built with symmetric mirrors, and the
 * bearing seat is kept clear of the bore.
 */
const demo: DemoDefinition = {
    meta: {
        id: 'pillow-block',
        title: 'Pillow block',
        description:
            'A bearing pillow block: bolted base, vertical hub and a horizontal bore, with reflected side ribs and a symmetric bolt pattern.',
        features: [
            'boxExact',
            'symmetricX',
            'symmetricY',
            'reflectX',
            'clearance',
        ],
        sections: ['shapes', 'transforms', 'arrays'],
        region: {
            min: [-1.75, -1.15, -0.8],
            max: [1.75, 1.15, 1.15],
        },
        res: 20,
    },

    build(libfive: Libfive): Shape {
        const base = libfive.boxExact([-1.4, -0.9, -0.6], [1.4, 0.9, -0.2]);

        // The hub axis is Y. cylinderZ's base is the bottom face centre, so
        // the base y coordinate selects the world z of the axis and base z
        // centres the length about y = 0 after the rotate.
        const bore = libfive
            .cylinderZ(0.34, 2.0, [0, 0.35, -1.0])
            .rotateX(Math.PI / 2);
        const hub = libfive
            .cylinderZ(0.6, 1.1, [0, 0.35, -0.55])
            .rotateX(Math.PI / 2)
            .clearance(bore, 0.02);
        const pedestal = libfive
            .boxExact([-0.75, -0.55, -0.6], [0.75, 0.55, 0.3])
            .clearance(bore, 0.02);

        // Mounting ribs: one modeled, its partner reflected to the far side.
        const rib = libfive.boxMitered([0.75, -0.5, -0.6], [1.4, 0.5, -0.15]);
        const ribs = rib.union(rib.reflectX());

        // Bolt holes: one corner hole mirrored into a symmetric 4-hole pattern.
        const hole = libfive.cylinderZ(0.14, 0.9, [1.15, 0.62, -0.65]);
        const holes = libfive.symmetricY(libfive.symmetricX(hole));

        // Short counterbores at each end of the bearing bore.
        const seat = libfive
            .cylinderZ(0.44, 0.25, [0, 0.35, 0.3])
            .union(libfive.cylinderZ(0.44, 0.25, [0, 0.35, -0.55]))
            .rotateX(Math.PI / 2);

        return base
            .union(pedestal)
            .union(hub)
            .union(ribs)
            .difference(holes)
            .difference(seat);
    },
};

export default demo;
