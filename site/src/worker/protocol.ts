import type { DemoMesh } from "./run-demo";

export type WorkerRequest =
  | { readonly id: number; readonly type: "mesh"; readonly demoId: string }
  | { readonly id: number; readonly type: "stl" };

export type WorkerResponse =
  | { readonly id: number; readonly type: "mesh"; readonly mesh: DemoMesh }
  | {
      readonly id: number;
      readonly type: "stl";
      readonly buffer: ArrayBuffer;
      readonly triCount: number;
    }
  | {
      readonly id: number;
      readonly type: "error";
      readonly demoId?: string;
      readonly message: string;
    };
