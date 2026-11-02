import { renderFooter, renderHeader } from './chrome';
import { el } from './dom';

export function renderNotFound(path: string): HTMLElement {
    const page = el('div', 'page');
    const main = el('main', 'not-found');
    const back = el('a', 'back-link', 'Back to all demos');
    back.href = '#/';
    main.append(
        el('p', 'eyebrow', '404'),
        el('h1', 'not-found-title', 'That demo does not exist.'),
        el(
            'p',
            'not-found-path',
            path === ''
                ? 'The requested route was empty.'
                : `No demo matches “${path}”.`,
        ),
        back,
    );
    page.append(renderHeader(), main, renderFooter());
    return page;
}
