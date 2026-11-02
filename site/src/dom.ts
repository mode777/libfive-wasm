export function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    text?: string,
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

export function featureList(features: readonly string[]): HTMLUListElement {
    const list = el('ul', 'feature-list');
    list.setAttribute('aria-label', 'libfive features used by this demo');
    for (const feature of features) {
        list.append(el('li', 'feature-chip', feature));
    }
    return list;
}
