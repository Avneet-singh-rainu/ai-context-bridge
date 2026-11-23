// Renders resources/icon.svg into resources/icon.png (256 px) and resources/icon.ico (16 to
// 256 px) with Chromium, so the icon matches the SVG exactly at every Windows size.
//
// Usage: npm run icon   (runs this file with Electron: `electron scripts/build-icon.mjs`)
//
// Small sizes (32 px and below) use a thicker stroke so the glyph stays readable in the
// taskbar and title bars.

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, BrowserWindow } from 'electron';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const resources = join(root, 'resources');
const source = readFileSync(join(resources, 'icon.svg'), 'utf8');
const SIZES = [16, 20, 24, 32, 40, 48, 64, 96, 128, 256];
const workDir = mkdtempSync(join(tmpdir(), 'acb-icon-'));

function svgFor(size) {
  const stroke = size <= 32 ? source.replace('stroke-width="1.85"', 'stroke-width="2.5"') : source;
  return stroke.replace('<svg ', `<svg width="${size}" height="${size}" `);
}

let window;

/** One offscreen window; each size is drawn into the page and captured from the top-left. */
async function openRenderer() {
  window = new BrowserWindow({
    width: 256,
    height: 256,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    useContentSize: true,
    webPreferences: { offscreen: true },
  });
  const page = join(workDir, 'icon.html');
  writeFileSync(
    page,
    '<!doctype html><html><body style="margin:0;background:transparent;overflow:hidden">' +
      '<div id="icon" style="line-height:0"></div></body></html>',
  );
  await window.loadFile(page);
}

async function render(size) {
  await window.webContents.executeJavaScript(
    `document.getElementById('icon').innerHTML = ${JSON.stringify(svgFor(size))}; true`,
  );
  await new Promise((resolve) => setTimeout(resolve, 200));
  let image = await window.webContents.capturePage({ x: 0, y: 0, width: size, height: size });
  const { width, height } = image.getSize();
  if (width !== size || height !== size) {
    image = image.resize({ width: size, height: size, quality: 'best' });
  }
  return image.toPNG();
}

/** ICO with PNG-compressed entries (supported since Windows Vista). */
function toIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map(({ png }) => png)]);
}

app.disableHardwareAcceleration();
app
  .whenReady()
  .then(async () => {
    await openRenderer();
    const images = [];
    for (const size of SIZES) images.push({ size, png: await render(size) });
    writeFileSync(join(resources, 'icon.png'), images.at(-1).png);
    writeFileSync(join(resources, 'icon.ico'), toIco(images));
    console.log(`Wrote resources/icon.png and resources/icon.ico (${SIZES.join(', ')} px).`);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    window?.destroy();
    rmSync(workDir, { recursive: true, force: true });
    app.quit();
  });
