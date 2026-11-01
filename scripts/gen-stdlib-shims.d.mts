/*
Type declarations for the flat C stdlib shim generator.

Copyright (C) 2026  libfive-wasm contributors

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this file,
You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import type { ParsedStdlib } from './lib/stdlib-parse.mjs';

export interface RenderedShims {
    header: string;
    source: string;
    shimNames: string[];
}

export function renderShims(parsed: ParsedStdlib): RenderedShims;
export function generate(headerPath: string): RenderedShims;
