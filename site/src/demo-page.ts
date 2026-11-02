import { renderFooter, renderHeader } from './chrome';
import { highlightSource } from './code-view';
import type { DemoEntry } from './demos';
import { getDemoSource } from './demos/sources';
import { el, featureList } from './dom';
import { Viewport } from './viewport';
import type { MeshClient } from './worker-client';
import type { DemoMesh } from './worker/run-demo';

type Tab = '3d' | 'code';

function formatVector(values: readonly unknown[]): string {
    return values.map((value) => String(value)).join(', ');
}

export class DemoPage {
    readonly element: HTMLElement;

    private readonly demo: DemoEntry;
    private readonly source: string;
    private readonly client: MeshClient;
    private readonly panels: Record<Tab, HTMLElement>;
    private readonly tabs: Record<Tab, HTMLButtonElement>;
    private readonly status: HTMLElement;
    private readonly stats: HTMLElement;
    private readonly stlButton: HTMLButtonElement;
    private readonly copyButton: HTMLButtonElement;
    private readonly wireframeButton: HTMLButtonElement;
    private readonly flatButton: HTMLButtonElement;
    private readonly schemeForm: HTMLElement;
    private readonly probeButton: HTMLButtonElement;
    private readonly probeResult: HTMLElement;

    private viewport: Viewport | null = null;
    private mesh: DemoMesh | null = null;
    private activeTab: Tab = '3d';
    private loadToken = 0;
    private disposed = false;

    constructor(demo: DemoEntry, client: MeshClient) {
        this.demo = demo;
        this.source = getDemoSource(demo.meta.id);
        this.client = client;

        this.element = el('div', 'page');
        const main = el('main', 'demo-layout');
        const stage = el('section', 'demo-stage');
        stage.setAttribute('aria-label', `${demo.meta.title} demo`);

        const tabBar = el('div', 'demo-tabs');
        tabBar.setAttribute('role', 'tablist');
        tabBar.setAttribute('aria-label', 'Demo views');

        this.tabs = {
            '3d': el('button', 'demo-tab is-active', '3D'),
            code: el('button', 'demo-tab', 'Code'),
        };
        this.panels = {
            '3d': el('div', 'viewport-host'),
            code: el('div', 'code-host'),
        };

        for (const tab of ['3d', 'code'] as const) {
            const button = this.tabs[tab];
            const panel = this.panels[tab];
            button.type = 'button';
            button.setAttribute('role', 'tab');
            button.id = `tab-${tab}`;
            button.setAttribute('aria-controls', `panel-${tab}`);
            button.setAttribute('aria-selected', String(tab === '3d'));
            button.tabIndex = tab === '3d' ? 0 : -1;
            panel.id = `panel-${tab}`;
            panel.setAttribute('role', 'tabpanel');
            panel.setAttribute('aria-labelledby', `tab-${tab}`);
            panel.hidden = tab !== '3d';
            button.addEventListener('click', () => this.setTab(tab));
            button.addEventListener('keydown', (event) =>
                this.onTabKey(event, tab),
            );
            tabBar.append(button);
        }

        const codeToolbar = el('div', 'code-toolbar');
        codeToolbar.append(el('span', 'code-filename', `${demo.meta.id}.ts`));
        this.copyButton = el('button', 'code-copy', 'Copy');
        this.copyButton.type = 'button';
        this.copyButton.addEventListener('click', () => {
            void this.copySource();
        });
        codeToolbar.append(this.copyButton);

        const code = el('code', 'hljs language-typescript');
        code.innerHTML = highlightSource(this.source);
        const pre = el('pre', 'code-pre');
        pre.append(code);
        this.panels.code.append(codeToolbar, pre);

        this.status = el('div', 'status-overlay');
        this.status.setAttribute('role', 'status');
        this.status.setAttribute('aria-live', 'polite');

        const body = el('div', 'demo-stage-body');
        body.append(this.panels['3d'], this.panels.code, this.status);

        const metaBar = el('div', 'demo-meta-bar');
        this.stats = el('div', 'demo-stats', 'Waiting for the mesh…');
        this.stlButton = el('button', 'stl-button', 'Download STL');
        this.stlButton.type = 'button';
        this.stlButton.disabled = true;
        this.stlButton.addEventListener('click', () => {
            void this.downloadStl();
        });
        metaBar.append(this.stats, this.stlButton);

        stage.append(tabBar, body, metaBar);

        const aside = el('aside', 'demo-aside');
        const back = el('a', 'back-link', 'Back to all demos');
        back.href = '#/';
        aside.append(
            back,
            el('p', 'eyebrow', 'Demo'),
            el('h1', 'demo-title', demo.meta.title),
            el('p', 'demo-description', demo.meta.description),
            featureList(demo.meta.features),
        );

        const facts = el('dl', 'demo-facts');
        for (const [label, value] of [
            [
                'Region',
                `${formatVector(demo.meta.region.min)}  to  ${formatVector(demo.meta.region.max)}`,
            ],
            ['Resolution', String(demo.meta.res)],
            ['Source', 'shown in the Code tab'],
        ] as const) {
            const group = el('div', 'demo-fact');
            group.append(el('dt', '', label), el('dd', '', value));
            facts.append(group);
        }

        const inspector = el('section', 'inspector');
        inspector.append(el('h2', 'inspector-title', 'Inspector'));
        const toggles = el('div', 'inspector-toggles');
        this.wireframeButton = el('button', 'inspector-toggle', 'Wireframe');
        this.flatButton = el('button', 'inspector-toggle', 'Flat');
        for (const [button, apply] of [
            [this.wireframeButton, (on: boolean) => this.viewport?.setWireframe(on)],
            [this.flatButton, (on: boolean) => this.viewport?.setFlatShading(on)],
        ] as const) {
            button.type = 'button';
            button.setAttribute('aria-pressed', 'false');
            button.addEventListener('click', () => {
                const next = button.getAttribute('aria-pressed') !== 'true';
                button.setAttribute('aria-pressed', String(next));
                button.classList.toggle('is-active', next);
                apply(next);
            });
            toggles.append(button);
        }
        inspector.append(toggles);

        const tree = el('details', 'inspector-tree');
        tree.append(el('summary', '', 'Scheme form'));
        this.schemeForm = el('pre', 'scheme-form', 'Mesh the demo to see its tree.');
        tree.append(this.schemeForm);
        inspector.append(tree);

        const probe = el('div', 'inspector-probe');
        this.probeButton = el('button', 'probe-button', 'Probe center');
        this.probeButton.type = 'button';
        this.probeButton.disabled = true;
        this.probeButton.addEventListener('click', () => {
            void this.runProbe();
        });
        this.probeResult = el(
            'p',
            'probe-result',
            'Probe the region center with evalF/evalD.',
        );
        this.probeResult.setAttribute('aria-live', 'polite');
        probe.append(this.probeButton, this.probeResult);
        inspector.append(probe);

        aside.append(facts, inspector);

        main.append(stage, aside);
        this.element.append(renderHeader(), main, renderFooter());
    }

    /** Starts the viewport and kicks off the first mesh. */
    mount(): void {
        try {
            this.viewport = new Viewport(this.panels['3d']);
        } catch (err) {
            this.showError(err);
            return;
        }
        this.load();
    }

    dispose(): void {
        this.disposed = true;
        this.loadToken += 1;
        this.viewport?.dispose();
        this.viewport = null;
    }

    private setTab(tab: Tab): void {
        if (this.activeTab === tab) return;
        this.activeTab = tab;
        for (const key of ['3d', 'code'] as const) {
            const selected = key === tab;
            this.tabs[key].classList.toggle('is-active', selected);
            this.tabs[key].setAttribute('aria-selected', String(selected));
            this.tabs[key].tabIndex = selected ? 0 : -1;
            this.panels[key].hidden = !selected;
        }
        this.viewport?.setActive(tab === '3d');
    }

    private onTabKey(event: KeyboardEvent, tab: Tab): void {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        const next: Tab = tab === '3d' ? 'code' : '3d';
        this.setTab(next);
        this.tabs[next].focus();
    }

    private load(): void {
        if (this.disposed) return;
        const token = ++this.loadToken;
        this.showLoading();
        this.stats.textContent = 'Meshing…';
        this.stlButton.disabled = true;
        this.probeButton.disabled = true;

        this.client
            .mesh(this.demo.meta.id)
            .then((mesh) => {
                if (this.disposed || token !== this.loadToken) return;
                this.mesh = mesh;
                this.viewport?.setMesh(mesh);
                this.stats.textContent =
                    `${mesh.triCount.toLocaleString()} triangles · ` +
                    `${mesh.vertCount.toLocaleString()} vertices · ` +
                    `${Math.round(mesh.durationMs).toLocaleString()} ms`;
                this.schemeForm.textContent = mesh.expression;
                this.resetInspector();
                this.stlButton.disabled = false;
                this.probeButton.disabled = false;
                this.hideStatus();
            })
            .catch((err: unknown) => {
                if (this.disposed || token !== this.loadToken) return;
                this.showError(err);
            });
    }

    private resetInspector(): void {
        for (const button of [this.wireframeButton, this.flatButton]) {
            button.setAttribute('aria-pressed', 'false');
            button.classList.remove('is-active');
        }
        this.viewport?.setWireframe(false);
        this.viewport?.setFlatShading(false);
        this.probeResult.textContent =
            'Probe the region center with evalF/evalD.';
    }

    private async runProbe(): Promise<void> {
        if (!this.mesh) return;
        const { min, max } = this.demo.meta.region;
        const center = [0, 1, 2].map(
            (axis) => (Number(min[axis]) + Number(max[axis])) / 2,
        ) as [number, number, number];

        this.probeButton.disabled = true;
        this.probeResult.textContent = 'Evaluating…';
        try {
            const { value, gradient } = await this.client.probe(center);
            this.probeResult.textContent =
                `f = ${value.toFixed(4)} · ` +
                `grad = (${gradient.map((component) => component.toFixed(3)).join(', ')})`;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.probeResult.textContent = `Probe failed: ${message}`;
        } finally {
            this.probeButton.disabled = !this.mesh || this.disposed;
        }
    }

    private async downloadStl(): Promise<void> {
        if (!this.mesh) return;
        const label = this.stlButton.textContent ?? 'Download STL';
        this.stlButton.disabled = true;
        this.stlButton.textContent = 'Preparing…';
        try {
            const { buffer } = await this.client.stl();
            const blob = new Blob([buffer], { type: 'model/stl' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${this.demo.meta.id}.stl`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) {
            this.showError(err);
        } finally {
            this.stlButton.textContent = label;
            this.stlButton.disabled = !this.mesh || this.disposed;
        }
    }

    private async copySource(): Promise<void> {
        try {
            await navigator.clipboard.writeText(this.source);
            this.setCopyLabel('Copied');
        } catch {
            this.setCopyLabel('Copy failed');
        }
    }

    private setCopyLabel(label: string): void {
        this.copyButton.textContent = label;
        setTimeout(() => {
            if (!this.disposed) this.copyButton.textContent = 'Copy';
        }, 1600);
    }

    private showLoading(): void {
        this.status.className = 'status-overlay is-visible';
        const card = el('div', 'status-card');
        card.append(
            el('span', 'status-spinner'),
            el('span', 'status-label', 'Meshing the model…'),
        );
        this.status.replaceChildren(card);
    }

    private showError(err: unknown): void {
        const message = err instanceof Error ? err.message : String(err);
        this.status.className = 'status-overlay is-visible is-error';
        const card = el('div', 'status-card');
        card.append(
            el('p', 'status-title', 'Meshing failed'),
            el('p', 'status-message', message),
        );
        const retry = el('button', 'retry-button', 'Try again');
        retry.type = 'button';
        retry.addEventListener('click', () => this.load());
        card.append(retry);
        this.status.replaceChildren(card);
        this.stats.textContent = 'No mesh';
        this.stlButton.disabled = true;
        this.probeButton.disabled = true;
        this.schemeForm.textContent = 'No tree available.';
    }

    private hideStatus(): void {
        this.status.className = 'status-overlay';
        this.status.replaceChildren();
    }
}
