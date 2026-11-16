/**
 * End-to-end check for the customer-facing customization flow.
 * Run after starting npm run dev with node tests/browser-smoke.mjs.
 * Requires Playwright + Chromium, installed in GitHub Actions.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const base = 'http://127.0.0.1:5173/';
let browser;
async function loadPage(page) {
  for (let attempt = 0; attempt < 25; attempt++) {
    try {
      await page.goto(base, { waitUntil: 'networkidle', timeout: 6000 });
      return;
    } catch (error) {
      if (attempt === 24) throw error;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const paidRequests = [];
  page.on('request', request => {
    if (/\/api\/(?:interpret|topper-image)(?:\/|$)/.test(new URL(request.url()).pathname)) paidRequests.push(request.url());
  });
  const browserErrors = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  await loadPage(page);

  const header = await page.locator('.site-header').boundingBox();
  assert.ok(header && header.height <= 65, 'Compact header must be at most 65px high');
  const voice = await page.locator('.customizer-preview .voice-section').boundingBox();
  assert.ok(voice && voice.y + voice.height < 900, 'Voice controls must be visible in the initial desktop viewport');
  const message = await page.locator('#writing').boundingBox();
  assert.ok(message && message.y < 900, 'Cake writing must be near the top of the editor');

  await page.locator('#writing').fill('Happy Birthday Eda');
  await page.locator('form.inline-edit').getByRole('button', { name: 'Apply' }).click();
  assert.ok((await page.locator('.preview-inscription').textContent())?.includes('Happy Birthday Eda'), 'Applied writing needs a visible confirmation');
  const inscription = page.locator('.customizer-preview .cake-inscription text');
  assert.equal(await inscription.count(), 1, 'Applied writing must be drawn onto the cake');
  const inkBox = await inscription.boundingBox();
  assert.ok(inkBox && inkBox.width > 8 && inkBox.height > 4, 'Lettering cannot be invisible or collapsed');

  for (const layers of [1, 2, 3]) {
    await page.locator('.layer-options').getByRole('button', { name: new RegExp('^' + layers + ' layers?$') }).click();
    assert.ok((await page.locator('.customizer-preview .cake-base').getAttribute('href'))?.includes('-' + layers + '.png'), 'Layer artwork must update');
    assert.ok((await page.locator('.preview-inscription').textContent())?.includes('Happy Birthday Eda'), 'Changing layers must preserve writing');
  }

  await page.getByRole('button', { name: 'Lavender' }).click();
  assert.equal(await page.locator('.customizer-preview [data-color-target="frosting"]').count(), 1);
  assert.ok((await page.locator('.customizer-preview .cake-art').innerHTML()).includes('buttercream-tint'), 'Use the texture-preserving frosting tint');

  await page.locator('#cake-command').fill('Make it two layers');
  await page.locator('.voice-section form').getByRole('button', { name: 'Apply' }).click();
  assert.ok((await page.locator('.customizer-preview .cake-base').getAttribute('href'))?.includes('-2.png'), 'Typed voice shortcut must update layers without an API');
  assert.deepEqual(paidRequests, [], 'Customer customization must not call paid model or image endpoints');
  assert.deepEqual(browserErrors, [], 'No runtime errors');

  await page.setViewportSize({ width: 390, height: 844 });
  const widths = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  assert.ok(widths.document <= widths.viewport, 'No sideways scrolling at mobile width');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('.template-card').filter({ hasText: 'Chocolate Party' }).click();
  await page.locator('.layer-options').getByRole('button', { name: '1 layer' }).click();
  await page.getByRole('button', { name: 'Sky blue' }).click();
  await page.locator('.customizer-editor').getByRole('button', { name: 'Strawberries' }).click();
  await page.locator('.customizer-editor').getByRole('button', { name: 'Raspberries' }).click();
  await page.locator('.customizer-editor').getByRole('button', { name: 'Unicorn' }).click();
  const updatedScene = await page.locator('.customizer-preview .cake-art').innerHTML();
  assert.ok(!updatedScene.includes('data-decoration="caramel"'), 'No gold caramel sticks');
  assert.ok(!updatedScene.includes('data-decoration="ganache"'), 'No drawn ganache drips');
  assert.ok(updatedScene.includes('data-decoration="white-piping"'), 'Ivory piping stays separate');
  assert.ok(updatedScene.includes('data-decoration="raspberries"'), 'Raspberries arranged on cake');
  assert.ok(updatedScene.includes('data-decoration="strawberries"'), 'Strawberries arranged on cake');
  await page.locator('.customizer-editor').getByRole('button', { name: 'Gold stars' }).click();
  assert.equal(await page.locator('.customizer-editor').getByRole('button', { name: 'Gold stars' }).getAttribute('aria-pressed'), 'false',
    'A third decoration is rejected, not silently piled on');
  await page.waitForTimeout(350);
  await mkdir('screenshots', { recursive: true });
  await page.locator('.customizer-preview').screenshot({ path: 'screenshots/fruit-unicorn.png' });
    console.log('PASS: compact layout, Apply writing, visible inscription, 1–3 layers, natural color controls, typed edit, mobile width, no paid requests');
} finally {
  await browser?.close();
}
