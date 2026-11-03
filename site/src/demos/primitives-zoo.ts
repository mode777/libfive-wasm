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
        features: [
            'triangle',
            'extrudeZ',
            'pyramidZ',
            'coneZ',
            'coneAngZ',
            'halfSpace',
            'rectangleExact',
            'rectangleCenteredExact',
            'boxExactCentered',
            'boxMiteredCentered',
        ],
        sections: ['shapes', 'transforms'],
        region: {
            min: [-2.7, -1.5, -0.75],
            max: [2.7, 1.5, 0.95],
        },
        res: 18,
    },

    build(libfive: Libfive): Shape {
        const ground = -0.45;

        // coneZ/coneAngZ treat their height argument as a support-plane
        // distance, so compensate to get the requested base radius + height.
        const coneZExact = (
            r: number,
            h: number,
            x: number,
            y: number,
            z: number,
        ): Shape => {
            const k = Math.hypot(r, h);
            const f = r / k;
            return libfive
                .coneZ(r, h, [x, y, z])
                .scaleXYZ([f, f, f], [x, y, z]);
        };
        const coneAngExact = (
            r: number,
            h: number,
            x: number,
            y: number,
            z: number,
        ): Shape =>
            libfive.coneAngZ(Math.atan2(r, h), (h * r) / Math.hypot(r, h), [
                x,
                y,
                z,
            ]);

        // One sharp cone mirrored about its waist plane, with a small bead
        // joining the two apices so the hourglass meshes as a closed solid.
        const lowerCone = coneAngExact(0.3, 0.4, 1.15, 0.7, ground);
        const waist = libfive.sphere(0.06, [1.15, 0.7, -0.05]);
        const hourglass = lowerCone
            .union(lowerCone.reflectZ(-0.05))
            .union(waist);

        const pieces: Shape[] = [
            // Back row.
            libfive
                .triangle([-2.15, 0.5], [-1.85, 0.5], [-2, 0.88])
                .extrudeZ(ground, 0.1),
            libfive.pyramidZ([-1.3, 0.45], [-0.7, 0.95], ground, 0.6),
            coneZExact(0.3, 0.55, 0, 0.7, ground),
            hourglass,
            libfive
                .sphere(0.36, [2.05, 0.7, 0.06])
                .intersect(libfive.halfSpace([0.4, 0.3, 1], [2.05, 0.7, 0.12])),

            // Front row.
            libfive
                .rectangleExact([-2.05, -1], [-1.55, -0.55])
                .extrudeZ(ground, 0.05),
            libfive
                .rectangleCenteredExact([0.55, 0.38], [-0.6, -0.72])
                .extrudeZ(ground, -0.05),
            libfive.boxExactCentered([0.45, 0.45, 0.45], [0.65, -0.72, -0.225]),
            libfive.boxMiteredCentered(
                [0.45, 0.45, 0.42],
                [1.85, -0.72, -0.24],
            ),
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
