import { renderFooter, renderHeader } from './chrome';
import { demos } from './demos';
import { SECTION_LABELS, SECTIONS, type Section } from './demos/sections';
import { el, featureList } from './dom';
import type { DemoEntry } from './demos';

const ACCENTS = [
    '#b5522a',
    '#6f5940',
    '#4e6a5d',
    '#8a5d76',
    '#9a6b2f',
    '#4f647c',
];

const previewUrls = import.meta.glob('./assets/previews/*.webp', {
    eager: true,
    query: '?url',
    import: 'default',
}) as Record<string, string>;

const previewById = new Map(
    Object.entries(previewUrls).map(([file, url]) => {
        const name = file.split('/').pop() ?? '';
        return [name.replace(/\.webp$/, ''), url] as const;
    }),
);

function demoCard(demo: DemoEntry, index: number): HTMLElement {
    const card = el('a', 'demo-card');
    card.href = `#/p/${encodeURIComponent(demo.meta.id)}`;
    card.dataset.sections = demo.meta.sections.join(' ');
    card.style.setProperty(
        '--card-accent',
        ACCENTS[index % ACCENTS.length] ?? ACCENTS[0]!,
    );

    const visual = el('div', 'demo-card-visual');
    visual.setAttribute('aria-hidden', 'true');
    const preview = previewById.get(demo.meta.id);
    if (preview) {
        const image = el('img', 'demo-card-image');
        image.src = preview;
        image.alt = '';
        image.width = 1280;
        image.height = 800;
        image.loading = 'lazy';
        image.decoding = 'async';
        visual.append(image);
    } else {
        visual.append(el('span', 'demo-card-orb'));
    }
    visual.append(
        el('span', 'demo-card-ordinal', String(index + 1).padStart(2, '0')),
        el('span', 'demo-card-mark', demo.meta.features[0] ?? 'shape'),
    );

    const body = el('div', 'demo-card-body');
    body.append(
        el(
            'p',
            'demo-card-sections',
            demo.meta.sections
                .map((section) => SECTION_LABELS[section])
                .join(' · '),
        ),
        el('h2', 'demo-card-title', demo.meta.title),
        el('p', 'demo-card-description', demo.meta.description),
        featureList(demo.meta.features),
    );

    card.append(visual, body);
    return card;
}

export function renderGallery(): HTMLElement {
    const page = el('div', 'page');

    const main = el('main', 'gallery-main');
    const hero = el('section', 'hero');
    const copy = el('div', 'hero-copy');
    copy.append(
        el('p', 'eyebrow', 'Showcase'),
        el('h1', 'hero-title', 'Solid modeling, in the browser.'),
        el(
            'p',
            'hero-lede',
            `${demos.length} small programs, one WebAssembly kernel. Explore the demos, orbit the meshes, and read the exact source that produced each one.`,
        ),
    );

    const facts = el('dl', 'hero-facts');
    for (const [label, value] of [
        ['kernel', 'libfive'],
        ['runtime', 'WebAssembly'],
        ['license', 'MPL-2.0'],
        ['builds', `${demos.length} demos`],
    ] as const) {
        const group = el('div', 'hero-fact');
        group.append(el('dt', '', label), el('dd', '', value));
        facts.append(group);
    }
    hero.append(copy, facts);

    const filterBar = el('div', 'filter-bar');
    filterBar.setAttribute('role', 'group');
    filterBar.setAttribute('aria-label', 'Filter demos by section');

    const grid = el('section', 'demo-grid');
    grid.setAttribute('aria-label', 'Demos');
    for (const [index, demo] of demos.entries()) {
        grid.append(demoCard(demo, index));
    }

    const empty = el('p', 'gallery-empty', 'No demos match this section.');
    empty.hidden = true;

    const cards = Array.from(grid.children) as HTMLElement[];
    const buttons: HTMLButtonElement[] = [];

    const applyFilter = (section: Section | null): void => {
        for (const [index, button] of buttons.entries()) {
            const buttonSection = index === 0 ? null : SECTIONS[index - 1]!;
            const pressed = buttonSection === section;
            button.setAttribute('aria-pressed', String(pressed));
            button.classList.toggle('is-active', pressed);
        }
        for (const card of cards) {
            const sections = (card.dataset.sections ?? '').split(' ');
            card.hidden = section !== null && !sections.includes(section);
        }
        empty.hidden = cards.some((card) => !card.hidden);
    };

    const filterButton = (
        label: string,
        section: Section | null,
    ): HTMLButtonElement => {
        const button = el('button', 'filter-button', label);
        button.type = 'button';
        button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', () => applyFilter(section));
        buttons.push(button);
        filterBar.append(button);
        return button;
    };

    filterButton('All', null);
    for (const section of SECTIONS) {
        filterButton(SECTION_LABELS[section], section);
    }
    applyFilter(null);

    main.append(hero, filterBar, grid, empty);
    page.append(renderHeader(), main, renderFooter());
    return page;
}
