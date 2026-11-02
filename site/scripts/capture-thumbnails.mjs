#!/usr/bin/env node
/*
 * capture-thumbnails.mjs — capture gallery card previews from the real demo
 * viewport (AD-028, showcase-thumbnails).
 *
 * Usage:
 *   CHROME_SHELL_PATH=/path/to/chrome-headless-shell npm run thumbnails:capture
 *   CHROME_URL=http://127.0.0.1:9222 npm run thumbnails:capture
 *
 * Unless CAPTURE_BASE_URL points at an already-running server, the script
 * starts `vite preview` against `site/dist` on an OS-assigned free port (a
 * leftover listener on the default port cannot block the capture), reads demo
 * ids from the gallery, opens each `#/p/<id>?preview=1`, waits for the mesh,
 * and writes a 640x400 CSS / DPR 2 WebP plus manifest.json into
 * src/assets/previews/.
 *
 * Captures are checked in and reviewed; CI does not run a browser.
 */

import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREVIEW_DIR = path.join(SITE_ROOT, 'src', 'assets', 'previews');
const PREVIEW_VERSION = 1;
const CAPTURE_WIDTH = 640;
const CAPTURE_HEIGHT = 400;
const DEVICE_SCALE_FACTOR = 2;
const QUALITY = 82;

function fail(message) {
    throw new Error(message);
}

function viteBin() {
    return path.join(SITE_ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
}

async function waitForServer(url, timeoutMs = 30000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(url);
            if (response.ok) return;
        } catch {
            // not up yet
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    fail(`preview server did not start at ${url}`);
}

/**
 * Asks the OS for a free loopback port by binding to port 0 and releasing it.
 * The release→vite-bind window is a race, but `--strictPort` makes vite fail
 * loudly instead of drifting to a port we are not waiting on.
 */
function freePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            server.close(() =>
                typeof port === 'number'
                    ? resolve(port)
                    : reject(new Error('no free port was assigned')),
            );
        });
    });
}

function startPreviewServer(port) {
    if (!existsSync(path.join(SITE_ROOT, 'dist', 'index.html'))) {
        fail('site/dist is missing; run `npm run build` first');
    }
    const child = spawn(
        process.execPath,
        [
            viteBin(),
            'preview',
            '--host',
            '127.0.0.1',
            '--port',
            String(port),
            '--strictPort',
        ],
        {
            cwd: SITE_ROOT,
            stdio: ['ignore', 'pipe', 'pipe'],
        },
    );
    child.stderr.on('data', (chunk) => process.stderr.write(chunk));
    return child;
}

async function launchBrowser() {
    if (process.env.CHROME_URL) {
        return puppeteer.connect({
            browserURL: process.env.CHROME_URL,
            defaultViewport: null,
        });
    }
    if (!process.env.CHROME_SHELL_PATH) {
        fail(
            'set CHROME_SHELL_PATH to chrome-headless-shell, or CHROME_URL to a running CDP browser',
        );
    }
    return puppeteer.launch({
        executablePath: process.env.CHROME_SHELL_PATH,
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--enable-unsafe-swiftshader',
        ],
    });
}

function sourceHash(id) {
    const file = path.join(SITE_ROOT, 'src', 'demos', `${id}.ts`);
    if (!existsSync(file)) {
        fail(`demo source is missing for thumbnail "${id}": ${file}`);
    }
    return createHash('sha256').update(readFileSync(file)).digest('hex');
}

async function capture(page, baseUrl, id) {
    await page.goto(`${baseUrl}/#/p/${encodeURIComponent(id)}?preview=1`, {
        waitUntil: 'networkidle0',
        timeout: 120000,
    });
    await page.waitForFunction(
        () =>
            document
                .querySelector('.demo-stats')
                ?.textContent?.includes('triangles'),
        { timeout: 120000 },
    );
    await page.evaluate(
        () =>
            new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
    );

    const surface = await page.$('.demo-stage-body');
    if (!surface) fail(`preview surface is missing for "${id}"`);
    const image = await surface.screenshot({
        type: 'webp',
        quality: QUALITY,
    });
    writeFileSync(path.join(PREVIEW_DIR, `${id}.webp`), image);
    return {
        file: `${id}.webp`,
        sourceHash: sourceHash(id),
        width: CAPTURE_WIDTH * DEVICE_SCALE_FACTOR,
        height: CAPTURE_HEIGHT * DEVICE_SCALE_FACTOR,
    };
}

async function main() {
    mkdirSync(PREVIEW_DIR, { recursive: true });

    const externalBase = process.env.CAPTURE_BASE_URL;
    const port = externalBase ? null : await freePort();
    const server = externalBase ? null : startPreviewServer(port);
    const baseUrl = externalBase ?? `http://127.0.0.1:${port}`;
    let browser;
    try {
        if (!externalBase) await waitForServer(`${baseUrl}/`);
        browser = await launchBrowser();
        const page = await browser.newPage();
        await page.setViewport({
            width: CAPTURE_WIDTH,
            height: CAPTURE_HEIGHT,
            deviceScaleFactor: DEVICE_SCALE_FACTOR,
        });

        await page.goto(`${baseUrl}/#/`, {
            waitUntil: 'networkidle0',
            timeout: 120000,
        });
        const ids = await page.$$eval('.demo-card', (cards) =>
            cards
                .map((card) => card.getAttribute('href') ?? '')
                .map((href) => href.replace(/^#\/p\//, '').split('?')[0])
                .filter(Boolean),
        );
        if (ids.length === 0) fail('the gallery exposed no demo cards');

        const demos = {};
        for (const id of ids) {
            const entry = await capture(page, baseUrl, id);
            demos[id] = entry;
            console.log(
                `captured ${id}: ${CAPTURE_WIDTH * DEVICE_SCALE_FACTOR}x${CAPTURE_HEIGHT * DEVICE_SCALE_FACTOR}`,
            );
        }

        const manifest = {
            previewVersion: PREVIEW_VERSION,
            capturedAt: new Date().toISOString(),
            viewport: {
                width: CAPTURE_WIDTH,
                height: CAPTURE_HEIGHT,
                deviceScaleFactor: DEVICE_SCALE_FACTOR,
            },
            quality: QUALITY,
            demos,
        };
        writeFileSync(
            path.join(PREVIEW_DIR, 'manifest.json'),
            `${JSON.stringify(manifest, null, 2)}\n`,
        );
        console.log(
            `wrote ${Object.keys(demos).length} thumbnails and manifest.json`,
        );
    } finally {
        if (browser) {
            if (process.env.CHROME_URL) await browser.disconnect();
            else await browser.close();
        }
        server?.kill('SIGTERM');
    }
}

main().catch((error) => {
    console.error(`capture-thumbnails: ${error.message}`);
    process.exitCode = 1;
});
