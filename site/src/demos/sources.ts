import blendedBlobSource from './blended-blob?raw';
import gyroidSurfaceSource from './gyroid-surface?raw';
import hollowFrameSource from './hollow-frame?raw';
import latticeCubeSource from './lattice-cube?raw';
import loftTowerSource from './loft-tower?raw';
import polarGearSource from './polar-gear?raw';
import rawEscapeSource from './raw-escape?raw';
import revolvedVaseSource from './revolved-vase?raw';
import smoothMorphSource from './smooth-morph?raw';
import textBadgeSource from './text-badge?raw';
import twistedColumnSource from './twisted-column?raw';
import wavySlabSource from './wavy-slab?raw';

/** Raw module source shown in the Code tab, keyed by demo id. */
export const demoSources: Readonly<Record<string, string>> = {
    'blended-blob': blendedBlobSource,
    'smooth-morph': smoothMorphSource,
    'gyroid-surface': gyroidSurfaceSource,
    'hollow-frame': hollowFrameSource,
    'twisted-column': twistedColumnSource,
    'loft-tower': loftTowerSource,
    'revolved-vase': revolvedVaseSource,
    'wavy-slab': wavySlabSource,
    'lattice-cube': latticeCubeSource,
    'polar-gear': polarGearSource,
    'text-badge': textBadgeSource,
    'raw-escape': rawEscapeSource,
};

export function getDemoSource(id: string): string {
    return demoSources[id] ?? '';
}
