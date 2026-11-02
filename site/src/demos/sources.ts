import blendedBlobSource from './blended-blob?raw';
import blendCatalogSource from './blend-catalog?raw';
import clockFaceSource from './clock-face?raw';
import deformationsSource from './deformations?raw';
import displacedPebbleSource from './displaced-pebble?raw';
import enclosureSource from './enclosure?raw';
import evalInspectionSource from './eval-inspection?raw';
import fieldMathSource from './field-math?raw';
import gyroidSurfaceSource from './gyroid-surface?raw';
import hollowFrameSource from './hollow-frame?raw';
import latticeCubeSource from './lattice-cube?raw';
import legoBrickSource from './lego-brick?raw';
import loftTowerSource from './loft-tower?raw';
import pillowBlockSource from './pillow-block?raw';
import primitivesZooSource from './primitives-zoo?raw';
import rookSource from './rook?raw';
import screwThreadSource from './screw-thread?raw';
import symmetryLabSource from './symmetry-lab?raw';
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
    'lego-brick': legoBrickSource,
    enclosure: enclosureSource,
    'pillow-block': pillowBlockSource,
    'clock-face': clockFaceSource,
    rook: rookSource,
    'screw-thread': screwThreadSource,
    'displaced-pebble': displacedPebbleSource,
    'text-badge': textBadgeSource,
    'primitives-zoo': primitivesZooSource,
    'blend-catalog': blendCatalogSource,
    'symmetry-lab': symmetryLabSource,
    deformations: deformationsSource,
    'field-math': fieldMathSource,
    'eval-inspection': evalInspectionSource,
    'raw-escape': rawEscapeSource,
};

export function getDemoSource(id: string): string {
    return demoSources[id] ?? '';
}
