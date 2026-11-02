import type { Vec3Arg } from 'libfive-wasm';
import type { DemoMesh } from './run-demo.js';

export type WorkerRequest =
    | { readonly id: number; readonly type: 'mesh'; readonly demoId: string }
    | { readonly id: number; readonly type: 'stl' }
    | {
          readonly id: number;
          readonly type: 'probe';
          readonly point: Vec3Arg;
      };

export type WorkerResponse =
    | { readonly id: number; readonly type: 'mesh'; readonly mesh: DemoMesh }
    | {
          readonly id: number;
          readonly type: 'stl';
          readonly buffer: ArrayBuffer;
          readonly triCount: number;
      }
    | {
          readonly id: number;
          readonly type: 'probe';
          readonly value: number;
          readonly gradient: [number, number, number];
      }
    | {
          readonly id: number;
          readonly type: 'error';
          readonly demoId?: string;
          readonly message: string;
      };
