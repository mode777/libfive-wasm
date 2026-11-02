import { getDemo } from "./demos";
import { DemoPage } from "./demo-page";
import { renderGallery } from "./gallery";
import { renderNotFound } from "./not-found";
import { startRouter } from "./router";
import type { Route } from "./router";
import { MeshClient } from "./worker-client";

export function startApp(root: HTMLElement): void {
  const client = new MeshClient();
  let page: DemoPage | null = null;

  const show = (route: Route): void => {
    page?.dispose();
    page = null;
    root.replaceChildren();

    if (route.kind === "gallery") {
      root.append(renderGallery());
    } else if (route.kind === "demo") {
      const demo = getDemo(route.id);
      if (demo) {
        page = new DemoPage(demo, client);
        root.append(page.element);
        page.mount();
      } else {
        root.append(renderNotFound(route.id));
      }
    } else {
      root.append(renderNotFound(route.path));
    }

    window.scrollTo(0, 0);
  };

  const stopRouter = startRouter(show);
  window.addEventListener(
    "beforeunload",
    () => {
      stopRouter();
      client.dispose();
    },
    { once: true },
  );
}
