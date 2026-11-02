/*
 * libfive-wasm tests: validate the user documentation content (AD-029).
 *
 * Source-level checks over the checked-in docs content: the nav manifest
 * matches the guide files, and every intra-docs link — including heading
 * anchors — resolves. Links into the generated API section are validated
 * against its path shape only (the files are absent from clean checkouts;
 * their existence is enforced by the site build, where `npm run docs:check`
 * fails the deploy on unresolved links). TypeScript example fences are
 * typechecked by the harness in tests/support/docs-examples.ts.
 *
 * Copyright (C) 2026  libfive-wasm contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { extractExamples, typecheckExamples } from './support/docs-examples.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(repoRoot, 'site', 'docs-content');
const guidesDir = path.join(contentDir, 'guides');

interface NavSection {
    id: string;
    label: string;
    pages: string[];
}

interface NavManifest {
    sections: NavSection[];
}

function readNav(): NavManifest {
    return JSON.parse(readFileSync(path.join(contentDir, 'nav.json'), 'utf8')) as NavManifest;
}

function guideFiles(): string[] {
    return readdirSync(guidesDir)
        .filter((name) => name.endsWith('.md'))
        .sort();
}

/** Mirrors slugifyHeading in site/scripts/build-docs.mjs for plain headings. */
function slugifyHeading(text: string): string {
    const stripped = text.replace(/[`*_]/g, '');
    const slug = stripped
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug === '' ? 'section' : slug;
}

function headingSlugs(markdown: string): Set<string> {
    const slugs = new Set<string>();
    for (const match of markdown.matchAll(/^#{1,6}\s+(.+)$/gm)) {
        slugs.add(slugifyHeading(match[1] ?? ''));
    }
    return slugs;
}

const guideSet = new Set(guideFiles());

describe('docs navigation manifest', () => {
    it('lists sections with labels', () => {
        const nav = readNav();
        expect(nav.sections.length).toBeGreaterThan(0);
        for (const section of nav.sections) {
            expect(section.label.trim()).not.toBe('');
            expect(section.pages.length).toBeGreaterThan(0);
        }
    });

    it('resolves every listed page to a guide file', () => {
        for (const section of readNav().sections) {
            for (const slug of section.pages) {
                expect(
                    guideSet.has(`${slug}.md`),
                    `nav.json lists "${slug}" but guides/${slug}.md is missing`,
                ).toBe(true);
            }
        }
    });

    it('lists every guide file', () => {
        const listed = new Set(readNav().sections.flatMap((section) => section.pages));
        for (const file of guideSet) {
            const slug = file.replace(/\.md$/, '');
            expect(listed.has(slug), `guides/${file} is not listed in nav.json`).toBe(true);
        }
    });

    it('keeps the spec-mandated guide set present', () => {
        // showcase-docs spec: overview + getting started, the concept set,
        // and the three.js integration article.
        for (const slug of [
            'overview',
            'getting-started',
            'mesh-resolution',
            'shape-api',
            'memory-lifecycle',
            'evaluation',
            'workers',
            'bundlers',
            'three-js-integration',
        ]) {
            expect(guideSet.has(`${slug}.md`), `missing required guide ${slug}.md`).toBe(true);
        }
    });
});

describe('intra-docs links', () => {
    interface LinkRef {
        href: string;
        target: string;
        anchor: string | null;
    }

    function linksIn(markdown: string): LinkRef[] {
        const refs: LinkRef[] = [];
        for (const match of markdown.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
            const href = match[1] ?? '';
            if (/^(https?:|mailto:)/.test(href)) continue;
            const [target = '', anchor = ''] = href.split('#');
            refs.push({ href, target, anchor: anchor === '' ? null : anchor });
        }
        return refs;
    }

    it('resolves every relative markdown link to a guide or API page', () => {
        const problems: string[] = [];
        for (const file of guideSet) {
            const sourcePath = path.join(guidesDir, file);
            const markdown = readFileSync(sourcePath, 'utf8');
            for (const { href, target, anchor } of linksIn(markdown)) {
                if (target === '') continue; // same-page anchor, checked below
                const resolved = path.resolve(guidesDir, target);
                const key = path.relative(contentDir, resolved);
                if (!resolved.endsWith('.md')) {
                    problems.push(`${file}: "${href}" does not point at markdown`);
                    continue;
                }
                if (key.startsWith('api/')) {
                    // Generated TypeDoc markdown is absent from clean
                    // checkouts; its existence and links are enforced by the
                    // site build (`docs:check` fails the deploy). Here, only
                    // the checked-in shape is verified.
                    if (!/^api\/(index|classes\/[^/]+|functions\/[^/]+|interfaces\/[^/]+|type-aliases\/[^/]+)\.md$/.test(key)) {
                        problems.push(`${file}: "${href}" is not a valid API reference path (${key})`);
                    }
                    continue;
                }
                if (!existsSync(resolved)) {
                    problems.push(`${file}: "${href}" does not resolve (${key})`);
                    continue;
                }
                if (anchor !== null) {
                    const targetMarkdown = readFileSync(resolved, 'utf8');
                    if (!headingSlugs(targetMarkdown).has(anchor)) {
                        problems.push(`${file}: "${href}" anchor #${anchor} not found`);
                    }
                }
            }
        }
        expect(problems, problems.join('\n')).toEqual([]);
    });

    it('resolves same-page anchors to headings of the same file', () => {
        const problems: string[] = [];
        for (const file of guideSet) {
            const markdown = readFileSync(path.join(guidesDir, file), 'utf8');
            const slugs = headingSlugs(markdown);
            for (const { href, target, anchor } of linksIn(markdown)) {
                if (target !== '' || anchor === null) continue;
                if (!slugs.has(anchor)) {
                    problems.push(`${file}: "${href}" anchor #${anchor} not found`);
                }
            }
        }
        expect(problems, problems.join('\n')).toEqual([]);
    });
});

describe('docs examples', () => {
    it('typechecks every ```ts fence against the public types', () => {
        const examples = extractExamples();
        // The spec-mandated guides must actually contain checked examples.
        expect(examples.length).toBeGreaterThan(5);
        const result = typecheckExamples(examples);
        expect(result.checked).toBeGreaterThan(5);
        if (result.skippedThree > 0) {
            console.warn(
                `docs examples: skipped ${result.skippedThree} three.js fence(s) — ` +
                    'site/node_modules/three is not installed',
            );
        }
    });
});
