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
        features: ['boxExact', 'symmetricX', 'reflectX', 'clearance'],
        sections: ['shapes', 'transforms', 'arrays'],
        region: {
            min: [-1.7, -1.1, -0.8],
            max: [1.7, 1.1, 1.0],
        },
        res: 16,
    },

    build(libfive: Libfive): Shape {
        const base = libfive.boxExact([-1.45, -0.95, -0.55], [1.45, 0.95, -0.15]);
        const pillar = libfive.boxExact([-0.8, -0.6, -0.55], [0.8, 0.6, 0.3]);
        const hub = libfive.cylinderZ(0.75, 1.3, [0, 0, 0.2]).rotateX(Math.PI / 2);
        const bore = libfive.cylinderZ(0.42, 2.6, [0, 0, 0.2]).rotateX(Math.PI / 2);

        // Mounting ribs: one modeled, its partner reflected to the far side.
        const rib = libfive.boxMitered([0.8, -0.5, -0.55], [1.45, 0.5, -0.15]);
        const ribs = rib.union(rib.reflectX());

        // Bolt holes: one corner hole mirrored into a symmetric 4-hole pattern.
        const hole = libfive.cylinderZ(0.16, 0.9, [1.15, 0.62, -0.62]);
        const holes = libfive.symmetricY(libfive.symmetricX(hole));

        // A shallow counterbore seat kept clear of the bore (0.25 wall left).
        const seat = libfive.cylinderZ(0.52, 1.6, [0, 0, 0.2]).rotateX(Math.PI / 2);

        return base
            .union(pillar)
            .union(hub)
            .union(ribs)
            .difference(holes)
            .difference(seat.clearance(bore, 0.02));
    },
};

export default demo;
