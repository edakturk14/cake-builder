import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CakeScene } from '../src/components/CakeScene';
import { EMPTY_CAKE, applyCakePatch, type CakeState } from '../src/shared/cake';
import { createTemplateCake } from '../src/shared/bakery';
import { TOPPER_CATALOG } from '../src/shared/toppers';
import manifest from '../src/art/toppersManifest.json';

test('every supported topper has a prepared manifest asset and renders its actual cutout', () => {
  assert.equal(TOPPER_CATALOG.length, 41);
  assert.equal(Object.keys(manifest.items).length, 41);
  for (const {id,label} of TOPPER_CATALOG) {
    const art = manifest.items[id];
    assert.equal(art.label,label);
    assert.ok(existsSync(new URL(`../public${art.file}`,import.meta.url)),id);
    assert.ok(art.anchor.x>0 && art.anchor.x<1 && art.anchor.y>0 && art.anchor.y<=1,id);
    assert.ok(art.scale>0,id);
    const cake: CakeState = {...EMPTY_CAKE,exists:true,toppers:[id],inscription:'Ada'};
    const svg = renderToStaticMarkup(createElement(CakeScene,{cake}));
    assert.ok(svg.includes(`href="${art.file}"`),id);
    assert.ok(svg.includes(`data-decoration="${id}"`),id);
    assert.ok(!svg.includes('artwork in progress'),id);
  }
});

test('ordered two-topper composition preserves both toppers, numeric candles and exact inscription', () => {
  const cake: CakeState = {...EMPTY_CAKE,exists:true,layers:3,toppers:['castle','dragon'],candles:{style:'number',number:'40',count:null},inscription:'Happy Birthday, Ada'};
  const svg = renderToStaticMarkup(createElement(CakeScene,{cake}));
  assert.ok(svg.indexOf('data-decoration="castle"')<svg.indexOf('data-decoration="dragon"'));
  assert.ok(svg.includes('data-decoration="number-candles"'));
  assert.ok(svg.includes('40'));
  assert.ok(svg.includes('Happy Birthday,'));
  assert.ok(svg.includes('Ada'));
  assert.ok(svg.includes('/art/chocolate-3.png'));
});

test('multiple saved cake renderers keep SVG paint IDs unique', () => {
  const cake: CakeState = {...EMPTY_CAKE,exists:true,toppers:['princess','unicorn'],candles:{style:'plain',number:null,count:5},inscription:'Ada'};
  const html = renderToStaticMarkup(createElement('main',null,...Array.from({length:4},(_,i)=>createElement(CakeScene,{key:i,cake,compact:i>0}))));
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.ok(ids.length>20);
  assert.equal(new Set(ids).size,ids.length);
});

test('cake messages appear on all chocolate layer variants without recoloring or extra frosting', () => {
  for (const layers of [1, 2, 3] as const) {
    const cake = applyCakePatch(createTemplateCake('chocolate'), {
      layers, inscription: 'Happy Birthday Eda',
      // Saved legacy color selections must not recolor the prototype.
      colors: { frosting: 'lavender', inscription: 'chocolate-brown' },
    }).state;
    const markup = renderToStaticMarkup(createElement(CakeScene, { cake }));
    assert.ok(markup.includes(`/art/chocolate-${layers}.png`), `chocolate ${layers} original artwork`);
    assert.ok(!markup.includes('smooth-top-tint') && !markup.includes('white-piped-swirls'),
      'No artificial colored frosting or white piping layers');
    assert.ok(!markup.includes('data-color-target="smooth-top-frosting"'),
      'Frosting color changes do not render');
    assert.ok(markup.includes('Cake inscription: Happy Birthday Eda'), 'Customer lettering stays visible');
    assert.ok(markup.indexOf('cake-base') < markup.indexOf('data-writing-font'),
      'Writing is drawn over the base cake');
  }
});

test('crowded chocolate cake keeps tidy fruit groups and leaves old syrup drips out of the preview', () => {
  const cake = applyCakePatch(createTemplateCake('chocolate'), {
    layers: 1,
    toppers: ['unicorn'],
    toppings: ['strawberries','raspberries','gold-stars','ganache','caramel'],
    colors: { frosting: 'sky-blue' },
  }).state;
  const scene = renderToStaticMarkup(createElement(CakeScene, { cake }));
  assert.ok(scene.includes('data-decoration="strawberries"'));
  assert.ok(scene.includes('data-decoration="raspberries"'));
  assert.ok(scene.includes('data-decoration="gold-stars"'));
  assert.ok(scene.includes('data-decoration="unicorn"'));
  assert.ok(!scene.includes('data-decoration="caramel"'));
  assert.ok(!scene.includes('data-decoration="ganache"'));
  assert.ok(!scene.includes('url(#undefined'));
  assert.ok(!scene.includes('data-decoration="white-piped-swirls"'));
  assert.ok(!scene.includes('data-color-target="smooth-top-frosting"'),
    'Crowded cakes must also keep the original frosting unchanged');
});

test('mixed berries shrink and occupy distinct sides rather than stacking in one pile', () => {
  const cake = applyCakePatch(createTemplateCake('classic'), {
    toppings: ['strawberries','raspberries'], toppers: ['unicorn'],
  }).state;
  const svg = renderToStaticMarkup(createElement(CakeScene, { cake }));
  assert.equal((svg.match(/href="\/art\/strawberry-fan.png"/g) ?? []).length, 2);
  assert.ok((svg.match(/fill="#b93451"/g) ?? []).length >= 10);
  assert.ok(svg.includes('translate(354 168)'), 'Raspberry cluster stays on the right');
  assert.ok(svg.includes('x="119" y="158"'), 'Strawberries stay on the left');
});

test('prepared topper colors are boosted, and plain candles are thicker without getting taller', () => {
  const cake = applyCakePatch(createTemplateCake('red-velvet'), {
    toppers: ['christmas-tree'], candles: { style: 'plain', count: 5 },
  }).state;
  const svg = renderToStaticMarkup(createElement(CakeScene, { cake }));
  assert.ok(svg.includes('vibrant-topper'), 'Prepared fondant artwork should have a color saturation filter');
  assert.equal((svg.match(/data-candle-body="wide"/g) ?? []).length, 5,
    'Five candles should render wider bodies');
  assert.ok(svg.includes('M-4.5 0v-59q4.5-3 9 0V0Z'), 'The candle body should be wider but preserve its 59-unit height');
});

test('all cake flavors and layer counts use the original frosting, including legacy colored baskets', () => {
  for (const flavor of ['vanilla','chocolate','red-velvet','lemon'] as const) {
    for (const layers of [1,2,3] as const) {
      for (const frosting of ['white','blush-pink','lavender','sky-blue','mint'] as const) {
        const cake = applyCakePatch(createTemplateCake('classic'), { flavor, layers, colors: { frosting } }).state;
        const markup = renderToStaticMarkup(createElement(CakeScene, { cake }));
        assert.ok(markup.includes(`/art/${flavor}-${layers}.png`), 'Original prepared cake image is used');
        assert.ok(!markup.includes('data-color-target="smooth-top-frosting"'));
        assert.ok(!markup.includes('always-white-top-frosting'));
        assert.ok(!markup.includes('data-decoration="white-piped-swirls"'));
        assert.ok(!markup.includes('smooth-top-only') && !markup.includes('cake-side-mask'),
          'No artificial frosting overlays or masks in the simple prototype');
      }
    }
  }
});

test('Red Velvet starter renders the prepared two-layer red sponge, not an invented design', () => {
  const cake = createTemplateCake('red-velvet');
  const markup = renderToStaticMarkup(createElement(CakeScene, { cake }));
  assert.ok(markup.includes('href="/art/red-velvet-2.png"'), 'Uses the existing red velvet artwork');
  assert.ok(!markup.includes('href="/art/masks/frosting-2.png"'),
    'No extra frosting is painted over the red velvet artwork');
  assert.ok(!markup.includes('/art/vanilla-1.png'), 'Does not use the old Pastel starter');
});

test('birthday with sprinkles starts with vanilla cake and curated sugar decorations', () => {
  const cake = createTemplateCake('sprinkles');
  const markup = renderToStaticMarkup(createElement(CakeScene, { cake }));
  assert.ok(markup.includes('href="/art/vanilla-1.png"'), 'Use the classic birthday cake image');
  assert.ok(markup.includes('data-decoration="sprinkles"'), 'Preset shows colorful sprinkles');
  assert.ok((markup.match(/data-sprinkle="sugar-rod"/g) ?? []).length >= 25, 'Has plenty of tiny colored sugar rods');
  assert.ok(!markup.includes('smooth-top-tint'), 'No frosting recoloring needed for sprinkles');
  const crowded = applyCakePatch(cake, { toppers: ['unicorn'], inscription: 'Eda' }).state;
  const crowdedHtml = renderToStaticMarkup(createElement(CakeScene, { cake: crowded }));
  const crowdedCount = (crowdedHtml.match(/data-sprinkle="sugar-rod"/g) ?? []).length;
  assert.ok(crowdedCount > 5 && crowdedCount < 30, 'Fewer sprinkles when writing or topper needs space');
});
