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
    return { top: p(256, 155), side: p(256, 337) };
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
    return { top: pixel('top'), side: pixel('side') };
  }
  await mkdir('screenshots', { recursive: true });
  await page.getByRole('button', { name: 'White', exact: true }).click();
  const white = await snapshot('white-top-white-side');
  await page.getByRole('button', { name: 'Lavender' }).click();
  const lavender = await snapshot('white-top-lavender-side');
  const distance = (a, b) => Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0));
  const topChange = distance(white.top, lavender.top);
  const sideChange = distance(white.side, lavender.side);
  assert.ok(topChange < 12, `Top must remain white when color changes (delta ${topChange.toFixed(1)}, points ${white.top} -> ${lavender.top})`);
  assert.ok(sideChange > 25, `Lower side must change color (delta ${sideChange.toFixed(1)}, points ${white.side} -> ${lavender.side})`);
  console.log(`PASS frosting pixels: top delta=${topChange.toFixed(1)}, side delta=${sideChange.toFixed(1)}`);
} finally {
  await browser.close();
}
