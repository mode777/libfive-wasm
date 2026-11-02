import { renderFooter, renderHeader } from "./chrome";
import { demos } from "./demos";
import { el, featureList } from "./dom";
import type { DemoEntry } from "./demos";

const ACCENTS = ["#b5522a", "#6f5940", "#4e6a5d", "#8a5d76"];

function demoCard(demo: DemoEntry, index: number): HTMLElement {
  const card = el("a", "demo-card");
  card.href = `#/p/${encodeURIComponent(demo.meta.id)}`;
  card.style.setProperty(
    "--card-accent",
    ACCENTS[index % ACCENTS.length] ?? ACCENTS[0]!,
  );

  const visual = el("div", "demo-card-visual");
  visual.setAttribute("aria-hidden", "true");
  visual.append(
    el("span", "demo-card-ordinal", String(index + 1).padStart(2, "0")),
    el("span", "demo-card-orb"),
    el("span", "demo-card-mark", demo.meta.features[0] ?? "shape"),
  );

  const body = el("div", "demo-card-body");
  body.append(
    el("h2", "demo-card-title", demo.meta.title),
    el("p", "demo-card-description", demo.meta.description),
    featureList(demo.meta.features),
  );

  card.append(visual, body);
  return card;
}

export function renderGallery(): HTMLElement {
  const page = el("div", "page");

  const main = el("main", "gallery-main");
  const hero = el("section", "hero");
  const copy = el("div", "hero-copy");
  copy.append(
    el("p", "eyebrow", "Showcase"),
    el("h1", "hero-title", "Solid modeling, in the browser."),
    el(
      "p",
      "hero-lede",
      "Four small programs, one WebAssembly kernel. Explore the demos, orbit the meshes, and read the exact source that produced each one.",
    ),
  );

  const facts = el("dl", "hero-facts");
  for (const [label, value] of [
    ["kernel", "libfive"],
    ["runtime", "WebAssembly"],
    ["license", "MPL-2.0"],
    ["builds", `${demos.length} demos`],
  ] as const) {
    const group = el("div", "hero-fact");
    group.append(el("dt", "", label), el("dd", "", value));
    facts.append(group);
  }
  hero.append(copy, facts);

  const grid = el("section", "demo-grid");
  grid.setAttribute("aria-label", "Demos");
  for (const [index, demo] of demos.entries()) {
    grid.append(demoCard(demo, index));
  }

  main.append(hero, grid);
  page.append(renderHeader(), main, renderFooter());
  return page;
}
