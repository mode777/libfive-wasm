/** The libfive surface areas the gallery aims to cover. */
export const SECTIONS = [
    'csg',
    'shapes',
    'transforms',
    'text',
    'arrays',
    'eval',
    'math',
    'raw',
] as const;

export type Section = (typeof SECTIONS)[number];

export const SECTION_LABELS: Readonly<Record<Section, string>> = {
    csg: 'CSG',
    shapes: 'Shapes',
    transforms: 'Transforms',
    text: 'Text',
    arrays: 'Arrays',
    eval: 'Eval',
    math: 'Math',
    raw: 'Raw',
};
