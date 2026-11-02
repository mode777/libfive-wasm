import type { Libfive, Shape } from 'libfive-wasm';
import type { DemoDefinition } from './types.js';

/**
 * A thin box whose coordinates are remapped by a sine/cosine height field.
 * The geometry is one expression; use the inspector probe to evaluate it.
 */
const demo: DemoDefinition = {
    meta: {
        id: 'wavy-slab',
        title: 'Wavy slab',
        description:
            'A thin slab warped by a sine/cosine height field. Shows coordinate remapping and is a good target for the evaluation probe.',
        features: ['remap', 'sin', 'cos', 'box'],
        sections: ['shapes', 'eval'],
        region: {
            min: [-2.2, -2.2, -1.2],
            max: [2.2, 2.2, 1.2],
        },
        res: 18,
    },

    build(libfive: Libfive): Shape {
        const x = libfive.x();
        const y = libfive.y();
        const z = libfive.z();
        const wave = z
            .add(x.mul(2).sin().mul(0.22))
            .add(y.mul(1.7).cos().mul(0.22));
        const slab = libfive.box([-1.8, -1.8, -0.14], [1.8, 1.8, 0.14]);

        return slab.remap(x, y, wave);
    },
};

export default demo;
