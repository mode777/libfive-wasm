export type Route =
  | { kind: "gallery" }
  | { kind: "demo"; id: string }
  | { kind: "not-found"; path: string };

/** Parses `#/` and `#/p/<id>`; anything else is a not-found route. */
export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#/, "");
  const path = raw === "" ? "/" : raw;
  if (path === "/") return { kind: "gallery" };

  const match = /^\/p\/([^/]+)\/?$/.exec(path);
  if (match?.[1]) {
    return { kind: "demo", id: decodeURIComponent(match[1]) };
  }
  return { kind: "not-found", path };
}

export function navigate(path: string): void {
  const target = `#${path}`;
  if (window.location.hash !== target) window.location.hash = target;
}

export function startRouter(onRoute: (route: Route) => void): () => void {
  const handle = (): void => onRoute(parseRoute(window.location.hash));
  window.addEventListener("hashchange", handle);
  handle();
  return () => window.removeEventListener("hashchange", handle);
}
