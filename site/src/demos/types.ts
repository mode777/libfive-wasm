import type { Libfive, Region3, Shape } from 'libfive-wasm';
import type { Section } from './sections.js';

/**
 * Signature sample points the validation suite checks against the built
 * shape: `inside` points MUST evaluate as inside the solid (negative `evalF`)
 * and `outside` points MUST evaluate as outside it. An empty or non-finite
 * mesh fails every `inside` probe.
 */
export interface DemoProbes {
    readonly inside?: readonly (readonly [number, number, number])[];
    readonly outside?: readonly (readonly [number, number, number])[];
}

/** Metadata shown in the gallery and used by the mesh worker. */
export interface DemoMeta {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly features: readonly string[];
    readonly sections: readonly Section[];
    readonly region: Region3;
    readonly res: number;
    /** Declared signature probes, in region coordinates. */
    readonly probes?: DemoProbes;
}

/** A demo module: metadata plus the tree builder the worker executes. */
export interface DemoDefinition {
    readonly meta: DemoMeta;
    readonly build: (libfive: Libfive) => Shape;
}
