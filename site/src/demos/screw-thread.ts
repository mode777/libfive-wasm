import type { Libfive, Shape } from 'libfive-wasm';
import type { DemoDefinition } from './types.js';

/**
 * A hex-head bolt with a true helical thread, an f-rep classic. The thread
 * unwraps the angle around the axis with `atan2`, shifts the height by the
 * angle times the lead, and folds it into a periodic band with `mod` — so
 * the groove is continuous across the atan2 seam by construction.
 */
const demo: DemoDefinition = {
    meta: {
        id: 'screw-thread',
        title: 'Screw thread',
        description:
            'A hex bolt with a real helical thread: atan2 unwraps the angle, mod folds the shifted height into a periodic groove band. A classic implicit-modeling trick.',
        features: ['atan2', 'mod', 'polygon', 'intersect'],
        sections: ['math', 'shapes', 'transforms'],
        region: {
            min: [-1.6, -1.6, -2.0],
            max: [1.6, 1.6, 2.0],
        },
        res: 18,
    },

    build(libfive: Libfive): Shape {
        const pitch = 0.55;
        const depth = 0.16;

        // Unwrap: height minus (angle around Z) times the lead per radian.
        const theta = libfive.y().atan2(libfive.x());
        const unwrapped = libfive.z().sub(theta.mul(pitch / (2 * Math.PI)));
        // A periodic band of thickness `depth` around the unwrapped height.
        const groove = unwrapped.mod(pitch).sub(pitch / 2).abs().sub(depth / 2);

        const core = libfive.cylinderZ(0.8, 2.4, [0, 0, -1.2]);
        const tube = libfive.ring(0.98, 0.62).extrudeZ(-1.2, 1.2);
        const blank = core.union(tube.intersect(groove));

        const head = libfive.polygon(1.35, 6).extrudeZ(1.2, 1.75);
        return blank.union(head);
    },
};

export default demo;
