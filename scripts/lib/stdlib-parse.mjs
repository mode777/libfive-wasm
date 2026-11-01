/*
libfive-wasm: parser for the vendored libfive C stdlib header.

Reads the marker-based declarations in
`vendor/libfive/libfive/stdlib/libfive_stdlib.h` exactly the way upstream's
`stdlib/parse.py` does, so the TypeScript surface (AD-017) and the generated
C shims (AD-024) are derived from one authoritative parse.

Copyright (C) 2026  libfive-wasm contributors

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this file,
You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { readFileSync } from 'node:fs';

/** C argument type -> argument kind used by both emitters. */
export const ARG_KINDS = Object.freeze({
    libfive_tree: 'tree',
    tfloat: 'tfloat',
    tvec2: 'vec2',
    tvec3: 'vec3',
    int: 'int',
    'const char*': 'string',
});

/** Kinds whose `__N` default is allowed (upstream convention). */
const DEFAULTABLE_KINDS = new Set(['tfloat', 'vec2', 'vec3']);

export class StdlibParseError extends Error {
    constructor(message) {
        super(message);
        this.name = 'StdlibParseError';
    }
}

/**
 * Parses one argument declaration such as `tfloat base_scale__1`.
 * Returns `{ name, type, kind, optional, defaultValue }`, where `name` keeps
 * the upstream snake_case spelling.
 */
export function parseArg(raw, context) {
    const text = raw.trim();
    if (text === '') {
        return null;
    }
    const match = /^(.*?)\s+([A-Za-z_][A-Za-z0-9_]*)$/.exec(text);
    if (!match) {
        throw new StdlibParseError(
            `${context}: cannot parse argument declaration '${text}'`,
        );
    }
    const type = match[1].trim();
    const kind = ARG_KINDS[type];
    if (kind === undefined) {
        throw new StdlibParseError(
            `${context}: unsupported argument type '${type}' in '${text}'`,
        );
    }

    let name = match[2];
    let defaultValue;
    let optional = false;
    const suffix = name.split('__');
    if (suffix.length > 1) {
        if (suffix.length !== 2) {
            throw new StdlibParseError(
                `${context}: malformed default suffix in '${text}'`,
            );
        }
        [name] = suffix;
        const value = Number(suffix[1]);
        if (!Number.isInteger(value)) {
            throw new StdlibParseError(
                `${context}: default '${suffix[1]}' in '${text}' is not an integer`,
            );
        }
        if (!DEFAULTABLE_KINDS.has(kind)) {
            throw new StdlibParseError(
                `${context}: argument '${text}' marks a default on a ` +
                    `non-defaultable '${type}' slot`,
            );
        }
        optional = true;
        defaultValue = value;
    }

    return { name, type, kind, optional, defaultValue };
}

/**
 * Parses the header text into sections, declarations and aliases.
 *
 * Declarations keep `cName` verbatim (leading underscore included, e.g.
 * `_union`) and expose the marker-stripped public `name` (`union`). Aliases
 * are resolved to the declaration they ultimately target — including the
 * header's forward declarations — and carry `aliasOf` as that declaration's
 * public name.
 */
export function parseStdlib(text) {
    const lines = text.split(/\r?\n/);
    const sections = [];
    const declarations = [];
    const aliases = [];

    let section = null;
    let current = null;

    const beginSection = (name) => {
        if (!name) {
            throw new StdlibParseError('LIBFIVE_SECTION without a name');
        }
        if (!sections.includes(name)) {
            sections.push(name);
        }
        section = name;
    };

    const finishDeclaration = (decl, argsText) => {
        if (section === null) {
            throw new StdlibParseError(
                `declaration '${decl.name}' appears before any LIBFIVE_SECTION`,
            );
        }
        decl.section = section;
        const context = decl.name;
        const args = argsText
            .split(',')
            .map((part) => parseArg(part, context))
            .filter((arg) => arg !== null);
        let sawOptional = false;
        for (const arg of args) {
            if (arg.optional) {
                sawOptional = true;
            } else if (sawOptional) {
                throw new StdlibParseError(
                    `${context}: required argument '${arg.name}' follows an ` +
                        'optional one',
                );
            }
            if (arg.name === decl.name) {
                throw new StdlibParseError(
                    `${context}: argument '${arg.name}' shadows its function`,
                );
            }
        }
        decl.args = args;
        declarations.push(decl);
    };

    for (const rawLine of lines) {
        const line = rawLine.trim();

        if (line.startsWith('LIBFIVE_SECTION')) {
            beginSection(
                line.slice('LIBFIVE_SECTION'.length).replace(/^\(/, '').replace(/\)$/, '').trim(),
            );
            continue;
        }

        if (line.startsWith('LIBFIVE_ALIAS')) {
            const inner = line.slice('LIBFIVE_ALIAS'.length).trim();
            const match = /^\(([^,]+),\s*([^)]+)\)$/.exec(inner);
            if (!match) {
                throw new StdlibParseError(`malformed alias '${line}'`);
            }
            if (section === null) {
                throw new StdlibParseError(
                    `alias '${line}' appears before any LIBFIVE_SECTION`,
                );
            }
            aliases.push({
                section,
                name: match[1].trim(),
                target: match[2].trim(),
            });
            continue;
        }

        if (line.startsWith('LIBFIVE_STDLIB')) {
            const rest = line.slice('LIBFIVE_STDLIB'.length).trim();
            const open = rest.indexOf('(');
            if (open < 0) {
                throw new StdlibParseError(
                    `declaration '${line}' has no argument list`,
                );
            }
            const cName = rest.slice(0, open).trim();
            if (cName === '') {
                throw new StdlibParseError(`declaration '${line}' has no name`);
            }
            const publicName = cName.startsWith('_') ? cName.slice(1) : cName;
            const decl = {
                cName,
                name: publicName,
                section: null,
                doc: '',
                args: [],
            };
            let remainder = rest.slice(open + 1);
            const done = remainder.includes(');');
            if (done) {
                remainder = remainder.slice(0, remainder.indexOf(');'));
            }
            current = { decl, argsText: remainder };
            if (done) {
                finishDeclaration(current.decl, current.argsText);
                current = null;
            }
            continue;
        }

        if (current !== null) {
            if (line.startsWith('//')) {
                current.decl.doc += `${line.replace(/^\/\/ ?/, '')}\n`;
            } else {
                if (line.endsWith(');')) {
                    current.argsText += ` ${line.slice(0, -2)}`;
                    finishDeclaration(current.decl, current.argsText);
                    current = null;
                } else {
                    current.argsText += ` ${line}`;
                }
            }
        }
    }

    if (current !== null) {
        throw new StdlibParseError(
            `unterminated declaration '${current.decl.name}'`,
        );
    }

    const byName = new Map(declarations.map((decl) => [decl.name, decl]));
    const seen = new Set();
    for (const decl of declarations) {
        if (seen.has(decl.name)) {
            throw new StdlibParseError(`duplicate function '${decl.name}'`);
        }
        seen.add(decl.name);
    }
    for (const alias of aliases) {
        if (seen.has(alias.name)) {
            throw new StdlibParseError(`duplicate function '${alias.name}'`);
        }
        seen.add(alias.name);
    }

    const resolveAlias = (alias, trail = []) => {
        if (trail.includes(alias.name)) {
            throw new StdlibParseError(
                `alias cycle: ${[...trail, alias.name].join(' -> ')}`,
            );
        }
        const target = byName.get(alias.target);
        if (target !== undefined) {
            return target.name;
        }
        const next = aliases.find((candidate) => candidate.name === alias.target);
        if (next === undefined) {
            throw new StdlibParseError(
                `alias '${alias.name}' targets unknown function '${alias.target}'`,
            );
        }
        return resolveAlias(next, [...trail, alias.name]);
    };

    const resolvedAliases = aliases.map((alias) => ({
        ...alias,
        aliasOf: resolveAlias(alias),
    }));

    for (const alias of resolvedAliases) {
        if (!byName.has(alias.aliasOf)) {
            // resolveAlias always returns a declaration name; this guards a
            // future change to that contract rather than the current header.
            throw new StdlibParseError(
                `alias '${alias.name}' did not resolve to a declaration`,
            );
        }
    }

    return { sections, declarations, aliases: resolvedAliases };
}

/** Parses the header file at `headerPath`. */
export function parseStdlibFile(headerPath) {
    let text;
    try {
        text = readFileSync(headerPath, 'utf8');
    } catch (err) {
        throw new StdlibParseError(
            `cannot read '${headerPath}' (${err.message}); ` +
                'run scripts/vendor-libfive.sh first',
        );
    }
    return parseStdlib(text);
}

/**
 * snake_case -> camelCase; leading underscores are already stripped.
 * Axis tokens (`x`, `y`, `z`, `xy`, `xyz`, ...) are uppercased whole
 * (`scale_xyz` -> `scaleXYZ`, `reflect_xy` -> `reflectXY`), matching the
 * documented API spelling; other tokens keep only an initial capital.
 */
export function toCamelCase(name) {
    const parts = name.split('_').filter(Boolean);
    return parts
        .map((part, index) => {
            if (index === 0) {
                return part.toLowerCase();
            }
            if (/^[xyz]+$/.test(part)) {
                return part.toUpperCase();
            }
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join('');
}
