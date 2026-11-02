import blendedBlob from "./blended-blob.js";
import gyroidSurface from "./gyroid-surface.js";
import textBadge from "./text-badge.js";
import twistedColumn from "./twisted-column.js";
import type { DemoDefinition, DemoMeta } from "./types.js";

/** A demo builder plus its metadata. Sources live in `sources.ts` so the
 *  worker/test graph does not pull Vite-only `?raw` imports. */
export type DemoEntry = DemoDefinition;

/**
 * The showcase catalog. Each demo is a real module; the worker executes its
 * `build` function and the Code tab displays the matching raw source.
 */
export const demos: readonly DemoEntry[] = [
  blendedBlob,
  gyroidSurface,
  twistedColumn,
  textBadge,
];

const byId = new Map<string, DemoEntry>(
  demos.map((demo) => [demo.meta.id, demo]),
);

export function getDemo(id: string): DemoEntry | undefined {
  return byId.get(id);
}

export function demoMetaList(): readonly DemoMeta[] {
  return demos.map((demo) => demo.meta);
}
