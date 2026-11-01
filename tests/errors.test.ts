/*
 * libfive-wasm tests: LibfiveError identity and message handling.
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { describe, expect, it } from 'vitest';
import { LibfiveError } from '../src/index.js';

describe('LibfiveError', () => {
    it('is an Error with the stable name', () => {
        const err = new LibfiveError('boom');
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(LibfiveError);
        expect(err.name).toBe('LibfiveError');
        expect(err.message).toBe('boom');
    });

    it('carries a cause through ErrorOptions', () => {
        const cause = new Error('root cause');
        const err = new LibfiveError('wrapped', { cause });
        expect(err.cause).toBe(cause);
    });

    it('is catchable by name check', () => {
        const err = new LibfiveError('no artifact');
        expect(`${err.name}: ${err.message}`).toBe('LibfiveError: no artifact');
    });
});
