import blendedBlobSource from "./blended-blob?raw";
import gyroidSurfaceSource from "./gyroid-surface?raw";
import textBadgeSource from "./text-badge?raw";
import twistedColumnSource from "./twisted-column?raw";

/** Raw module source shown in the Code tab, keyed by demo id. */
export const demoSources: Readonly<Record<string, string>> = {
  "blended-blob": blendedBlobSource,
  "gyroid-surface": gyroidSurfaceSource,
  "twisted-column": twistedColumnSource,
  "text-badge": textBadgeSource,
};

export function getDemoSource(id: string): string {
  return demoSources[id] ?? "";
}
