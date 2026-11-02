import { init, type Libfive } from 'libfive-wasm';
import type { WorkerRequest, WorkerResponse } from './protocol';
import { MeshSession } from './run-demo';

const scope = self as unknown as {
    onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
    postMessage: (message: WorkerResponse, transfer?: Transferable[]) => void;
};

let sessionPromise: Promise<MeshSession> | null = null;

function getSession(): Promise<MeshSession> {
    if (!sessionPromise) {
        sessionPromise = init().then(
            (libfive: Libfive) => new MeshSession(libfive),
        );
    }
    return sessionPromise;
}

function errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}

async function handle(request: WorkerRequest): Promise<void> {
    try {
        const session = await getSession();

        if (request.type === 'mesh') {
            const mesh = session.run(request.demoId);
            scope.postMessage({ id: request.id, type: 'mesh', mesh }, [
                mesh.verts.buffer as ArrayBuffer,
                mesh.tris.buffer as ArrayBuffer,
            ]);
            return;
        }

        if (request.type === 'probe') {
            const probe = session.probe(request.point);
            scope.postMessage({
                id: request.id,
                type: 'probe',
                value: probe.value,
                gradient: probe.gradient,
            });
            return;
        }

        const { buffer, triCount } = session.stl();
        scope.postMessage({ id: request.id, type: 'stl', buffer, triCount }, [
            buffer,
        ]);
    } catch (err) {
        scope.postMessage({
            id: request.id,
            type: 'error',
            ...(request.type === 'mesh' ? { demoId: request.demoId } : {}),
            message: errorMessage(err),
        });
    }
}

scope.onmessage = (event: MessageEvent<WorkerRequest>) => {
    void handle(event.data);
};
