# Bundlers

The package is a single ESM entry whose wasm reference uses the standard
`new URL('./libfive.wasm', import.meta.url)` pattern. Modern bundlers detect
it and emit the artifact for you.

## Vite, webpack 5, Rollup

No plugin is required. Import and `await init()`:

```ts
import { init } from 'libfive-wasm';

const libfive = await init();
```

- **Vite** picks up `libfive.wasm` as an asset automatically (the showcase in
  this repository is itself a Vite consumer). For workers, use the
  `type: 'module'` worker recipe from [Workers](./workers.md).
- **webpack 5** handles `import.meta.url` asset references through its asset
  modules.
- **Rollup** resolves it via `@rollup/plugin-url`-style handling in most
  setups; if your config strips `import.meta.url`, see the escape hatches
  below.

The build output contains `libfive.wasm` beside your JS — ship both.

## Escape hatch 1: pass the bytes

When your bundler relocates assets, or you are in an SSR/Node toolchain that
cannot resolve the artifact, hand the wasm bytes to `init()` yourself:

```ts
import { readFileSync } from 'node:fs';
import { init } from 'libfive-wasm';

const libfive = await init({
    wasmBinary: readFileSync(
        new URL('libfive-wasm/dist/libfive.wasm', import.meta.url),
    ),
});
```

`wasmBinary` takes an `ArrayBuffer` or typed array and takes precedence over
all URL resolution.

## Escape hatch 2: relocate the URL

`locateWasm` maps the artifact filename to wherever it is actually served:

```ts
import { init } from 'libfive-wasm';

const libfive = await init({
    locateWasm: (filename) => `https://cdn.example.com/wasm/${filename}`,
});
```

Use one CDN URL or a per-deployment manifest; the loader only asks for the
filename it was built with (`libfive.wasm`).

## CommonJS

There is no CJS build. CommonJS consumers load the module dynamically:

```ts
type LibfiveWasm = typeof import('libfive-wasm');

async function main(): Promise<void> {
    const { init }: LibfiveWasm = await import('libfive-wasm');
    const libfive = await init();
    // ...
}

void main();
```

## Framework notes

- **Next.js / SSR:** the kernel touches `WebAssembly` at `init()` time; run
  it client-side (or in a Node route handler), never during SSR evaluation.
- **Vite `optimizeDeps`:** exclude the package from pre-bundling if your
  version of Vite tries to rewrite the artifact URL:
  `optimizeDeps: { exclude: ['libfive-wasm'] }` — the same setting this
  repository's showcase uses.

## See also

- [API reference: init](../api/functions/init.md) — all options.
- [Getting started](./getting-started.md) — first steps.
