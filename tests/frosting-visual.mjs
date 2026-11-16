import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import sharp from 'sharp';

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 920 } });
  for (let attempt = 0; attempt < 25; attempt++) {
    try { await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle', timeout: 6000 }); break; }
    catch (error) {
      if (attempt === 24) throw error;
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  const svg = page.locator('.customizer-preview .cake-art');
  await page.locator('.layer-options').getByRole('button', { name: '1 layer' }).click();
  const points = await svg.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const matrix = element.getScreenCTM();
    if (!matrix) throw new Error('SVG does not have a transform');
    function p(x, y) {
      const original = element.createSVGPoint();
      original.x = x;
      original.y = y;
      const rendered = original.matrixTransform(matrix);
      return [Math.round(rendered.x - rect.x), Math.round(rendered.y - rect.y)];
    }
    return {
      center: p(256, 224), // smooth frosting on the 1-layer cake top
      whitePiping: p(120, 191), // ring outside the colorable center
      side: p(256, 337), // original sponge, must never be recolored
    };
  });
  async function snapshot(name) {
    await page.waitForTimeout(180);
    const png = await svg.screenshot({ animations: 'disabled' });
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const pixel = point => {
      const [x, y] = points[point];
      assert.ok(x >= 0 && x < info.width && y >= 0 && y < info.height, 'Pixel inside screenshot');
      return [...data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 3)];
    };
    await page.locator('.customizer-preview').screenshot({ path: `screenshots/frosting-${name}.png` });
    return { center: pixel('center'), whitePiping: pixel('whitePiping'), side: pixel('side') };
  }
  await mkdir('screenshots', { recursive: true });
  await page.getByRole('button', { name: 'White', exact: true }).click();
  const white = await snapshot('white-top-white-side');
  await page.getByRole('button', { name: 'Lavender' }).click();
  const lavender = await snapshot('white-top-lavender-side');
  const distance = (a, b) => Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0));
  const centerChange = distance(white.center, lavender.center);
  const pipingChange = distance(white.whitePiping, lavender.whitePiping);
  const sideChange = distance(white.side, lavender.side);
  assert.ok(centerChange > 25,
    `Smooth top frosting should change color: delta ${centerChange.toFixed(1)}, ${white.center} -> ${lavender.center}`);
  assert.ok(pipingChange < 12,
    `White border swirls should not change color: delta ${pipingChange.toFixed(1)}`);
  assert.ok(sideChange < 12,
    `Original sponge must keep its appearance: delta ${sideChange.toFixed(1)}`);
  console.log(`PASS frosting pixels: center delta=${centerChange.toFixed(1)}, white swirls delta=${pipingChange.toFixed(1)}, cake side delta=${sideChange.toFixed(1)}`);
} finally {
  await browser.close();
}
