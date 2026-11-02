import type { Libfive, Shape } from 'libfive-wasm';
import type { DemoDefinition } from './types.js';

/**
 * Five symmetry stations. `reflectY` duplicates a bracket, `symmetricX`/
 * `symmetricY` fan one fin into petals (plus a `reflectZ` lower tier),
 * `symmetricZ` clips a bracket at the z origin and mirrors the surviving
 * half into an H, a sphere complement is shown via `inverse` and `neg`, and
 * one torus is folded into a pair by an `abs` coordinate inside `remap`.
 */
const demo: DemoDefinition = {
    meta: {
        id: 'symmetry-lab',
        title: 'Symmetry lab',
        description:
            'Reflect duplicates a bracket, symmetric mirrors fan a fin into petals, symmetricZ clips-and-mirrors a bracket into an H, a sphere complement shown via inverse and neg, and an abs-folded torus pair.',
        features: ['reflectY', 'symmetricX', 'symmetricZ', 'inverse', 'neg', 'abs'],
        sections: ['transforms', 'csg', 'math'],
        region: {
            min: [-2.9, -1.8, -1.0],
            max: [2.75, 1.7, 0.9],
        },
        res: 14,
    },

    build(libfive: Libfive): Shape {
        // Station A: an L-bracket asymmetric in y, so reflectY yields a pair.
        const bracket = libfive
            .boxMitered([-0.35, 0.1, -0.7], [0.35, 0.7, -0.3])
            .union(libfive.boxMitered([-0.35, 0.5, -0.3], [-0.05, 0.7, 0.55]));
        const brackets = bracket.union(bracket.reflectY()).move([-2.2, 0.9, 0]);

        // Station B: one fin at the origin, fanned to 8 petals.
        const fin = libfive.boxMitered([0.22, -0.08, -0.15], [0.7, 0.08, 0.7]);
        const finFan = libfive.symmetricY(libfive.symmetricX(fin));
        const starburst = finFan.union(finFan.reflectZ()).move([0, 0.9, 0]);

        // Station C: symmetricZ clips at z=0 and mirrors the kept half — the
        // upper bracket arm becomes both arms of an H.
        const half = libfive
            .boxMitered([-0.35, -0.4, 0.0], [0.35, 0.4, 0.1])
            .union(libfive.boxMitered([-0.35, -0.4, 0.1], [-0.1, 0.4, 0.7]));
        const hBracket = half.symmetricZ().move([2.0, 0.9, 0]);

        // Station D: complements of a sphere, once per stdlib inverse and
        // once per the pointwise negation opcode, each bounded by a cube.
        const ballA = libfive.sphere(0.4, [-0.6, 0, -0.2]);
        const ballB = libfive.sphere(0.4, [0.6, 0, -0.2]);
        const voidA = libfive
            .boxMitered([-1.15, -0.5, -0.7], [-0.05, 0.5, 0.3])
            .intersect(ballA.inverse());
        const voidB = libfive
            .boxMitered([0.05, -0.5, -0.7], [1.15, 0.5, 0.3])
            .intersect(ballB.neg());
        const complements = voidA.union(voidB).move([-1.4, -0.9, 0]);

        // Station E: one torus folded across y=0 by an abs coordinate.
        const ring = libfive.torusZ(0.35, 0.12, [0, 0.6, 0]);
        const folded = ring
            .remap(libfive.x(), libfive.y().abs(), libfive.z())
            .move([0.9, -0.6, 0]);

        return brackets.union(starburst).union(hBracket).union(complements).union(folded);
    },
};

export default demo;
