import type { Libfive, Shape } from 'libfive-wasm';
import type { DemoDefinition } from './types.js';

/**
 * Geometry built from answers the kernel gives back: `evalF` bisects along
 * +X to find the surface, `evalD` reads the gradient there to aim a probe
 * pin, `evalR` bounds a sub-region to size a caliper ring, and the meshed
 * tree is an `optimized()` copy. Constants, free variables and the Scheme
 * form are inspected along the way — nothing here is hard-coded by hand.
 */
const demo: DemoDefinition = {
    meta: {
        id: 'eval-inspection',
        title: 'Eval & inspect',
        description:
            'The build function interrogates the field: evalF bisects for the surface, evalD aims a probe pin along the gradient, evalR sizes a caliper ring, and optimized() cleans up the tree.',
        features: ['evalF', 'evalD', 'evalR', 'optimized', 'getConst'],
        sections: ['eval', 'shapes'],
        region: {
            min: [-1.75, -1.75, -1.5],
            max: [1.75, 1.75, 2.05],
        },
        res: 18,
    },

    build(libfive: Libfive): Shape {
        // The field under inspection: two blended lobes.
        const field = libfive
            .sphere(0.9, [0, 0, 0.1])
            .blend(libfive.sphere(0.6, [0.7, 0.2, 0.55]), 0.35);

        // Bisect up +Z for the first surface crossing.
        let lo = 0.2;
        let hi = 1.5;
        for (let i = 0; i < 24; i++) {
            const mid = (lo + hi) / 2;
            if (field.evalF([0, 0, mid]) < 0) {
                lo = mid;
            } else {
                hi = mid;
            }
        }
        const surface: [number, number, number] = [0, 0, lo];

        // The gradient at the crossing aims the probe pin outward.
        const gradient = field.evalD(surface);
        const tilt = Math.atan2(gradient[2]!, Math.hypot(gradient[0]!, gradient[1]!));
        const yaw = Math.atan2(gradient[1]!, gradient[0]!);
        const pin = libfive
            .cylinderZ(0.09, 1.0)
            .rotateY(Math.PI / 2 - tilt)
            .rotateZ(yaw)
            .move(surface);

        // An interval bound over a sub-region sizes the caliper halo. Interval
        // bounds are conservative, so clamp the contribution.
        const bounds = field.evalR({ min: [0.5, -0.25, 0.2], max: [1.3, 0.25, 0.8] });
        const slack = Math.min(0.1, Math.abs(bounds.lower) * 0.15);

        // Inspection: a constant reports its value and becomes the marker size.
        const gauge = libfive.constant(0.42);
        const markerRadius = (gauge.getConst() ?? 0.1) * 0.2;
        const marker = libfive.sphere(markerRadius, surface);

        // A free variable identifies itself; derived trees carrying it are
        // for inspection only (vars evaluate as zero — never reach the mesher).
        const free = libfive.var();
        if (!free.isVar()) {
            throw new Error('kernel produced a non-var from the var factory');
        }
        const probeTree = free.mul(2).add(1);
        if (probeTree.getConst() !== undefined) {
            throw new Error('a free variable must not fold to a constant');
        }
        const collar = libfive
            .cylinderZ(0.1, 0.08, surface)
            .rotateY(Math.PI / 2 - tilt)
            .rotateZ(yaw);

        // The meshed tree is a kernel-optimized copy; its Scheme form drives
        // a real choice — bigger trees get a thinner caliper tube.
        const shape = field.optimized();
        const form = shape.toString();
        const caliperTube = form.split(' ').length > 30 ? 0.08 : 0.09;
        const caliper = libfive.torusZ(1.35 + slack, caliperTube, [0, 0, 0.1]);

        return shape.union(marker).union(collar).union(pin).union(caliper);
    },
};

export default demo;
