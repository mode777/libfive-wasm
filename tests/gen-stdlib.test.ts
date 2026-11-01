/*
 * libfive-wasm tests: the stdlib header parser and both generators
 * (stdlib-bindings tasks 1.1-1.3).
 *
 * The generators are plain Node scripts; these tests exercise them without
 * the wasm artifact by comparing their output with the checked-in files.
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from './support/artifact.js';
import {
    parseArg,
    parseStdlib,
    parseStdlibFile,
    StdlibParseError,
    toCamelCase,
} from '../scripts/lib/stdlib-parse.mjs';
import {
    buildModel,
    generate as generateTs,
} from '../scripts/gen-stdlib-ts.mjs';
import {
    generate as generateShims,
    renderShims,
} from '../scripts/gen-stdlib-shims.mjs';
import {
    STDLIB_ALIASES,
    STDLIB_METHOD_NAMES,
    STDLIB_SPECS,
} from '../src/gen/stdlib.js';
import type { ParsedStdlib } from '../scripts/lib/stdlib-parse.mjs';

const HEADER = path.join(
    REPO_ROOT,
    'vendor',
    'libfive',
    'libfive',
    'stdlib',
    'libfive_stdlib.h',
);

const parsed = parseStdlibFile(HEADER);

describe('stdlib header parser (task 1.1)', () => {
    it('parses every section and declaration', () => {
        expect(parsed.sections).toEqual([
            'csg',
            'shapes',
            'transforms',
            'text',
        ]);
        expect(parsed.declarations.length).toBeGreaterThan(70);
        for (const decl of parsed.declarations) {
            expect(decl.section, decl.name).toBeTruthy();
            expect(decl.doc.trim(), decl.name).not.toBe('');
            expect(decl.cName, decl.name).toBeTruthy();
        }
    });

    it('keeps raw C names and strips the leading underscore for the JS name', () => {
        const union = parsed.declarations.find((decl) => decl.name === 'union');
        expect(union?.cName).toBe('_union');
    });

    it('parses argument kinds, defaults and doc comments', () => {
        const sphere = parsed.declarations.find((decl) => decl.name === 'sphere');
        expect(sphere?.doc.trim()).toBe(
            'A sphere with the given radius and (optional) center',
        );
        expect(sphere?.args.map((arg) => [arg.name, arg.kind, arg.optional])).toEqual([
            ['radius', 'tfloat', false],
            ['center', 'vec3', true],
        ]);
        expect(sphere?.args[1]?.defaultValue).toBe(0);

        const blendDifference = parsed.declarations.find(
            (decl) => decl.name === 'blend_difference',
        );
        expect(blendDifference?.args.at(-1)).toMatchObject({
            name: 'o',
            kind: 'tfloat',
            optional: true,
            defaultValue: 0,
        });

        const taper = parsed.declarations.find((decl) => decl.name === 'taper_x_y');
        expect(taper?.args.at(-1)).toMatchObject({
            name: 'base_scale',
            optional: true,
            defaultValue: 1,
        });

        const polygon = parsed.declarations.find((decl) => decl.name === 'polygon');
        expect(polygon?.args.map((arg) => arg.kind)).toEqual(['tfloat', 'int', 'vec2']);

        const text = parsed.declarations.find((decl) => decl.name === 'text');
        expect(text?.args.map((arg) => arg.kind)).toEqual(['string', 'vec2']);
    });

    it('handles a declaration with no arguments', () => {
        const emptiness = parsed.declarations.find(
            (decl) => decl.name === 'emptiness',
        );
        expect(emptiness?.args).toEqual([]);
    });

    it('resolves forward-declared aliases in a second pass', () => {
        // cube_centered appears before box_mitered_centered in the header.
        const cubeCentered = parsed.aliases.find(
            (alias) => alias.name === 'cube_centered',
        );
        expect(cubeCentered?.aliasOf).toBe('box_mitered_centered');
        expect(parsed.aliases.length).toBeGreaterThan(5);
        const names = parsed.aliases.map((alias) => alias.name);
        expect(new Set(names).size).toBe(names.length);
    });

    it('rejects malformed declarations and unresolvable aliases', () => {
        expect(() =>
            parseArg('mystery x', 'f'),
        ).toThrow(StdlibParseError);
        expect(() =>
            parseStdlib(
                'LIBFIVE_SECTION(shapes)\n' +
                    'LIBFIVE_STDLIB f(\n' +
                    '    // doc\n' +
                    '    tfloat a__0, tfloat b);\n',
            ),
        ).toThrow(/required argument 'b' follows an optional one/);
        expect(() =>
            parseStdlib(
                'LIBFIVE_SECTION(shapes)\n' +
                    'LIBFIVE_ALIAS(box, missing)\n',
            ),
        ).toThrow(/targets unknown function 'missing'/);
        expect(() =>
            parseStdlib(
                'LIBFIVE_SECTION(shapes)\n' +
                    'LIBFIVE_STDLIB f(\n' +
                    '    tfloat a);\n' +
                    'LIBFIVE_STDLIB f(\n' +
                    '    tfloat a);\n',
            ),
        ).toThrow(/duplicate function 'f'/);
    });

    it('maps snake_case names to camelCase', () => {
        expect(toCamelCase('array_polar_z')).toBe('arrayPolarZ');
        expect(toCamelCase('taper_xy_z')).toBe('taperXYZ');
        expect(toCamelCase('scale_xyz')).toBe('scaleXYZ');
        expect(toCamelCase('reflect_xy')).toBe('reflectXY');
        expect(toCamelCase('union')).toBe('union');
    });
});

describe('TypeScript surface generator (task 1.2)', () => {
    it('matches the checked-in generated file', () => {
        const expected = readFileSync(
            path.join(REPO_ROOT, 'src', 'gen', 'stdlib.ts'),
            'utf8',
        );
        expect(generateTs(HEADER)).toBe(expected);
    });

    it('covers every declaration and alias exactly once', () => {
        expect(STDLIB_SPECS).toHaveLength(parsed.declarations.length);
        expect(STDLIB_ALIASES).toHaveLength(parsed.aliases.length);
        const jsNames = [
            ...STDLIB_SPECS.map((spec) => spec.jsName),
            ...STDLIB_ALIASES.map((alias) => alias.jsName),
        ];
        expect(new Set(jsNames).size).toBe(jsNames.length);
        for (const alias of STDLIB_ALIASES) {
            expect(
                STDLIB_SPECS.some((spec) => spec.jsName === alias.aliasOf),
                alias.jsName,
            ).toBe(true);
        }
    });

    it('generates method forms only for receiver-leading declarations', () => {
        const methods = STDLIB_SPECS.filter((spec) => spec.method !== undefined);
        expect(methods.length).toBeGreaterThan(0);
        for (const spec of methods) {
            expect(spec.args[0]?.kind, spec.jsName).toBe('tree');
        }
        const sphere = STDLIB_SPECS.find((spec) => spec.jsName === 'sphere');
        const text = STDLIB_SPECS.find((spec) => spec.jsName === 'text');
        expect(sphere?.method).toBeUndefined();
        expect(text?.method).toBeUndefined();
        const intersection = STDLIB_SPECS.find(
            (spec) => spec.jsName === 'intersection',
        );
        expect(intersection?.method).toBe('intersect');
        expect(STDLIB_METHOD_NAMES).toContain('loftBetween');
        expect(STDLIB_METHOD_NAMES).toContain('arrayPolar');
        expect(STDLIB_METHOD_NAMES).toContain('rotateZ');
    });

    it('fails generation on duplicate or reserved method names', () => {
        const model = buildModel(parsed);
        expect(model.specs.length).toBe(parsed.declarations.length);
        expect(model.methodNames.length).toBeGreaterThan(0);

        const duplicate: ParsedStdlib = {
            sections: ['shapes'],
            declarations: [
                {
                    cName: 'foo_bar',
                    name: 'foo_bar',
                    section: 'shapes',
                    doc: 'a',
                    args: [{ name: 'a', type: 'libfive_tree', kind: 'tree', optional: false }],
                },
                {
                    cName: 'foo_bar',
                    name: 'foo_bar',
                    section: 'shapes',
                    doc: 'b',
                    args: [{ name: 'a', type: 'libfive_tree', kind: 'tree', optional: false }],
                },
            ],
            aliases: [],
        };
        expect(() => buildModel(duplicate)).toThrow(/duplicate generated function/);

        const reserved: ParsedStdlib = {
            sections: ['shapes'],
            declarations: [
                {
                    cName: 'remap',
                    name: 'remap',
                    section: 'shapes',
                    doc: 'a',
                    args: [{ name: 'a', type: 'libfive_tree', kind: 'tree', optional: false }],
                },
            ],
            aliases: [],
        };
        expect(() => buildModel(reserved)).toThrow(
            /collides with a handwritten Shape member/,
        );
    });
});

describe('shim generator (task 1.3)', () => {
    const rendered = generateShims(HEADER);

    it('matches the checked-in generated files', () => {
        expect(rendered.header).toBe(
            readFileSync(path.join(REPO_ROOT, 'wasm', 'stdlib_shim.h'), 'utf8'),
        );
        expect(rendered.source).toBe(
            readFileSync(path.join(REPO_ROOT, 'wasm', 'stdlib_shim.c'), 'utf8'),
        );
    });

    it('emits one flat shim per declaration', () => {
        expect(rendered.shimNames).toHaveLength(parsed.declarations.length);
        expect(rendered.shimNames).toContain('shim_stdlib_union');
        expect(rendered.shimNames).toContain('shim_stdlib_sphere');
        expect(rendered.shimNames).toContain('shim_stdlib_text');
        for (const name of rendered.shimNames) {
            expect(rendered.header).toContain(`libfive_tree ${name}(`);
        }
    });

    it('flattens struct-by-value signatures', () => {
        const loft = rendered.source.slice(
            rendered.source.indexOf('libfive_tree shim_stdlib_loft_between('),
        );
        const loftParams = loft.slice(
            loft.indexOf('(') + 1,
            loft.indexOf(')'),
        );
        expect(loftParams.match(/libfive_tree /g)).toHaveLength(8);
        expect(loft).toContain('tvec3 lower = {lower_x, lower_y, lower_z};');
        expect(loft).toContain('tvec3 upper = {upper_x, upper_y, upper_z};');

        const text = rendered.source.slice(
            rendered.source.indexOf('libfive_tree shim_stdlib_text('),
        );
        expect(text.slice(0, text.indexOf(')'))).toContain('const char* txt');
        expect(text).toContain('tvec2 pos = {pos_x, pos_y};');
        expect(rendered.source).toContain(
            'libfive_tree shim_stdlib_emptiness(\n    void)',
        );
    });

    it('renders deterministically', () => {
        expect(renderShims(parsed)).toEqual(rendered);
    });

    it('compiles with a host C compiler when available', () => {
        let gccAvailable = true;
        try {
            execFileSync('gcc', ['--version'], { stdio: 'ignore' });
        } catch {
            gccAvailable = false;
        }
        if (!gccAvailable) {
            return;
        }
        execFileSync(
            'gcc',
            [
                '-fsyntax-only',
                '-I',
                path.join(REPO_ROOT, 'wasm'),
                '-I',
                path.join(REPO_ROOT, 'vendor', 'libfive', 'libfive', 'include'),
                '-I',
                path.join(REPO_ROOT, 'vendor', 'libfive', 'libfive', 'stdlib'),
                path.join(REPO_ROOT, 'wasm', 'stdlib_shim.c'),
            ],
            { stdio: 'pipe' },
        );
    });
});
