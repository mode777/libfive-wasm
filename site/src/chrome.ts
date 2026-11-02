import { demos } from './demos';
import { el } from './dom';

const REPO_URL = 'https://github.com/mode777/libfive-wasm';

export function renderHeader(): HTMLElement {
    const header = el('header', 'site-header');

    const brand = el('a', 'brand');
    brand.href = '#/';
    brand.append(
        el('span', 'brand-main', 'libfive'),
        el('span', 'brand-accent', '-wasm'),
    );

    const nav = el('nav', 'site-nav');
    nav.setAttribute('aria-label', 'Project links');
    const repo = el('a', 'nav-link', 'GitHub');
    repo.href = REPO_URL;
    const docs = el('a', 'nav-link', 'Docs');
    docs.href = '#/docs/';
    nav.append(repo, docs);

    header.append(brand, nav);
    return header;
}

export function renderFooter(): HTMLElement {
    const footer = el('footer', 'site-footer');
    footer.append(
        el('span', '', 'MPL-2.0 kernel and bindings'),
        el('span', '', `${demos.length} demos · wasm in the browser`),
        el('span', '', 'Showcase · not part of the npm package'),
    );
    return footer;
}
