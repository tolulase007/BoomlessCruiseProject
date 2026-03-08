#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

function parseArgs(argv) {
  const args = {};
  const positional = [];
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
    } else {
      args[key] = next;
      i += 1;
    }
  }
  if (!args.url && positional[0]) args.url = positional[0];
  if (!args.out && positional[1]) args.out = positional[1];
  if (!args.width && positional[2]) args.width = positional[2];
  if (!args.height && positional[3]) args.height = positional[3];
  return args;
}

function decodeScreenshotPayload(dataUri) {
  const base64Prefix = 'data:image/svg+xml;base64,';
  const utf8Prefix = 'data:image/svg+xml;utf8,';
  const pngBase64Prefix = 'data:image/png;base64,';
  if (dataUri.startsWith(base64Prefix)) {
    return { kind: 'svg', data: Buffer.from(dataUri.slice(base64Prefix.length), 'base64').toString('utf8') };
  }
  if (dataUri.startsWith(utf8Prefix)) {
    return { kind: 'svg', data: decodeURIComponent(dataUri.slice(utf8Prefix.length)) };
  }
  if (dataUri.trimStart().startsWith('<svg')) {
    return { kind: 'svg', data: dataUri };
  }
  if (dataUri.startsWith(pngBase64Prefix)) {
    return { kind: 'png', data: Buffer.from(dataUri.slice(pngBase64Prefix.length), 'base64') };
  }
  throw new Error('Unexpected screenshot format from Desmos.');
}

async function launchBrowser() {
  const configuredPath = process.env.DESMOS_BROWSER_PATH;
  if (configuredPath) {
    return chromium.launch({ headless: true, executablePath: configuredPath });
  }
  const channels = ['chrome', 'msedge'];
  for (const channel of channels) {
    try {
      return await chromium.launch({ headless: true, channel });
    } catch {
      // try next channel
    }
  }
  return chromium.launch({ headless: true });
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help === 'true' || args.h === 'true') {
    console.log(
      [
        'Usage:',
        '  node scripts/export-desmos-svg.mjs --url <desmos-url> [--out public/alto.svg] [--width 2560] [--height 1440]',
        '',
        'If Desmos returns PNG instead of SVG, this tool writes a PNG fallback next to the requested path.',
        '',
        'Optional env:',
        '  DESMOS_BROWSER_PATH   Absolute browser executable path',
      ].join('\n'),
    );
    return;
  }

  const url = args.url;
  if (!url) {
    throw new Error('Missing required argument: --url <desmos-share-url>');
  }

  const outPath = path.resolve(process.cwd(), args.out ?? 'public/alto.svg');
  const width = Number.parseInt(args.width ?? '2560', 10);
  const height = Number.parseInt(args.height ?? '1440', 10);
  const timeoutMs = Number.parseInt(args.timeout ?? '30000', 10);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('Invalid --width/--height values.');
  }

  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width, height } });
  try {
    console.log(`Opening ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await page.waitForFunction(
      () => {
        const win = window;
        if (win.Calc && typeof win.Calc.asyncScreenshot === 'function') return true;
        return Object.values(win).some(
          (v) => Boolean(v) && typeof v === 'object' && typeof v.asyncScreenshot === 'function',
        );
      },
      { timeout: timeoutMs },
    );

    const svgDataUri = await page.evaluate(
      ({ shotWidth, shotHeight }) =>
        new Promise((resolve, reject) => {
          const win = window;
          const fallback = Object.values(win).find(
            (v) => Boolean(v) && typeof v === 'object' && typeof v.asyncScreenshot === 'function',
          );
          const calc = win.Calc ?? fallback;
          if (!calc || typeof calc.asyncScreenshot !== 'function') {
            reject(new Error('Desmos calculator instance not found on page.'));
            return;
          }
          calc.asyncScreenshot(
            {
              mode: 'svg',
              width: shotWidth,
              height: shotHeight,
              targetPixelRatio: 1,
            },
            (data) => resolve(data),
          );
        }),
      { shotWidth: width, shotHeight: height },
    );

    if (typeof svgDataUri !== 'string') {
      throw new Error('Received non-string screenshot payload from Desmos.');
    }

    const screenshot = decodeScreenshotPayload(svgDataUri);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    if (screenshot.kind === 'svg') {
      await fs.writeFile(outPath, screenshot.data, 'utf8');
      console.log(`Saved SVG to ${outPath}`);
      return;
    }
    const parsed = path.parse(outPath);
    const pngOutPath = parsed.ext.toLowerCase() === '.png'
      ? outPath
      : path.join(parsed.dir, `${parsed.name}.png`);
    await fs.writeFile(pngOutPath, screenshot.data);
    console.log(
      [
        `Desmos returned PNG for this graph (no SVG payload available).`,
        `Saved PNG to ${pngOutPath}`,
      ].join('\n'),
    );
  } finally {
    await page.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
