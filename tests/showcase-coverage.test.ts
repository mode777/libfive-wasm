/*
 * libfive-wasm tests: method-level demo coverage (AD-030).
 *
 * Every canonical method on the convenience surface — the generated stdlib
 * functions and their method forms, the Shape opcode/evaluation/inspection
 * methods, and the instance factories — must appear as a real call site in
 * at least one demo module's source. Generated aliases are satisfied by
 * coverage of their target. Comments and string literals are stripped
 * before matching, and `Math.*` calls are removed so a bare `Math.pow` can
 * never fake coverage of Shape.pow.
 *
 * Mesh/STL/raw plumbing (mesh, copyVerts, exportSTL, Shape.fromTree,
 * opcodeByName) is deliberately out of scope here: it is exercised on every
 * catalog entry by the showcase-demos and showcase-thumbnails suites.
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { STDLIB_ALIASES, STDLIB_SPECS } from '../src/gen/stdlib.js';
import { REPO_ROOT } from './support/artifact.js';

const DEMO_SOURCE_DIR = path.join(REPO_ROOT, 'site', 'src', 'demos');

/** Demo modules carry the coverage; these files are gallery plumbing. */
const INFRASTRUCTURE_FILES = new Set([
    'coverage.ts',
    'index.ts',
    'sections.ts',
    'sources.ts',
    'types.ts',
]);

/**
 * The Shape surface that is not generated from the stdlib header: opcode
 * methods (in kernel opcode-table order), advanced operations, and the
 * evaluation/inspection methods. Kept literal on purpose — it is small,
 * stable, and reviewable against src/api/shape.ts.
 */
const SHAPE_METHODS: readonly string[] = [
    'add',
    'sub',
    'mul',
    'min',
    'max',
    'div',
    'atan2',
    'pow',
    'mod',
    'compare',
    'nthRoot',
    'abs',
    'square',
    'sqrt',
    'sin',
    'cos',
    'tan',
    'asin',
    'acos',
    'atan',
    'exp',
    'log',
    'neg',
    'remap',
    'optimized',
    'toString',
    'isVar',
    'getConst',
    'evalF',
    'evalR',
    'evalD',
];

/** Instance factories on the init() result. */
const FACTORY_METHODS: readonly string[] = ['x', 'y', 'z', 'constant', 'var'];

/** Removes comments and string-literal contents from TS source. */
export function stripCommentsAndStrings(src: string): string {
    let out = '';
    let i = 0;
    let mode: 'code' | 'line' | 'block' | 'single' | 'double' | 'template' =
        'code';
    while (i < src.length) {
        const c = src[i]!;
        const n = src[i + 1];
        if (mode === 'code') {
            if (c === '/' && n === '/') {
                mode = 'line';
                i += 2;
                continue;
            }
            if (c === '/' && n === '*') {
                mode = 'block';
                i += 2;
                continue;
            }
            if (c === "'" || c === '"' || c === '`') {
                mode = c === "'" ? 'single' : c === '"' ? 'double' : 'template';
                out += ' ';
                i += 1;
                continue;
            }
            out += c;
            i += 1;
            continue;
        }
        if (mode === 'line') {
            if (c === '\n') {
                mode = 'code';
                out += '\n';
            }
            i += 1;
            continue;
        }
        if (mode === 'block') {
            if (c === '*' && n === '/') {
                mode = 'code';
                i += 2;
                continue;
            }
            i += 1;
            continue;
        }
        // Inside a string literal: keep the contents out of the output.
        if (c === '\\') {
            i += 2;
            continue;
        }
        if (
            (mode === 'single' && c === "'") ||
            (mode === 'double' && c === '"') ||
            (mode === 'template' && c === '`')
        ) {
            mode = 'code';
            out += ' ';
        }
        i += 1;
    }
    return out;
}

/** Required surface entry: every spelling that counts as covering it. */
interface RequiredName {
    readonly origin: string;
    spellings: string[];
}

function requiredSurface(): RequiredName[] {
    const required: RequiredName[] = [];
    for (const spec of STDLIB_SPECS) {
        const spellings = spec.method ? [spec.jsName, spec.method] : [spec.jsName];
        required.push({ origin: spec.jsName, spellings });
    }
    // An alias installs the same kernel shim as its target, so calling the
    // alias name is calling the target: merge its spellings upward.
    const byOrigin = new Map(required.map((r) => [r.origin, r]));
    for (const alias of STDLIB_ALIASES) {
        const target = byOrigin.get(alias.aliasOf);
        if (target) {
            target.spellings = [...target.spellings, alias.jsName];
        } else {
            required.push({ origin: alias.jsName, spellings: [alias.jsName] });
        }
    }
    for (const name of SHAPE_METHODS) {
        required.push({ origin: name, spellings: [name] });
    }
    for (const name of FACTORY_METHODS) {
        required.push({ origin: name, spellings: [name] });
    }
    return required;
}

/** True when any spelling appears as a call in the stripped source set. */
function appears(
    spellings: readonly string[],
    stripped: ReadonlyMap<string, string>,
): boolean {
    for (const spelling of spellings) {
        // \b covers both call forms: libfive.union( and .union(
        const pattern = new RegExp(`\\b${spelling}\\s*\\(`);
        for (const source of stripped.values()) {
            if (pattern.test(source)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * The origins with no real call site across `sources` (filename → source).
 * Exported so the matcher's failure modes are unit-testable inline.
 */
export function uncoveredNames(
    sources: Readonly<Record<string, string>>,
): string[] {
    const stripped = new Map<string, string>();
    for (const [name, source] of Object.entries(sources)) {
        // Drop Math.* calls first: Math.pow must not cover Shape.pow.
        const codeOnly = stripCommentsAndStrings(source).replaceAll(
            /\bMath\s*\.\s*[a-zA-Z_$][\w$]*\s*\(/g,
            ' ',
        );
        stripped.set(name, codeOnly);
    }

    const uncovered: string[] = [];
    for (const entry of requiredSurface()) {
        if (!appears(entry.spellings, stripped)) {
            uncovered.push(entry.origin);
        }
    }
    return uncovered.sort();
}

function readDemoSources(): Record<string, string> {
    const sources: Record<string, string> = {};
    for (const file of readdirSync(DEMO_SOURCE_DIR)) {
        if (!file.endsWith('.ts') || INFRASTRUCTURE_FILES.has(file)) {
            continue;
        }
        sources[file] = readFileSync(path.join(DEMO_SOURCE_DIR, file), 'utf8');
    }
    return sources;
}

describe('method-level demo coverage (AD-030)', () => {
    it('demonstrates every canonical method somewhere in the catalog', () => {
        const uncovered = uncoveredNames(readDemoSources());
        expect(
            uncovered,
            `methods with no demo call site: ${uncovered.join(', ')}`,
        ).toEqual([]);
    });

    it('reports a method called nowhere', () => {
        const uncovered = uncoveredNames({
            'a.ts': 'const plate = libfive.roundedBox(a, b, 0.2);',
        });
        expect(uncovered).toContain('shell');
        expect(uncovered).toContain('pow');
    });

    it('does not count comment-only mentions', () => {
        const uncovered = uncoveredNames({
            'a.ts': `
                // shell(0.2) would hollow the plate
                /* offset(0.1) grows it */
                const plate = libfive.roundedBox(a, b, 0.2);
            `,
        });
        expect(uncovered).toContain('shell');
        expect(uncovered).toContain('offset');
    });

    it('does not count Math.* calls as Shape method calls', () => {
        const uncovered = uncoveredNames({
            'a.ts': 'const r = Math.pow(x, 2) + Math.abs(y);',
        });
        expect(uncovered).toContain('pow');
        expect(uncovered).toContain('abs');
    });

    it('counts an alias call as coverage of its target', () => {
        const uncovered = uncoveredNames({
            'a.ts': 'const cube = libfive.boxMitered(a, b);',
        });
        expect(uncovered).not.toContain('cube');
        expect(uncovered).not.toContain('boxMitered');
    });

    it('counts a method-form call for its stdlib origin', () => {
        const uncovered = uncoveredNames({
            'a.ts': 'const j = a.blend(b, 0.3);',
        });
        expect(uncovered).not.toContain('blendExptUnit');
    });
});
