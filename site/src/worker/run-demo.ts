import { exportSTL, type Libfive, type Mesh, type Shape } from "libfive-wasm";
import { getDemo } from "../demos/index.js";

/** Mesh data transferred from the worker to the page. */
export interface DemoMesh {
  readonly demoId: string;
  readonly verts: Float32Array;
  readonly tris: Uint32Array;
  readonly vertCount: number;
  readonly triCount: number;
  readonly expression: string;
  readonly durationMs: number;
}

/**
 * Owns the current demo's kernel objects. Only one demo is meshed at a time:
 * running a new demo frees the previous shape and mesh, while the current mesh
 * is kept alive so the STL export can use the package's export path.
 */
export class MeshSession {
  private shape: Shape | null = null;
  private mesh: Mesh | null = null;

  constructor(private readonly libfive: Libfive) {}

  run(demoId: string): DemoMesh {
    const demo = getDemo(demoId);
    if (!demo) throw new Error(`unknown demo: ${demoId}`);

    this.release();

    const started = performance.now();
    const shape = demo.build(this.libfive);
    let mesh: Mesh | null = null;

    try {
      mesh = shape.mesh({
        region: demo.meta.region,
        res: demo.meta.res,
      });
      const verts = mesh.copyVerts();
      const tris = mesh.copyTris();
      const expression = shape.toString();
      const vertCount = mesh.vertCount;
      const triCount = mesh.triCount;

      this.shape = shape;
      this.mesh = mesh;

      return {
        demoId,
        verts,
        tris,
        vertCount,
        triCount,
        expression,
        durationMs: performance.now() - started,
      };
    } catch (err) {
      mesh?.free();
      shape.free();
      throw err;
    }
  }

  stl(): { buffer: ArrayBuffer; triCount: number } {
    if (!this.mesh) throw new Error("no mesh is available for export");
    return {
      buffer: exportSTL(this.mesh),
      triCount: this.mesh.triCount,
    };
  }

  release(): void {
    this.mesh?.free();
    this.mesh = null;
    this.shape?.free();
    this.shape = null;
  }
}
