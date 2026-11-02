import type { Libfive, Shape } from "libfive-wasm";
import type { DemoDefinition } from "./types.js";

/**
 * Three blended primitives: a sphere, an offset sphere and a rotated torus.
 * The blends make one continuous clay-like form with no hard seams.
 */
const demo: DemoDefinition = {
  meta: {
    id: "blended-blob",
    title: "Blended blob",
    description:
      "A sphere, an offset sphere and a rotated torus joined with smooth blends. Shows CSG blending and chained transforms.",
    features: ["blend", "sphere", "torusZ", "rotateX"],
    region: {
      min: [-2.2, -2.2, -2.2],
      max: [2.2, 2.2, 2.2],
    },
    res: 14,
  },

  build(libfive: Libfive): Shape {
    const body = libfive.sphere(1);
    const lobe = libfive.sphere(0.72, [0.95, 0.18, 0]);
    const ring = libfive
      .torusZ(0.92, 0.24)
      .rotateX(Math.PI / 2)
      .move([-0.15, 0, 0]);

    return body.blend(lobe, 0.45).blend(ring, 0.28);
  },
};

export default demo;
