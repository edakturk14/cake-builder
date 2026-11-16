import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import sharp from 'sharp';

/**
 * The bakery prototype uses the original prepared frosting image.
 * A legacy voice prompt requesting color must not alter a single cake pixel.
 * Keep screenshots as a visual reference for the four prepared designs.
 */
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
  await mkdir('screenshots', { recursive: true });
  const svg = page.locator('.customizer-preview .cake-art');
  assert.equal(await page.locator('.color-options').count(), 0, 'No frosting color chooser is offered');
  assert.ok((await page.locator('.customizer-preview .cake-base').getAttribute('href'))?.endsWith('/vanilla-1.png'));
  const markup = await svg.innerHTML();
  assert.ok(!markup.includes('frosting-tint') && !markup.includes('white-piped-swirls'),
    'The cake is the prepared image, without extra frosting overlays');
  await page.waitForTimeout(200);
  const beforePng = await svg.screenshot({ animations: 'disabled' });
  const before = await sharp(beforePng).ensureAlpha().raw().toBuffer();
  await page.locator('.customizer-preview').screenshot({ path: 'screenshots/frosting-original-before.png' });

  await page.locator('#cake-command').fill('Make it lavender');
  await page.locator('.voice-section form').getByRole('button', { name: 'Apply' }).click();
  assert.ok((await page.locator('.user-notice').textContent())?.includes('Frosting colors are fixed'));
  const afterPng = await svg.screenshot({ animations: 'disabled' });
  const after = await sharp(afterPng).ensureAlpha().raw().toBuffer();
  assert.ok(before.equals(after), 'A rejected frosting color command must not modify a cake pixel');
  await page.locator('.customizer-preview').screenshot({ path: 'screenshots/frosting-original-after.png' });

  await page.locator('.template-card').filter({ hasText: 'Chocolate Party' }).click();
  assert.ok((await page.locator('.customizer-preview .cake-base').getAttribute('href'))?.endsWith('/chocolate-2.png'));
  await page.locator('.customizer-preview').screenshot({ path: 'screenshots/chocolate-vanilla-cream.png' });

  await page.locator('.template-card').filter({ hasText: 'Red Velvet' }).click();
  await page.locator('.customizer-preview').screenshot({ path: 'screenshots/red-velvet-original-frosting.png' });

  await page.locator('.template-card').filter({ hasText: 'Birthday with Sprinkles' }).click();
  assert.ok((await svg.innerHTML()).includes('data-decoration="sprinkles"'));
  await page.locator('.customizer-preview').screenshot({ path: 'screenshots/birthday-sprinkles-default.png' });
  console.log('PASS prototype visuals: no frosting picker, no extra icing overlays, unchanged pixels after color request, four prepared cakes');
} finally {
  await browser.close();
}
