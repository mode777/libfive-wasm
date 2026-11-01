/*
Type declarations for the TypeScript stdlib surface generator.

Copyright (C) 2026  libfive-wasm contributors

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this file,
You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import type { ParsedStdlib } from './lib/stdlib-parse.mjs';
import type {
    StdlibAliasSpec,
    StdlibSpec,
} from '../../src/gen/stdlib.js';

export interface StdlibModel {
    sections: string[];
    specs: StdlibSpec[];
    aliases: StdlibAliasSpec[];
    methodNames: string[];
}

export function buildModel(parsed: ParsedStdlib): StdlibModel;
export function renderTypeScript(model: StdlibModel): string;
export function generate(headerPath: string): string;
