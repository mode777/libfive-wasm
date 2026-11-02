import { docsNav, docsPages } from './docs/generated/content';
import { el } from './dom';
import { renderFooter, renderHeader } from './chrome';
// Same code theme as the demo Code tab (see code-view.ts); Vite dedupes it.
import 'highlight.js/styles/atom-one-dark.css';

/**
 * The documentation section: a persistent sidebar plus either the landing
 * page (slug `null`) or one rendered content page. Content is pre-rendered
 * HTML from the generated docs module — this component only supplies the
 * layout, navigation and anchor scrolling.
 */
export function hasDocsPage(slug: string): boolean {
    return docsPages.some((entry) => entry.slug === slug);
}

export class DocsPage {
    readonly element: HTMLElement;
    private readonly anchor: string | null;

    constructor(slug: string | null, to: string | null) {
        this.anchor = to;
        const page = el('div', 'page');
        const main = el('main', 'docs-main');
        const layout = el('div', 'docs-layout');

        layout.append(this.renderSidebar(slug));
        layout.append(slug === null ? this.renderLanding() : this.renderArticle(slug));

        main.append(layout);
        page.append(renderHeader(), main, renderFooter());
        this.element = page;
    }

    /** Scrolls to the `?to=` anchor after the route has painted. */
    mount(): void {
        if (this.anchor === null) return;
        const target = this.element.querySelector(`#${CSS.escape(this.anchor)}`);
        target?.scrollIntoView({ block: 'start' });
    }

    /** No resources to release: content is static. */
    dispose(): void {}

    private renderSidebar(activeSlug: string | null): HTMLElement {
        const sidebar = el('nav', 'docs-sidebar');
        sidebar.setAttribute('aria-label', 'Documentation');

        const home = el('a', 'docs-nav-link docs-nav-home', 'Documentation');
        home.href = '#/docs/';
        if (activeSlug === null) home.classList.add('is-active');
        sidebar.append(home);

        for (const section of docsNav) {
            const group = el('div', 'docs-nav-section');
            group.append(el('p', 'docs-nav-label', section.label));
            for (const entry of section.entries) {
                const link = el('a', 'docs-nav-link', entry.title);
                link.href = `#/docs/${entry.slug}`;
                if (entry.slug === activeSlug) link.classList.add('is-active');
                group.append(link);
            }
            sidebar.append(group);
        }
        return sidebar;
    }

    private renderLanding(): HTMLElement {
        const article = el('article', 'docs-article docs-landing');
        article.append(
            el('p', 'eyebrow', 'Documentation'),
            el('h1', 'docs-title', 'Learn libfive-wasm.'),
            el(
                'p',
                'docs-lede',
                'Guides for getting started, the concepts behind functional-representation ' +
                    'modeling, and the full API reference — generated from the package source.',
            ),
        );
        for (const section of docsNav) {
            const card = el('section', 'docs-landing-section');
            card.append(el('h2', 'docs-section-title', section.label));
            const list = el('ul', 'docs-landing-list');
            for (const entry of section.entries) {
                const item = el('li', 'docs-landing-item');
                const link = el('a', 'docs-landing-link', entry.title);
                link.href = `#/docs/${entry.slug}`;
                item.append(link);
                list.append(item);
            }
            card.append(list);
            article.append(card);
        }
        return article;
    }

    private renderArticle(slug: string): HTMLElement {
        const content = docsPages.find((entry) => entry.slug === slug);
        if (!content) {
            const missing = el('article', 'docs-article');
            missing.append(
                el('p', 'eyebrow', 'Documentation'),
                el('h1', 'docs-title', 'Page not found.'),
                el(
                    'p',
                    'docs-lede',
                    `No documentation page lives at "#/docs/${slug}". Pick one from the sidebar.`,
                ),
            );
            return missing;
        }
        const article = el('article', 'docs-article docs-prose');
        article.id = 'docs-article';
        article.innerHTML = content.html;
        return article;
    }
}
