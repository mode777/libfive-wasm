import type { Libfive, Shape } from 'libfive-wasm';
import type { DemoDefinition } from './types.js';

/**
 * A field-math quilt: one slab, four quadrants of raw field expressions —
 * a superellipse pocket (pow + abs), an Archimedean spiral cut (atan2 +
 * sqrt), a ribbed comb (mod), and quantized rings (compare). Domes and a
 * boss are unioned with min/max as raw CSG, and the whole slab is warped
 * by a wave built from bounded trig, exp and log terms.
 */
const demo: DemoDefinition = {
    meta: {
        id: 'field-math',
        title: 'Field math',
        description:
            'A quilt of raw field expressions: superellipse pocket, spiral cut, mod ribs, compare-quantized rings, exp/log domes unioned with min/max, and a warped rim.',
        features: ['pow', 'mod', 'compare', 'atan2', 'min', 'max'],
        sections: ['math', 'shapes', 'transforms'],
        region: {
            min: [-2.75, -2.75, -0.7],
            max: [2.75, 2.75, 0.95],
        },
        res: 16,
    },

    build(libfive: Libfive): Shape {
        const x = libfive.x();
        const y = libfive.y();
        const z = libfive.z();
        const r = x.square().add(y.square()).sqrt();

        const slab = libfive.roundedBox([-2.4, -2.4, -0.15], [2.4, 2.4, 0.15], 0.1);

        // Quadrant boxes, built plainly to keep the math below readable.
        const ne = libfive.boxMitered([0.25, 0.25, -0.2], [2.25, 2.25, 0.25]);
        const nw = libfive.boxMitered([-2.25, 0.25, -0.2], [-0.25, 2.25, 0.25]);
        const se = libfive.boxMitered([0.25, -2.25, -0.2], [2.25, -0.25, 0.25]);
        const sw = libfive.boxMitered([-2.25, -2.25, -0.2], [-0.25, -0.25, 0.25]);

        let out = slab;
        // Q1 (NW) and its diagonal twin (SE): the pocket cut mirrored across
        // the x=y diagonal with reflectXY. Superellipse: |x|^4 + |y|^4 < 0.8.
        const superell = x.abs().pow(4).add(y.abs().pow(4)).sub(0.8);
        const nwPocket = nw.intersect(superell);
        out = out
            .difference(nwPocket)
            .difference(nwPocket.reflectXY());

        // Q2 (NE): one Archimedean spiral arm, r = 0.22 * theta.
        const spiral = r.sub(libfive.y().atan2(x).mul(0.22)).abs().sub(0.045);
        out = out.difference(ne.intersect(spiral));

        // Q3 (SE): rib comb — grooves every 0.32 in x.
        const ribs = x.mod(0.32).sub(0.16).abs().sub(0.055);
        out = out.difference(se.intersect(ribs));

        // Q4 (SW): quantized rings — compare thresholds r/0.42 into ±1 bands.
        const bands = r.div(0.42).mod(2).sub(1).compare(0);
        out = out.difference(sw.intersect(bands.mul(-0.5)));

        // exp-decay dome at the NW corner — radius includes z, so the solid is
        // a ball half-buried in the slab, not an infinite cylinder.
        const dxd = x.add(1.55);
        const dyd = y.sub(1.55);
        const dzd = z.sub(0.12);
        const dome = dxd
            .square()
            .add(dyd.square())
            .add(dzd.square())
            .neg()
            .exp()
            .mul(0.5)
            .neg()
            .add(0.3);
        out = out.min(dome);

        // exp mound at the SE corner, intersection-bounded by its quadrant
        // with max — max is raw CSG intersection.
        const bossDist2 = x.sub(1.4).square().add(y.add(1.4).square());
        const boss = bossDist2.neg().exp().mul(0.6).neg().add(0.3).max(se);
        out = out.min(boss);

        // Warp the whole quilt with a bounded wave: atan, asin, acos, tan,
        // log and nthRoot terms chosen to stay finite across the region.
        const wave = x
            .mul(0.35)
            .atan()
            .add(x.mul(0.15).asin().mul(0.4))
            .add(y.mul(0.15).acos().mul(0.4))
            .add(x.mul(0.1).tan().mul(0.25))
            .add(x.abs().add(1).log().mul(0.09))
            .add(r.nthRoot(3).mul(0.06))
            .mul(0.09);
        return out.remap(x, y, z.add(wave));
    },
};

export default demo;
