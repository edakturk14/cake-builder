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

  assert.equal((await page.locator('.preview-price').textContent())?.trim(), '$58',
    'The classic cake must start at $58');
  assert.ok((await page.locator('.template-card').first().textContent())?.includes('$58'),
    'Starter template cards must show the NYC base price');

  await page.getByRole('button', { name: 'Save cake to basket' }).click();
  assert.ok((await page.locator('.basket-item').first().textContent())?.includes('$58'),
    'Saved cake should retain the NYC estimate');
  assert.ok((await page.locator('.basket-total').textContent())?.includes('$58'),
    'Basket total should agree with the preview');
  await page.locator('.basket-header button').click();
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.basket-trigger').click();
  assert.ok((await page.locator('.basket-total').textContent())?.includes('$58'),
    'Basket reload should still show the updated $58 price');
  await page.locator('.basket-item button').filter({ hasText: 'Remove' }).click();
  await page.locator('.basket-header button').click();

  // Desktop visual hierarchy: symmetric side panels and a distinctive wordmark.
  const panels = await page.evaluate(() => {
    const left = document.querySelector('.template-picker')?.getBoundingClientRect();
    const right = document.querySelector('.customizer-editor')?.getBoundingClientRect();
    return left && right
      ? { left:{x:left.x,y:left.y,width:left.width,height:left.height},
          right:{x:right.x,y:right.y,width:right.width,height:right.height} }
      : null;
  });
  assert.ok(panels, 'Both side panels must exist');
  assert.ok(Math.abs(panels.left.width - panels.right.width) < 2,
    'Left and right panels should have the same width');
  assert.ok(Math.abs(panels.left.y - panels.right.y) < 2,
    'Left and right panels should align vertically');
  assert.ok(Math.abs(panels.left.height - panels.right.height) < 3,
    'Left and right panels should have matching height');
  assert.ok((await page.locator('.brand').evaluate(element => getComputedStyle(element).fontFamily)).includes('Fraunces'),
    'Brand wordmark should use the new distinctive font');
  assert.equal(await page.locator('.customizer-heading .heading-caption').textContent(),
    'Choose a design, then add your own little touches.');
  assert.equal(await page.getByText('YOUR CAKE, SO FAR').count(), 0,
    'Remove the redundant central preview label');
  await mkdir('screenshots', { recursive: true });
  await page.screenshot({ path: 'screenshots/balanced-workbench.png', animations: 'disabled' });
  const galleryChoices = page.locator('.template-card');
  assert.equal(await galleryChoices.count(), 4, 'Exactly four starter cake cards are offered');
  assert.ok((await galleryChoices.nth(0).textContent())?.includes('Classic Birthday'));
  assert.ok((await galleryChoices.nth(1).textContent())?.includes('Chocolate Party'));
  assert.ok((await galleryChoices.nth(2).textContent())?.includes('Red Velvet'));
  assert.ok((await galleryChoices.nth(3).textContent())?.includes('Birthday with Sprinkles'));
  assert.equal(await page.locator('.template-card').filter({ hasText: /Pastel Celebration|Cheesecake/ }).count(), 0);
  await galleryChoices.nth(2).click();
  assert.ok((await page.locator('.customizer-preview .cake-base').getAttribute('href'))?.includes('/art/red-velvet-2.png'),
    'Red Velvet starter must use the two-layer red velvet sponge artwork');
  assert.equal(await page.locator('.layer-choice.is-selected').count(), 1);
  assert.ok((await page.locator('.layer-choice.is-selected').textContent())?.includes('2'),
    'Red Velvet starts as a two-layer cake');
  assert.equal((await page.locator('.preview-price').textContent())?.trim(), '$64');
  await mkdir('screenshots', { recursive: true });
  await page.locator('.customizer-preview').screenshot({ path: 'screenshots/red-velvet-two-layers.png' });
  await galleryChoices.nth(3).click();
  assert.ok((await page.locator('.customizer-preview .cake-base').getAttribute('href'))?.includes('/art/vanilla-1.png'),
    'Birthday with Sprinkles uses the original classic vanilla cake artwork');
  assert.ok((await page.locator('.customizer-preview [data-decoration="sprinkles"] [data-sprinkle]').count()) >= 25,
    'Sprinkles are actually visible on the birthday preset');
  assert.equal((await page.locator('.preview-price').textContent())?.trim(), '$62',
    'Birthday with Sprinkles costs $58 plus $4 sprinkles');
  await page.locator('.customizer-preview').screenshot({ path: 'screenshots/birthday-with-sprinkles.png' });
  await galleryChoices.nth(0).click();

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

  assert.equal(await page.locator('.color-options').count(), 0, 'No frosting color picker in the prototype');
  const plainMarkup = await page.locator('.customizer-preview .cake-art').innerHTML();
  assert.ok(!plainMarkup.includes('smooth-top-tint') && !plainMarkup.includes('white-piped-swirls'),
    'Original prepared frosting stays visible without custom masks');
  await page.locator('#cake-command').fill('Make it pink');
  await page.locator('.voice-section form').getByRole('button', { name: 'Apply' }).click();
  assert.ok((await page.locator('.user-notice').textContent())?.includes('Frosting colors are fixed'),
    'Voice must reject frosting recoloring instead of silently claiming success');
  const unchangedMarkup = await page.locator('.customizer-preview .cake-art').innerHTML();
  assert.equal(unchangedMarkup, plainMarkup, 'Rejected frosting recoloring never changes the cake');
  await mkdir('screenshots', { recursive: true });
  await page.locator('.customizer-preview').screenshot({ path: 'screenshots/original-frosting-no-overlays.png' });

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
  assert.equal((await page.locator('.preview-price').textContent())?.trim(), '$64',
    'Chocolate Party has a $58 base and $6 extra layer');
  await page.locator('.layer-options').getByRole('button', { name: '1 layer' }).click();
  assert.ok((await page.locator('.customizer-preview .cake-art').innerHTML()).includes('data-color-target="filling"'),
    'Chocolate filling remains a separately prepared vanilla-colored layer');
  await page.locator('.customizer-preview').screenshot({ path: 'screenshots/chocolate-vanilla-filling.png' });
  await page.locator('.customizer-editor').getByRole('button', { name: 'Strawberries' }).click();
  await page.locator('.customizer-editor').getByRole('button', { name: 'Raspberries' }).click();
  await page.locator('.customizer-editor').getByRole('button', { name: 'Unicorn' }).click();
  const updatedScene = await page.locator('.customizer-preview .cake-art').innerHTML();
  assert.ok(!updatedScene.includes('data-decoration="caramel"'), 'No gold caramel sticks');
  assert.ok(!updatedScene.includes('data-decoration="ganache"'), 'No drawn ganache drips');
  assert.ok(!updatedScene.includes('data-decoration="white-piped-swirls"'), 'No added white icing overlay');
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
    console.log('PASS: four cake presets, plain frosting, sprinkles, vanilla filling, layout, writing, layers, candles, basket, voice, mobile width and no paid requests');
} finally {
  await browser?.close();
}
