export type Route =
    | { kind: 'gallery' }
    | { kind: 'demo'; id: string; preview: boolean }
    | { kind: 'docs'; slug: string | null; to: string | null }
    | { kind: 'not-found'; path: string };

/** Parses `#/`, `#/p/<id>?preview=1` and `#/docs[/<slug>][?to=<anchor>]`. */
export function parseRoute(hash: string): Route {
    const raw = hash.replace(/^#/, '');
    const [pathPart = '/', queryString = ''] = raw.split('?');
    const path = pathPart === '' ? '/' : pathPart;
    if (path === '/') return { kind: 'gallery' };

    const demo = /^\/p\/([^/]+)\/?$/.exec(path);
    if (demo?.[1]) {
        const query = new URLSearchParams(queryString);
        return {
            kind: 'demo',
            id: decodeURIComponent(demo[1]),
            preview: query.get('preview') === '1',
        };
    }

    const docs = /^\/docs(?:\/(.+?))?\/?$/.exec(path);
    if (docs) {
        const query = new URLSearchParams(queryString);
        return {
            kind: 'docs',
            slug: docs[1] ? decodeURIComponent(docs[1]) : null,
            to: query.get('to'),
        };
    }

    return { kind: 'not-found', path };
}

export function navigate(path: string): void {
    const target = `#${path}`;
    if (window.location.hash !== target) window.location.hash = target;
}

export function startRouter(onRoute: (route: Route) => void): () => void {
    const handle = (): void => onRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', handle);
    handle();
    return () => window.removeEventListener('hashchange', handle);
}
