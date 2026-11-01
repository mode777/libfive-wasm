/*
libfive-wasm: generate the typed TypeScript stdlib surface (AD-017, AD-024).

Reads the vendored libfive C stdlib header through the shared parser and
writes `src/gen/stdlib.ts`: the spec table both the runtime and the tests
iterate, plus the public `StdlibFunctions` / `StdlibMethods` interfaces.

Usage:
    node scripts/gen-stdlib-ts.mjs            # write the generated file
    node scripts/gen-stdlib-ts.mjs --check    # fail if it is stale
    node scripts/gen-stdlib-ts.mjs --header <path> --out <path>

Copyright (C) 2026  libfive-wasm contributors

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this file,
You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStdlibFile, toCamelCase } from './lib/stdlib-parse.mjs';

const REPO_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
);
const DEFAULT_HEADER = path.join(
    REPO_ROOT,
    'vendor',
    'libfive',
    'libfive',
    'stdlib',
    'libfive_stdlib.h',
);
const DEFAULT_OUT = path.join(REPO_ROOT, 'src', 'gen', 'stdlib.ts');

/** C `intersection` keeps its top-level name but the method is `intersect`. */
const METHOD_RENAMES = Object.freeze({ intersection: 'intersect' });

/**
 * Names already owned by the handwritten `Shape` surface. A generated method
 * must not silently replace one of them.
 */
const RESERVED_METHOD_NAMES = new Set([
    'constructor',
    'tree',
    'free',
    'toString',
    'isVar',
    'getConst',
    'remap',
    'optimized',
    'evalF',
    'evalR',
    'evalD',
    'mesh',
    // Opcode math methods (shape-core)
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
]);

const TS_TYPES = Object.freeze({
    tree: 'TFloat',
    tfloat: 'TFloat',
    vec2: 'Vec2Arg',
    vec3: 'Vec3Arg',
    int: 'number',
    string: 'string',
});

function fail(message) {
    console.error(`gen-stdlib-ts: ${message}`);
    process.exitCode = 1;
}

function parseArgs(argv) {
    const out = { check: false, header: DEFAULT_HEADER, out: DEFAULT_OUT };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--check') {
            out.check = true;
            continue;
        }
        const next = () => {
            const value = argv[++i];
            if (value === undefined) {
                throw new Error(`${arg} requires a value`);
            }
            return value;
        };
        if (arg === '--header') {
            out.header = path.resolve(next());
        } else if (arg.startsWith('--header=')) {
            out.header = path.resolve(arg.slice('--header='.length));
        } else if (arg === '--out') {
            out.out = path.resolve(next());
        } else if (arg.startsWith('--out=')) {
            out.out = path.resolve(arg.slice('--out='.length));
        } else {
            throw new Error(`unknown argument '${arg}'`);
        }
    }
    return out;
}

/** Doc block at `indent`, or `undefined` when the doc is empty. */
function docBlock(doc, indent) {
    const lines = doc
        .trim()
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '');
    if (lines.length === 0) {
        return undefined;
    }
    const pad = ' '.repeat(indent);
    if (lines.length === 1) {
        return `${pad}/** ${lines[0]} */`;
    }
    return [
        `${pad}/**`,
        ...lines.map((line) => `${pad} * ${line}`),
        `${pad} */`,
    ].join('\n');
}

function camelArgName(name) {
    const camel = toCamelCase(name);
    // Keep the header's meaning for one-letter names (`a`, `b`, `t`).
    return camel === '' ? name : camel;
}

function signatureArgs(spec, dropReceiver) {
    const args = dropReceiver ? spec.args.slice(1) : spec.args;
    if (args.length === 0) {
        return '';
    }
    return args
        .map(
            (arg) =>
                `${camelArgName(arg.name)}${arg.optional ? '?' : ''}: ` +
                TS_TYPES[arg.kind],
        )
        .join(', ');
}

function signatureLine(name, spec, indent, dropReceiver) {
    const args = signatureArgs(spec, dropReceiver);
    return `${' '.repeat(indent)}${name}(${args}): Shape;`;
}

function aliasSignatureLine(alias, targetSpec, indent, dropReceiver) {
    const args = signatureArgs(targetSpec, dropReceiver);
    return `${' '.repeat(indent)}${alias.jsName}(${args}): Shape;`;
}

function renderSpec(spec) {
    const lines = ['    {'];
    lines.push(`        section: ${JSON.stringify(spec.section)},`);
    lines.push(`        cName: ${JSON.stringify(spec.cName)},`);
    lines.push(`        jsName: ${JSON.stringify(spec.jsName)},`);
    lines.push(`        shim: ${JSON.stringify(spec.shim)},`);
    if (spec.method !== undefined) {
        lines.push(`        method: ${JSON.stringify(spec.method)},`);
    }
    lines.push(`        doc: ${JSON.stringify(spec.doc.trim())},`);
    if (spec.args.length === 0) {
        lines.push('        args: [],');
    } else {
        lines.push('        args: [');
        for (const arg of spec.args) {
            const fields = [
                `name: ${JSON.stringify(arg.name)}`,
                `kind: ${JSON.stringify(arg.kind)}`,
                `optional: ${String(arg.optional)}`,
            ];
            if (arg.optional) {
                fields.push(`defaultValue: ${arg.defaultValue}`);
            }
            lines.push(`            { ${fields.join(', ')} },`);
        }
        lines.push('        ],');
    }
    lines.push('    },');
    return lines.join('\n');
}

function renderAlias(alias) {
    return (
        '    { ' +
        `section: ${JSON.stringify(alias.section)}, ` +
        `jsName: ${JSON.stringify(alias.jsName)}, ` +
        `aliasOf: ${JSON.stringify(alias.aliasOf)}, ` +
        (alias.method !== undefined
            ? `method: ${JSON.stringify(alias.method)}, `
            : '') +
        '},'
    );
}

/** Builds the generation model (shared with the test suite). */
export function buildModel(parsed) {
    const specs = parsed.declarations.map((decl) => {
        const jsName = toCamelCase(decl.name);
        const isMethod = decl.args[0]?.kind === 'tree';
        let method;
        if (isMethod) {
            method = METHOD_RENAMES[decl.name] ?? jsName;
        }
        return {
            section: decl.section,
            cName: decl.cName,
            jsName,
            shim: `shim_stdlib_${decl.cName.replace(/^_/, '')}`,
            method,
            doc: decl.doc,
            args: decl.args.map((arg) => ({
                name: arg.name,
                kind: arg.kind,
                optional: arg.optional,
                defaultValue: arg.defaultValue,
            })),
        };
    });

    const byJsName = new Map(specs.map((spec) => [spec.jsName, spec]));
    const aliases = parsed.aliases.map((alias) => {
        const targetName = toCamelCase(alias.aliasOf);
        const target = byJsName.get(targetName);
        if (target === undefined) {
            throw new Error(
                `alias '${alias.name}' targets '${alias.aliasOf}', which has ` +
                    'no generated spec',
            );
        }
        return {
            section: alias.section,
            jsName: toCamelCase(alias.name),
            aliasOf: targetName,
            method: target.method === undefined ? undefined : toCamelCase(alias.name),
        };
    });

    // Names must be unique, and method forms must not shadow the handwritten
    // Shape surface (a pin bump introducing a clash must fail generation).
    const seen = new Set();
    for (const entry of [...specs, ...aliases]) {
        if (seen.has(entry.jsName)) {
            throw new Error(`duplicate generated function '${entry.jsName}'`);
        }
        seen.add(entry.jsName);
        if (entry.method !== undefined &&
            RESERVED_METHOD_NAMES.has(entry.method)) {
            throw new Error(
                `generated method '${entry.method}' collides with a ` +
                    'handwritten Shape member',
            );
        }
    }
    const methodNames = new Set();
    for (const entry of [...specs, ...aliases]) {
        if (entry.method === undefined) {
            continue;
        }
        if (methodNames.has(entry.method)) {
            throw new Error(`duplicate generated method '${entry.method}'`);
        }
        methodNames.add(entry.method);
    }

    return {
        sections: parsed.sections,
        specs,
        aliases,
        methodNames: [...methodNames],
    };
}

/** Renders `src/gen/stdlib.ts` from the model. */
export function renderTypeScript(model) {
    const { specs, aliases } = model;
    const specsByName = new Map(specs.map((spec) => [spec.jsName, spec]));
    const out = [];

    out.push(
        '/*',
        ' * libfive-wasm: generated standard-library surface (AD-017, AD-024).',
        ' *',
        ' * DO NOT EDIT BY HAND. Regenerate with `npm run gen:stdlib`',
        ' * (scripts/gen-stdlib-ts.mjs) after vendoring a new libfive pin.',
        ' *',
        ' * Copyright (C) 2026  libfive-wasm contributors',
        ' *',
        ' * This Source Code Form is subject to the terms of the Mozilla Public',
        ' * License, v. 2.0. If a copy of the MPL was not distributed with this',
        ' * file, You can obtain one at http://mozilla.org/MPL/2.0/.',
        ' */',
        '',
        "import type { Shape } from '../api/shape.js';",
        "import type { TFloat, Vec2Arg, Vec3Arg } from '../api/types.js';",
        '',
        '/** Argument kind of one C stdlib parameter. */',
        "export type StdlibArgKind = 'tree' | 'tfloat' | 'vec2' | 'vec3' | 'int' | 'string';",
        '',
        '/** One parameter of a generated stdlib function. */',
        'export interface StdlibArgSpec {',
        '    /** Header argument name (snake_case). */',
        '    readonly name: string;',
        '    readonly kind: StdlibArgKind;',
        '    readonly optional: boolean;',
        '    /** Upstream `__N` default, repeated per vector component. */',
        '    readonly defaultValue?: number;',
        '}',
        '',
        '/** One generated stdlib declaration. */',
        'export interface StdlibSpec {',
        '    readonly section: string;',
        '    /** C symbol verbatim (leading underscore included). */',
        '    readonly cName: string;',
        '    /** JS function name (camelCase). */',
        '    readonly jsName: string;',
        '    /** Generated flat C shim symbol. */',
        '    readonly shim: string;',
        '    /** Method name when the first C argument is a receiver shape. */',
        '    readonly method?: string;',
        '    /** Header doc comment. */',
        '    readonly doc: string;',
        '    readonly args: readonly StdlibArgSpec[];',
        '}',
        '',
        '/** One `LIBFIVE_ALIAS` entry, resolved to its declaration. */',
        'export interface StdlibAliasSpec {',
        '    readonly section: string;',
        '    readonly jsName: string;',
        '    readonly aliasOf: string;',
        '    readonly method?: string;',
        '}',
        '',
        '/** Every generated stdlib declaration, in header order. */',
        'export const STDLIB_SPECS: readonly StdlibSpec[] = [',
        specs.map(renderSpec).join('\n'),
        '];',
        '',
        '/** Every upstream alias, resolved to its declaration. */',
        'export const STDLIB_ALIASES: readonly StdlibAliasSpec[] = [',
        aliases.map(renderAlias).join('\n'),
        '];',
        '',
        '/** Generated method-form names (installed on `Shape.prototype`). */',
        'export const STDLIB_METHOD_NAMES: readonly string[] = [',
        model.methodNames.map((name) => `    ${JSON.stringify(name)},`).join('\n'),
        '];',
        '',
        '/**',
        ' * Every generated stdlib function, exposed on the `init()` instance.',
        ' * Plain numbers coerce to constant trees; optional arguments use the',
        ' * kernel defaults recorded in {@link STDLIB_SPECS}.',
        ' */',
        'export interface StdlibFunctions {',
    );

    for (const spec of specs) {
        const doc = docBlock(spec.doc, 4);
        if (doc !== undefined) {
            out.push(doc);
        }
        out.push(signatureLine(spec.jsName, spec, 4, false));
    }
    for (const alias of aliases) {
        const target = specsByName.get(alias.aliasOf);
        const doc = docBlock(
            `${target.doc.trim()}\n\nAlias of \`${alias.aliasOf}\`.`,
            4,
        );
        if (doc !== undefined) {
            out.push(doc);
        }
        out.push(aliasSignatureLine(alias, target, 4, false));
    }
    out.push('}', '');

    out.push(
        '/**',
        ' * Generated method forms: every declaration whose first C argument is',
        ' * a receiver shape, minus the non-stdlib surface owned by `Shape`.',
        ' */',
        'export interface StdlibMethods {',
    );
    for (const spec of specs) {
        if (spec.method === undefined) {
            continue;
        }
        const doc = docBlock(spec.doc, 4);
        if (doc !== undefined) {
            out.push(doc);
        }
        out.push(signatureLine(spec.method, spec, 4, true));
    }
    for (const alias of aliases) {
        if (alias.method === undefined) {
            continue;
        }
        const target = specsByName.get(alias.aliasOf);
        const doc = docBlock(
            `${target.doc.trim()}\n\nAlias of \`${alias.method}\`.`,
            4,
        );
        if (doc !== undefined) {
            out.push(doc);
        }
        out.push(aliasSignatureLine(alias, target, 4, true));
    }
    out.push('}', '');

    return out.join('\n');
}

/** Generates the TypeScript surface text from a header file. */
export function generate(headerPath) {
    return renderTypeScript(buildModel(parseStdlibFile(headerPath)));
}

function main() {
    let options;
    try {
        options = parseArgs(process.argv.slice(2));
    } catch (err) {
        fail(err.message);
        return;
    }

    if (!existsSync(options.header)) {
        fail(
            `header not found at ${options.header}; run ` +
                'scripts/vendor-libfive.sh first',
        );
        return;
    }

    let rendered;
    try {
        rendered = generate(options.header);
    } catch (err) {
        fail(err.message);
        return;
    }

    if (options.check) {
        let existing = '';
        try {
            existing = readFileSync(options.out, 'utf8');
        } catch {
            fail(`stale generated file: ${options.out} is missing`);
            return;
        }
        if (existing !== rendered) {
            fail(`stale generated file: ${options.out} (run npm run gen:stdlib)`);
            return;
        }
        console.log(`gen-stdlib-ts: ${path.relative(REPO_ROOT, options.out)} is current`);
        return;
    }

    writeFileSync(options.out, rendered);
    console.log(
        `gen-stdlib-ts: wrote ${path.relative(REPO_ROOT, options.out)} ` +
            `(${buildCount(rendered)} declarations)`,
    );
}

function buildCount(rendered) {
    return (rendered.match(/^        cName:/gm) ?? []).length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}
