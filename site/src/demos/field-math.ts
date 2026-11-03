import type { Libfive, Shape } from 'libfive-wasm';
import type { DemoDefinition } from './types.js';

/**
 * A field-math quilt: four square tiles, each carrying one raw-field pattern —
 * a superellipse pocket (pow + abs), an Archimedean spiral cut (atan2 + sqrt),
 * a ribbed comb (mod), and concentric ring grooves. A compare step clamps the
 * cut depth outside the solid. A central medallion holds two exp domes unioned
 * with min; the rim uses max and a gentle log/sin wave.
 */
const demo: DemoDefinition = {
    meta: {
        id: 'field-math',
        title: 'Field math',
        description:
            'A quilt of raw field expressions: superellipse pocket, spiral cut, mod ribs and rings, compare-clamped cuts, exp domes unioned with min/max, and a warped rim.',
        features: [
            'pow',
            'mod',
            'compare',
            'atan2',
            'min',
            'max',
            'exp',
            'log',
        ],
        sections: ['math', 'shapes', 'transforms'],
        region: {
            min: [-2.5, -2.5, -0.6],
            max: [2.5, 2.5, 0.8],
        },
        res: 24,
    },

    build(libfive: Libfive): Shape {
        const x = libfive.x();
        const y = libfive.y();
        const z = libfive.z();

        // Four tiles with a small gap between them; the central medallion
        // sits in the gap and carries the domes.
        const tile = (cx: number, cy: number): Shape =>
            libfive.roundedBox(
                [cx - 0.8, cy - 0.8, -0.2],
                [cx + 0.8, cy + 0.8, 0.2],
                0.08,
            );
        const nw = tile(-1.2, 1.2);
        const ne = tile(1.2, 1.2);
        const sw = tile(-1.2, -1.2);
        const se = tile(1.2, -1.2);

        // compare() clamps the cut at z = 0.3, above the tile top, so its
        // step sits in empty space; the box supplies the sides and floor.
        const below = z.sub(0.3).compare(0).mul(0.5);
        const cutDepth = (shape: Shape, cx: number, cy: number): Shape =>
            shape
                .intersect(
                    libfive.boxMitered(
                        [cx - 0.8, cy - 0.8, 0.05],
                        [cx + 0.8, cy + 0.8, 3],
                    ),
                )
                .intersect(below);

        // Q1 (NW): superellipse pocket.
        const nwX = x.add(1.2);
        const nwY = y.sub(1.2);
        const superell = nwX.abs().pow(4).add(nwY.abs().pow(4)).sub(0.15);

        // Q2 (NE): one Archimedean spiral arm, r = 0.12 * (theta + pi).
        const neX = x.sub(1.2);
        const neY = y.sub(1.2);
        const neR = neX.square().add(neY.square()).sqrt();
        const spiral = neR
            .sub(neY.atan2(neX).add(Math.PI).mul(0.12))
            .abs()
            .sub(0.06);

        // Q3 (SW): a rib comb — grooves every 0.38 in x.
        const ribs = x.add(1.2).mod(0.38).sub(0.19).abs().sub(0.07);

        // Q4 (SE): concentric ring grooves from a periodic radial field.
        const seR = x.sub(1.2).square().add(y.add(1.2).square()).sqrt();
        const rings = seR.mod(0.36).sub(0.18).abs().sub(0.06);

        const ribCut = cutDepth(ribs, -1.2, -1.2);
        let out = nw
            .union(ne)
            .union(sw)
            .union(se)
            .difference(cutDepth(superell, -1.2, 1.2))
            .difference(cutDepth(spiral, 1.2, 1.2))
            .difference(ribCut)
            // reflectXY crosses the rib comb into a mod grid.
            .difference(ribCut.reflectXY())
            .difference(cutDepth(rings, 1.2, -1.2));

        // Central medallion with two exp domes, unioned with min.
        const medallion = libfive.roundedBox(
            [-0.55, -0.55, -0.2],
            [0.55, 0.55, 0.24],
            0.08,
        );
        const dome = (dx: number): Shape =>
            x
                .add(dx)
                .square()
                .add(y.square())
                .add(z.sub(0.24).square())
                .mul(-9)
                .exp()
                .mul(0.4)
                .neg()
                .add(0.18);
        out = out.min(medallion).min(dome(-0.2)).min(dome(0.2));

        // Gentle rim ripple built from the remaining scalar ops; max is the
        // raw rim radius that scales the displacement.
        const rim = x.abs().max(y.abs());
        const ripple = x
            .mul(0.3)
            .atan()
            .add(x.mul(0.12).asin().mul(0.3))
            .add(y.mul(0.12).acos().mul(0.3))
            .add(x.mul(0.08).tan().mul(0.2))
            .add(x.abs().add(1).log().mul(0.05))
            .add(x.abs().add(y.abs()).add(1).div(3).nthRoot(3).mul(0.05));
        const wave = rim.mul(0.012).mul(ripple);
        return out.remap(x, y, z.add(wave));
    },
};

export default demo;
