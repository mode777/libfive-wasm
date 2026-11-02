import type { Vec3Arg } from 'libfive-wasm';
import type { WorkerRequest, WorkerResponse } from './worker/protocol';
import type { DemoMesh, DemoProbe } from './worker/run-demo';

interface Pending {
    resolve: (response: WorkerResponse) => void;
    reject: (error: Error) => void;
}

type RequestBody =
    | { type: 'mesh'; demoId: string }
    | { type: 'stl' }
    | { type: 'probe'; point: Vec3Arg };

/**
 * Promise-based wrapper around the mesh worker. Requests are serialized by the
 * worker's event loop; the page only needs to ignore responses for demos it has
 * already navigated away from.
 */
export class MeshClient {
    private readonly worker: Worker;
    private readonly pending = new Map<number, Pending>();
    private nextId = 1;
    private closed = false;

    constructor() {
        this.worker = new Worker(
            new URL('./worker/mesh.worker.ts', import.meta.url),
            { type: 'module' },
        );
        this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
            const response = event.data;
            const pending = this.pending.get(response.id);
            if (!pending) return;
            this.pending.delete(response.id);
            if (response.type === 'error') {
                pending.reject(new Error(response.message));
            } else {
                pending.resolve(response);
            }
        };
        this.worker.onerror = (event: ErrorEvent) => {
            this.failAll(
                new Error(event.message || 'the mesh worker failed to start'),
            );
        };
    }

    mesh(demoId: string): Promise<DemoMesh> {
        return this.request({ type: 'mesh', demoId }).then((response) => {
            if (response.type !== 'mesh') {
                throw new Error(
                    'unexpected worker response for a mesh request',
                );
            }
            return response.mesh;
        });
    }

    stl(): Promise<{ buffer: ArrayBuffer; triCount: number }> {
        return this.request({ type: 'stl' }).then((response) => {
            if (response.type !== 'stl') {
                throw new Error(
                    'unexpected worker response for an STL request',
                );
            }
            return { buffer: response.buffer, triCount: response.triCount };
        });
    }

    probe(point: Vec3Arg): Promise<DemoProbe> {
        return this.request({ type: 'probe', point }).then((response) => {
            if (response.type !== 'probe') {
                throw new Error(
                    'unexpected worker response for a probe request',
                );
            }
            return { value: response.value, gradient: response.gradient };
        });
    }

    dispose(): void {
        if (this.closed) return;
        this.closed = true;
        this.worker.terminate();
        this.failAll(new Error('the mesh worker was disposed'));
    }

    private request(body: RequestBody): Promise<WorkerResponse> {
        if (this.closed) {
            return Promise.reject(new Error('the mesh worker is not running'));
        }
        const id = this.nextId++;
        return new Promise<WorkerResponse>((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            const request: WorkerRequest = { ...body, id };
            this.worker.postMessage(request);
        });
    }

    private failAll(error: Error): void {
        for (const pending of this.pending.values()) pending.reject(error);
        this.pending.clear();
    }
}
