/*
 * libfive-wasm tests: validate the public showcase catalog (AD-028).
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { init, type Libfive } from "libfive-wasm";
import { demos } from "../site/src/demos/index.js";
import { MeshSession } from "../site/src/worker/run-demo.js";
import { WASM_PATH } from "./support/artifact.js";

let libfive: Libfive;

beforeAll(async () => {
  libfive = await init({ wasmBinary: readFileSync(WASM_PATH) });
});

afterAll(() => {
  libfive = undefined as unknown as Libfive;
});

describe("showcase demo catalog", () => {
  it("has unique ids and non-empty metadata", () => {
    const ids = new Set<string>();
    for (const demo of demos) {
      expect(demo.meta.id).toMatch(/^[a-z0-9-]+$/);
      expect(ids.has(demo.meta.id)).toBe(false);
      ids.add(demo.meta.id);
      expect(demo.meta.title.length).toBeGreaterThan(0);
      expect(demo.meta.description.length).toBeGreaterThan(0);
      expect(demo.meta.features.length).toBeGreaterThan(0);
      expect(typeof demo.build).toBe("function");
    }
  });

  for (const demo of demos) {
    it(`${demo.meta.id} meshes to finite geometry`, () => {
      // Keep CI fast; the point is that every catalog entry builds and
      // meshes through the public API, not that it matches final quality.
      const res = Math.max(4, Math.min(8, demo.meta.res));
      const shape = demo.build(libfive);
      const mesh = shape.mesh({ region: demo.meta.region, res });
      try {
        expect(mesh.triCount).toBeGreaterThan(0);
        expect(mesh.vertCount).toBeGreaterThan(0);
        const verts = mesh.copyVerts();
        for (let i = 0; i < verts.length; i++) {
          expect(Number.isFinite(verts[i])).toBe(true);
        }
      } finally {
        mesh.free();
        shape.free();
      }
    }, 60000);
  }
});

describe("showcase mesh session", () => {
  it("keeps the current mesh for STL and replaces it on the next demo", () => {
    const session = new MeshSession(libfive);
    try {
      const first = session.run("text-badge");
      expect(first.triCount).toBeGreaterThan(0);
      expect(first.verts.length).toBe(first.vertCount * 3);
      expect(first.tris.length).toBe(first.triCount * 3);

      const stl = session.stl();
      expect(stl.triCount).toBe(first.triCount);
      expect(stl.buffer.byteLength).toBe(84 + stl.triCount * 50);

      const second = session.run("blended-blob");
      expect(second.triCount).toBeGreaterThan(0);
      expect(session.stl().triCount).toBe(second.triCount);
      expect(() => session.run("missing-demo")).toThrow("unknown demo");
    } finally {
      session.release();
    }
  }, 60000);
});
