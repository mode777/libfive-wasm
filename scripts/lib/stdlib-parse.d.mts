/*
Type declarations for the plain-Node stdlib header parser (scripts/lib).

Copyright (C) 2026  libfive-wasm contributors

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this file,
You can obtain one at http://mozilla.org/MPL/2.0/.
*/

export type StdlibArgKind =
    | 'tree'
    | 'tfloat'
    | 'vec2'
    | 'vec3'
    | 'int'
    | 'string';

export interface StdlibArg {
    name: string;
    type: string;
    kind: StdlibArgKind;
    optional: boolean;
    defaultValue?: number;
}

export interface StdlibDeclaration {
    cName: string;
    name: string;
    section: string;
    doc: string;
    args: StdlibArg[];
}

export interface StdlibAlias {
    section: string;
    name: string;
    target: string;
    aliasOf: string;
}

export interface ParsedStdlib {
    sections: string[];
    declarations: StdlibDeclaration[];
    aliases: StdlibAlias[];
}

export const ARG_KINDS: Readonly<Record<string, StdlibArgKind>>;

export class StdlibParseError extends Error {}

export function parseArg(
    raw: string,
    context: string,
): StdlibArg | null;
export function parseStdlib(text: string): ParsedStdlib;
export function parseStdlibFile(headerPath: string): ParsedStdlib;
export function toCamelCase(name: string): string;
