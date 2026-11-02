import type { Libfive, Shape } from 'libfive-wasm';
import type { DemoDefinition } from './types.js';

/**
 * Two rows of every primitive the other demos don't use: triangle prism,
 * pyramid, sharp and angled cones (the angled pair mirrored into an
 * hourglass), a half-space-cut sphere, and the exact rectangle/box families.
 * The scene accumulates from `emptiness()`.
 */
const demo: DemoDefinition = {
    meta: {
        id: 'primitives-zoo',
        title: 'Primitive zoo',
        description:
            'Two rows of primitives: triangle prism, pyramid, sharp and angle-specified cones, an hourglass, a half-space cut, and the exact rectangle and box families.',
        features: ['triangle', 'pyramidZ', 'coneZ', 'coneAngZ', 'halfSpace', 'boxExactCentered'],
        sections: ['shapes', 'transforms'],
        region: {
            min: [-2.35, -1.35, -0.6],
            max: [2.35, 1.35, 0.9],
        },
        res: 16,
    },

    build(libfive: Libfive): Shape {
        const pieces: Shape[] = [
            // Back row.
            libfive
                .triangle([-1.95, 0.43], [-1.65, 0.43], [-1.8, 0.87])
                .extrudeZ(-0.4, 0.12),
            libfive.pyramidZ([-1.16, 0.39], [-0.64, 0.91], -0.4, 0.62),
            libfive.coneZ(0.3, 0.66, [0, 0.65, -0.4]),
            libfive
                .coneAngZ(0.75, 0.62, [0.9, 0.65, -0.32])
                .union(libfive.coneAngZ(0.75, 0.62, [0.9, 0.65, -0.32]).reflectXZ()),
            libfive
                .sphere(0.34, [1.8, 0.65, 0.05])
                .intersect(libfive.halfSpace([0.45, 0.45, 1], [1.8, 0.65, 0.12])),

            // Front row.
            libfive.rectangleExact([-1.57, -0.81], [-1.13, -0.49]).extrudeZ(-0.4, 0.1),
            libfive.rectangleCenteredExact([0.52, 0.34], [-0.45, -0.65]).extrudeZ(-0.4, 0.06),
            libfive.boxExactCentered([0.42, 0.42, 0.36], [0.45, -0.65, -0.22]),
            libfive.boxMiteredCentered([0.44, 0.44, 0.34], [1.35, -0.65, -0.23]),
        ];

        // Fold the row together from the union identity.
        let scene = libfive.emptiness();
        for (const piece of pieces) {
            scene = scene.union(piece);
        }
        return scene;
    },
};

export default demo;
