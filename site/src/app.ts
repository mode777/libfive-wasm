import { getDemo } from './demos';
import { renderGallery } from './gallery';
import { el } from './dom';
import { renderNotFound } from './not-found';
import { startRouter } from './router';
import type { Route } from './router';
import { MeshClient } from './worker-client';
import type { DemoPage } from './demo-page';

export function startApp(root: HTMLElement): void {
    let client: MeshClient | null = null;
    let page: DemoPage | null = null;
    let routeToken = 0;

    const getClient = (): MeshClient => (client ??= new MeshClient());

    const show = (route: Route): void => {
        const token = ++routeToken;
        page?.dispose();
        page = null;
        root.replaceChildren();

        if (route.kind === 'gallery') {
            root.append(renderGallery());
        } else if (route.kind === 'demo') {
            const demo = getDemo(route.id);
            if (!demo) {
                root.append(renderNotFound(route.id));
            } else {
                root.append(el('div', 'page-loading', 'Loading demo…'));
                void import('./demo-page.js')
                    .then(({ DemoPage }) => {
                        if (token !== routeToken) return;
                        const instance = new DemoPage(demo, getClient(), {
                            preview: route.preview,
                        });
                        page = instance;
                        root.replaceChildren(instance.element);
                        instance.mount();
                    })
                    .catch(() => {
                        if (token !== routeToken) return;
                        root.replaceChildren(
                            renderNotFound('The demo page could not be loaded.'),
                        );
                    });
            }
        } else {
            root.append(renderNotFound(route.path));
        }

        window.scrollTo(0, 0);
    };

    const stopRouter = startRouter(show);
    window.addEventListener(
        'beforeunload',
        () => {
            stopRouter();
            client?.dispose();
        },
        { once: true },
    );
}
