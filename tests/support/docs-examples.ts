/*
 * libfive-wasm tests: typecheck the TypeScript examples embedded in the
 * user documentation (AD-029).
 *
 * Every ```ts fence in site/docs-content/guides/*.md is compiled as a
 * standalone module against the package's public types ('libfive-wasm'
 * resolves through the package's own exports map, i.e. dist/index.d.ts).
 * Fences importing three.js are included only when the site's three
 * installation is present (site/node_modules), since the root CI install
 * does not include showcase dependencies; `ts nocheck` fences are skipped.
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const guidesDir = path.join(repoRoot, 'site', 'docs-content', 'guides');
const scratchDir = path.join(repoRoot, 'node_modules', '.cache', 'docs-examples');

export interface DocsExample {
    readonly guide: string;
    readonly index: number;
    readonly code: string;
    readonly usesThree: boolean;
}

export interface TypecheckResult {
    readonly checked: number;
    readonly skippedThree: number;
}

function guideFiles(): string[] {
    return readdirSync(guidesDir).filter((name) => name.endsWith('.md')).sort();
}

export function extractExamples(): DocsExample[] {
    const examples: DocsExample[] = [];
    for (const guide of guideFiles()) {
        const markdown = readFileSync(path.join(guidesDir, guide), 'utf8');
        const fences = markdown.matchAll(/^```([^\n]*)\n([\s\S]*?)^```/gm);
        let index = 0;
        for (const fence of fences) {
            const info = (fence[1] ?? '').trim();
            const code = fence[2] ?? '';
            index += 1;
            if (info !== 'ts' && info !== 'ts nocheck') continue;
            if (info === 'ts nocheck') continue;
            examples.push({
                guide,
                index,
                code,
                usesThree: /from\s+'three/.test(code),
            });
        }
    }
    return examples;
}

const SCRATCH_TSCONFIG = {
    compilerOptions: {
        target: 'es2022',
        module: 'esnext',
        moduleResolution: 'bundler',
        lib: ['es2022', 'dom'],
        types: ['node'],
        strict: true,
        noUncheckedIndexedAccess: true,
        skipLibCheck: true,
        esModuleInterop: true,
        forceConsistentCasingInFileNames: true,
        noEmit: true,
        baseUrl: '.',
        paths: {
            // The root install has no three; resolve against the showcase's
            // @types/three so three.js fences typecheck when it is present.
            three: ['../../../site/node_modules/@types/three/index.d.ts'],
            'three/addons/*': ['../../../site/node_modules/@types/three/examples/jsm/*'],
        },
    },
};

/**
 * Compiles every extracted example in one tsc invocation. Throws with the
 * compiler output mapped back to guide names on failure.
 */
export function typecheckExamples(examples: DocsExample[]): TypecheckResult {
    const threeAvailable = existsSync(path.join(repoRoot, 'site', 'node_modules', 'three'));
    const included = examples.filter((example) => threeAvailable || !example.usesThree);
    const skippedThree = examples.length - included.length;
    if (included.length === 0) return { checked: 0, skippedThree };

    rmSync(scratchDir, { recursive: true, force: true });
    mkdirSync(scratchDir, { recursive: true });
    const names: string[] = [];
    try {
        for (const example of included) {
            const base = example.guide.replace(/\.md$/, '');
            const name = `${base}-${example.index}.ts`;
            names.push(name);
            // Fences without imports compile as scripts and would share a
            // global scope; make each one a module so examples stay isolated.
            const isModule = /(^|\n)(import|export)\s/.test(example.code);
            writeFileSync(
                path.join(scratchDir, name),
                isModule ? example.code : `${example.code}\nexport {};\n`,
                'utf8',
            );
        }
        writeFileSync(
            path.join(scratchDir, 'tsconfig.json'),
            `${JSON.stringify(SCRATCH_TSCONFIG, null, 4)}\n`,
            'utf8',
        );

        const tsc = path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc');
        let output: string;
        try {
            execFileSync(process.execPath, [tsc, '-p', scratchDir], { cwd: repoRoot });
            output = '';
        } catch (error) {
            output = (error as { stdout?: Buffer; stderr?: Buffer }).stdout?.toString() ??
                (error as { message: string }).message;
        }
        if (output !== '') {
            for (const [name, guide] of names.map((name) => [name, name.replace(/-\d+\.ts$/, '.md')])) {
                output = output.replaceAll(name, `site/docs-content/guides/${guide}`);
            }
            throw new Error(`documentation examples failed to typecheck:\n${output}`);
        }
    } finally {
        rmSync(scratchDir, { recursive: true, force: true });
    }
    return { checked: included.length, skippedThree };
}
