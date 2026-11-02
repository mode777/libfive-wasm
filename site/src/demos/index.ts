import blendedBlob from './blended-blob.js';
import gyroidSurface from './gyroid-surface.js';
import hollowFrame from './hollow-frame.js';
import latticeCube from './lattice-cube.js';
import loftTower from './loft-tower.js';
import polarGear from './polar-gear.js';
import rawEscape from './raw-escape.js';
import revolvedVase from './revolved-vase.js';
import smoothMorph from './smooth-morph.js';
import textBadge from './text-badge.js';
import twistedColumn from './twisted-column.js';
import wavySlab from './wavy-slab.js';
import type { DemoDefinition, DemoMeta } from './types.js';

/** A demo builder plus its metadata. Sources live in `sources.ts` so the
 *  worker/test graph does not pull Vite-only `?raw` imports. */
export type DemoEntry = DemoDefinition;

/**
 * The showcase catalog. Each demo is a real module; the worker executes its
 * `build` function and the Code tab displays the matching raw source.
 */
export const demos: readonly DemoEntry[] = [
    blendedBlob,
    smoothMorph,
    gyroidSurface,
    hollowFrame,
    twistedColumn,
    loftTower,
    revolvedVase,
    wavySlab,
    latticeCube,
    polarGear,
    textBadge,
    rawEscape,
];

const byId = new Map<string, DemoEntry>(
    demos.map((demo) => [demo.meta.id, demo]),
);

export function getDemo(id: string): DemoEntry | undefined {
    return byId.get(id);
}

export function demoMetaList(): readonly DemoMeta[] {
    return demos.map((demo) => demo.meta);
}
