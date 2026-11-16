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
  assert.ok(header && header.height <= 53, 'Chocolate header should be no more than 53px on desktop');
  const voice = await page.locator('.customizer-preview .voice-section').boundingBox();
  assert.ok(voice && voice.y + voice.height < 900, 'Voice controls must be visible in the initial desktop viewport');
  const message = await page.locator('#writing').boundingBox();
  assert.ok(message && message.y < 900, 'Cake writing must be near the top of the editor');

  await page.locator('#writing').fill('Happy Birthday Eda');
  assert.ok((await page.locator('.preview-inscription').textContent())?.includes('Happy Birthday Eda'),
    'Writing should be visible in the cake preview before clicking Apply');
  assert.ok((await page.locator('.preview-inscription').textContent())?.includes('Previewing'),
    'The preview should disclose the message is not yet saved');
  await page.locator('form.inline-edit').getByRole('button', { name: 'Apply' }).click();
  assert.ok(!(await page.locator('.preview-inscription').textContent())?.includes('Previewing'),
    'Apply must save the inscription rather than leave it in draft mode');
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
  assert.equal(await page.locator('.customizer-preview [data-decoration="always-white-frosting-ring"]').count(), 1,
    'White top icing should remain separate from the colored frosting');
  const whiteRing = await page.locator('.customizer-preview [data-decoration="always-white-frosting-ring"]').getAttribute('mask');
  assert.ok(whiteRing?.includes('white-frosting-ring'), 'The white frosting must be masked to the outer piping');
  const colorClip = await page.locator('.customizer-preview [data-color-target="frosting"]').getAttribute('clip-path');
  assert.ok(colorClip?.includes('frosting-center'), 'Only the lower/inner frosting should change color');

  await page.locator('#candle-style').selectOption('plain');
  assert.equal(await page.locator('.customizer-preview [data-plain-candle]').count(), 5,
    'Five plain candles should remain available');
  assert.equal(await page.locator('.customizer-preview [data-candle-body="wide"]').count(), 5,
    'Plain candles should be wider but not taller');
  await mkdir('screenshots', { recursive: true });
  await page.locator('.customizer-preview').screenshot({ path: 'screenshots/message-white-icing-five-candles.png' });
  await page.locator('#candle-style').selectOption('number');
  const numeralTransform = await page.locator('.customizer-preview [data-decoration="number-candles"]').getAttribute('transform');
  const numeralX = Number(numeralTransform?.match(/translate\(([\d.]+)/)?.[1] ?? NaN);
  assert.ok(Number.isFinite(numeralX) && Math.abs(numeralX - 256) < 110,
    'Number candle should sit near the center of the cake');
  const numeralAndWriting = await page.evaluate(() => {
    const candle = document.querySelector('.customizer-preview [data-decoration="number-candles"] text');
    const writing = document.querySelector('.customizer-preview .cake-inscription text');
    if (!candle || !writing) return null;
    const n = candle.getBoundingClientRect();
    const w = writing.getBoundingClientRect();
    return { numeral: { top: n.top, bottom: n.bottom, left: n.left, right: n.right },
      inscription: { top: w.top, bottom: w.bottom, left: w.left, right: w.right } };
  });
  assert.ok(numeralAndWriting, 'Both the number candle and inscription should render');
  const n = numeralAndWriting.numeral, w = numeralAndWriting.inscription;
  assert.ok(n.bottom < w.top - 1 || n.top > w.bottom + 1 || n.right < w.left - 1 || n.left > w.right + 1,
    'Number candle must not cover the cake inscription');
  await page.locator('.customizer-preview').screenshot({ path: 'screenshots/message-white-icing-number-candle.png' });
  await page.locator('#candle-style').selectOption('none');

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
  await page.locator('.customizer-editor').getByRole('button', { name: 'Christmas tree' }).click();
  const treePreview = await page.locator('.customizer-preview [data-decoration="christmas-tree"] image').getAttribute('filter');
  assert.ok(treePreview?.includes('festive-tree'), 'Christmas tree gets a more saturated, greener prepared-art filter');
  await page.locator('.customizer-preview').screenshot({ path: 'screenshots/vibrant-christmas-tree.png' });
    console.log('PASS: compact layout, Apply writing, visible inscription, 1–3 layers, natural color controls, typed edit, mobile width, no paid requests');
} finally {
  await browser?.close();
}
