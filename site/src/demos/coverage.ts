import { demos } from './index.js';
import { SECTIONS, type Section } from './sections.js';

export type Coverage = Readonly<Record<Section, readonly string[]>>;

/** Maps every known section to the demo ids that declare it. */
export function coverageBySection(): Coverage {
    const result = {} as Record<Section, string[]>;
    for (const section of SECTIONS) result[section] = [];
    for (const demo of demos) {
        for (const section of demo.meta.sections) {
            result[section].push(demo.meta.id);
        }
    }
    return result;
}

/** Sections with no demo; empty when coverage is complete. */
export function missingSections(): readonly Section[] {
    const coverage = coverageBySection();
    return SECTIONS.filter((section) => coverage[section].length === 0);
}
