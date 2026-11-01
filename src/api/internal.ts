/*
 * libfive-wasm: module-private internals shared by the API layers.
 *
 * The stdlib runtime and the generated prototype methods need the owning
 * `ApiContext` of a `Shape` without widening the public class surface, so the
 * context lives under this symbol instead of an ordinary field. Consumers
 * outside the package cannot reach it by name.
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Symbol key holding a `Shape`'s owning API context. */
export const ShapeContext: unique symbol = Symbol('libfive-wasm.ShapeContext');
