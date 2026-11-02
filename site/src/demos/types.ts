import type { Libfive, Region3, Shape } from 'libfive-wasm';
import type { Section } from './sections.js';

/** Metadata shown in the gallery and used by the mesh worker. */
export interface DemoMeta {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly features: readonly string[];
    readonly sections: readonly Section[];
    readonly region: Region3;
    readonly res: number;
}

/** A demo module: metadata plus the tree builder the worker executes. */
export interface DemoDefinition {
    readonly meta: DemoMeta;
    readonly build: (libfive: Libfive) => Shape;
}
