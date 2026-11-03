import type { Libfive, Shape } from 'libfive-wasm';
import type { DemoDefinition } from './types.js';

/**
 * Six symmetry stations, laid out as a readable lab bench. `reflectY`
 * duplicates a bracket, `symmetricX`/`symmetricY` fan one fin into four
 * petals, `symmetricZ` mirrors a half-bracket into an H, `inverse` and `neg`
 * carve equivalent sphere cavities, `abs` folds one torus into a pair, and
 * `reflectXZ` mirrors a flat bracket into an upright corner.
 */
const demo: DemoDefinition = {
    meta: {
        id: 'symmetry-lab',
        title: 'Symmetry lab',
        description:
            'Reflect duplicates a bracket, symmetric mirrors fan a fin into petals, symmetricZ clips-and-mirrors a bracket into an H, a sphere complement shown via inverse and neg, an abs-folded torus pair, and a reflectXZ diagonal corner.',
        features: [
            'reflectY',
            'symmetricX',
            'symmetricY',
            'symmetricZ',
            'inverse',
            'neg',
            'abs',
            'reflectXZ',
        ],
        sections: ['transforms', 'csg', 'math'],
        region: {
            min: [-3.2, -1.9, -1.0],
            max: [3.2, 1.9, 1.0],
        },
        res: 20,
    },

    build(libfive: Libfive): Shape {
        // Station A: an L-bracket offset above y = 0; reflectY makes a clear
        // mirrored pair with a gap between them.
        const arm = libfive.boxMitered([-0.45, 0.18, -0.12], [0.45, 0.5, 0.12]);
        const post = libfive.boxMitered(
            [-0.45, 0.18, 0.12],
            [-0.18, 0.5, 0.55],
        );
        const bracket = arm.union(post);
        const brackets = bracket.union(bracket.reflectY()).move([-2.1, 1.0, 0]);

        // Station B: one vertical blade in a quadrant, mirrored into four
        // petals around a hub.
        const fin = libfive.boxMitered([0.15, 0.15, -0.25], [0.7, 0.3, 0.25]);
        const petals = libfive.symmetricY(libfive.symmetricX(fin));
        const hub = libfive.cylinderZ(0.2, 0.5, [0, 0, -0.25]);
        const starburst = petals.union(hub).move([0, 1.0, 0]);

        // Station C: the upper half of an H; symmetricZ mirrors it into the
        // full H (horizontal bar with a post at each end).
        const bar = libfive.boxMitered([-0.45, -0.3, 0], [0.45, 0.3, 0.1]);
        const postL = libfive.boxMitered([-0.45, -0.3, 0.1], [-0.2, 0.3, 0.6]);
        const postR = libfive.boxMitered([0.2, -0.3, 0.1], [0.45, 0.3, 0.6]);
        const halfH = bar.union(postL).union(postR);
        const hBracket = halfH.symmetricZ().move([2.1, 0.9, 0]);

        // Station D: the same box-minus-sphere cavity via inverse and neg.
        const voidBox = libfive.boxMitered(
            [-0.55, -0.5, -0.4],
            [0.55, 0.5, 0.35],
        );
        const ball = libfive.sphere(0.34, [0, -0.32, 0.02]);
        const voidA = voidBox.intersect(ball.inverse());
        const voidB = voidBox.intersect(ball.neg());
        const complements = voidA
            .move([-0.65, 0, 0])
            .union(voidB.move([0.65, 0, 0]))
            .move([-1.1, -1.05, 0]);

        // Station E: one upright ring above y = 0; abs(y) mirrors it into a
        // pair, since both y and -y sample the same positive-side torus.
        const ring = libfive
            .torusZ(0.38, 0.13, [0, 0, 0])
            .rotateX(Math.PI / 2)
            .move([1.5, 0.42, 0.15]);
        const folded = ring
            .remap(libfive.x(), libfive.y().abs(), libfive.z())
            .move([0, -0.9, 0]);

        // Station F: reflectXZ (x <-> z) turns a flat bracket into an
        // upright twin, forming a corner in the xz plane.
        const flat = libfive.boxMitered(
            [-0.4, -0.25, -0.62],
            [0.4, 0.25, -0.38],
        );
        const corner = flat.union(flat.reflectXZ()).move([-2.2, 0, 0.4]);

        return brackets
            .union(starburst)
            .union(hBracket)
            .union(complements)
            .union(folded)
            .union(corner);
    },
};

export default demo;
