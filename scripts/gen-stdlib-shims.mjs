/*
libfive-wasm: generate the flat C stdlib shims (AD-022, AD-024).

JavaScript cannot call C functions that take structs by value, and the build
wants one uniform call convention for every stdlib entry point. This script
parses the vendored `libfive_stdlib.h` through the shared parser and writes
`wasm/stdlib_shim.h` / `wasm/stdlib_shim.c`: one `shim_stdlib_<name>` wrapper
per declaration with flattened scalar/pointer parameters.

Usage:
    node scripts/gen-stdlib-shims.mjs            # write the generated files
    node scripts/gen-stdlib-shims.mjs --check    # fail if they are stale

Copyright (C) 2026  libfive-wasm contributors

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this file,
You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStdlibFile } from './lib/stdlib-parse.mjs';

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
const DEFAULT_HEADER_OUT = path.join(REPO_ROOT, 'wasm', 'stdlib_shim.h');
const DEFAULT_SOURCE_OUT = path.join(REPO_ROOT, 'wasm', 'stdlib_shim.c');

const FILE_COMMENT = [
    '/*',
    'libfive-wasm: generated flat stdlib shims (AD-022, AD-024).',
    '',
    'DO NOT EDIT BY HAND. Regenerate with `npm run gen:stdlib`',
    '(scripts/gen-stdlib-shims.mjs) after vendoring a new libfive pin.',
    '',
    'Copyright (C) 2026  libfive-wasm contributors',
    '',
    'This Source Code Form is subject to the terms of the Mozilla Public',
    'License, v. 2.0. If a copy of the MPL was not distributed with this file,',
    'You can obtain one at http://mozilla.org/MPL/2.0/.',
    '*/',
    '',
];

function parseArgs(argv) {
    const out = {
        check: false,
        header: DEFAULT_HEADER,
        headerOut: DEFAULT_HEADER_OUT,
        sourceOut: DEFAULT_SOURCE_OUT,
    };
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
        const assign = (key, value) => {
            out[key] = path.resolve(value);
        };
        if (arg === '--header') assign('header', next());
        else if (arg.startsWith('--header=')) assign('header', arg.slice(9));
        else if (arg === '--header-out') assign('headerOut', next());
        else if (arg.startsWith('--header-out=')) assign('headerOut', arg.slice(13));
        else if (arg === '--source-out') assign('sourceOut', next());
        else if (arg.startsWith('--source-out=')) assign('sourceOut', arg.slice(13));
        else throw new Error(`unknown argument '${arg}'`);
    }
    return out;
}

/** Flattens one C argument into shim parameter declarations and call text. */
function flattenArgument(arg) {
    switch (arg.kind) {
        case 'tree':
        case 'tfloat':
            return {
                params: [`libfive_tree ${arg.name}`],
                locals: [],
                call: arg.name,
            };
        case 'vec2':
            return {
                params: [
                    `libfive_tree ${arg.name}_x`,
                    `libfive_tree ${arg.name}_y`,
                ],
                locals: [
                    `    tvec2 ${arg.name} = {${arg.name}_x, ${arg.name}_y};`,
                ],
                call: arg.name,
            };
        case 'vec3':
            return {
                params: [
                    `libfive_tree ${arg.name}_x`,
                    `libfive_tree ${arg.name}_y`,
                    `libfive_tree ${arg.name}_z`,
                ],
                locals: [
                    `    tvec3 ${arg.name} = ` +
                        `{${arg.name}_x, ${arg.name}_y, ${arg.name}_z};`,
                ],
                call: arg.name,
            };
        case 'int':
            return { params: [`int ${arg.name}`], locals: [], call: arg.name };
        case 'string':
            return {
                params: [`const char* ${arg.name}`],
                locals: [],
                call: arg.name,
            };
        default:
            throw new Error(`unsupported argument kind '${arg.kind}'`);
    }
}

function shimName(cName) {
    return `shim_stdlib_${cName.replace(/^_/, '')}`;
}

/** Renders the header and source text from a parsed header model. */
export function renderShims(parsed) {
    const headerLines = [...FILE_COMMENT];
    headerLines.push('#pragma once', '', '#include "libfive_stdlib.h"', '');
    headerLines.push('#ifdef __cplusplus', 'extern "C" {', '#endif', '');

    const sourceLines = [...FILE_COMMENT];
    sourceLines.push(
        '#include "stdlib_shim.h"',
        '',
        '#ifdef __cplusplus',
        'extern "C" {',
        '#endif',
        '',
    );

    for (const decl of parsed.declarations) {
        const name = shimName(decl.cName);
        const params = decl.args.map(flattenArgument);
        const paramText = params.flatMap((part) => part.params);

        headerLines.push(`libfive_tree ${name}(`);
        if (paramText.length === 0) {
            headerLines.push('    void);');
        } else {
            paramText.forEach((param, index) => {
                headerLines.push(
                    `    ${param}${index === paramText.length - 1 ? ');' : ','}`,
                );
            });
        }
        headerLines.push('');

        sourceLines.push(`libfive_tree ${name}(`);
        if (paramText.length === 0) {
            sourceLines.push('    void)');
        } else {
            paramText.forEach((param, index) => {
                sourceLines.push(
                    `    ${param}${index === paramText.length - 1 ? ')' : ','}`,
                );
            });
        }
        sourceLines.push('{');
        for (const part of params) {
            sourceLines.push(...part.locals);
        }
        const callArgs = params.map((part) => part.call).join(', ');
        sourceLines.push(`    return ${decl.cName}(${callArgs});`);
        sourceLines.push('}', '');
    }

    headerLines.push('#ifdef __cplusplus', '}', '#endif', '');
    sourceLines.push('#ifdef __cplusplus', '}', '#endif', '');

    return {
        header: headerLines.join('\n'),
        source: sourceLines.join('\n'),
        shimNames: parsed.declarations.map((decl) => shimName(decl.cName)),
    };
}

/** Generates header and source text from a header path. */
export function generate(headerPath) {
    return renderShims(parseStdlibFile(headerPath));
}

function fail(message) {
    console.error(`gen-stdlib-shims: ${message}`);
    process.exitCode = 1;
}

function readIfExists(file) {
    try {
        return readFileSync(file, 'utf8');
    } catch {
        return null;
    }
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

    const outputs = [
        [options.headerOut, rendered.header],
        [options.sourceOut, rendered.source],
    ];

    if (options.check) {
        let stale = false;
        for (const [file, expected] of outputs) {
            const existing = readIfExists(file);
            if (existing === null) {
                fail(`stale generated file: ${file} is missing`);
                stale = true;
            } else if (existing !== expected) {
                fail(`stale generated file: ${file} (run npm run gen:stdlib)`);
                stale = true;
            }
        }
        if (!stale) {
            console.log(
                `gen-stdlib-shims: ${rendered.shimNames.length} shims current`,
            );
        }
        return;
    }

    for (const [file, text] of outputs) {
        writeFileSync(file, text);
        console.log(
            `gen-stdlib-shims: wrote ${path.relative(REPO_ROOT, file)}`,
        );
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}
