import type { Libfive, Shape } from "libfive-wasm";
import type { DemoDefinition } from "./types.js";

/**
 * A rounded square tube twisted around its axis. The square bore twists with
 * the outer wall, making the spiral easy to read from the top opening.
 */
const demo: DemoDefinition = {
  meta: {
    id: "twisted-column",
    title: "Twisted column",
    description:
      "A rounded square tube twisted around its axis. Shows roundedBox, difference and twirlZ.",
    features: ["roundedBox", "difference", "twirlZ"],
    region: {
      min: [-1.5, -1.5, -1.6],
      max: [1.5, 1.5, 1.6],
    },
    res: 16,
  },

  build(libfive: Libfive): Shape {
    const outer = libfive.roundedBox(
      [-0.95, -0.95, -1.45],
      [0.95, 0.95, 1.45],
      0.16,
    );
    const inner = libfive.roundedBox(
      [-0.68, -0.68, -1.7],
      [0.68, 0.68, 1.7],
      0.1,
    );

    return outer.difference(inner).twirlZ(Math.PI * 0.9, 1.2);
  },
};

export default demo;
