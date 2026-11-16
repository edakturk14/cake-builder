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

test('inscription appears in the preview above the frosting on chocolate 1, 2 and 3 layers', () => {
  for (const layers of [1, 2, 3] as const) {
    const cake = applyCakePatch(createTemplateCake('chocolate'), {
      layers, inscription: 'Happy Birthday Eda',
      colors: { frosting: 'lavender', inscription: 'white' },
    }).state;
    const markup = renderToStaticMarkup(createElement(CakeScene, { cake }));
    assert.ok(markup.includes(`/art/chocolate-${layers}.png`), `chocolate ${layers} base`);
    assert.ok(markup.includes(`/art/masks/frosting-${layers}.png`), `chocolate ${layers} frosting mask`);
    assert.ok(markup.includes('/art/masks/side-' + layers + '.png'),
      `chocolate ${layers} reuses the prepared side silhouette`);
    assert.ok(markup.includes('data-mask-target="colorable-side"'),
      `chocolate ${layers} has a luminance mask for the lower cake side`);
    assert.ok(markup.includes('data-color-target="frosting-side"'),
      `chocolate ${layers} recolors only the cake's side`);
    assert.ok(markup.includes('data-decoration="always-white-top-frosting"'),
      `chocolate ${layers} keeps the entire top frosting ivory`);
    assert.ok(!markup.includes('frosting-center') && !markup.includes('white-frosting-ring'),
      `chocolate ${layers} never paints a colored top ellipse`);
    assert.ok(markup.indexOf('data-color-target="frosting-side"') < markup.indexOf('data-decoration="always-white-top-frosting"'),
      `chocolate ${layers} paints white frosting after the tinted side`);
    const matrix = markup.match(/side-frosting-tint"[^>]*><feColorMatrix[^>]*values="([^"]+)"/);
    assert.ok(matrix, `chocolate ${layers} has a tint matrix`);
    assert.equal(matrix[1].trim().split(/\s+/).length, 20, `chocolate ${layers} uses a valid 4x5 SVG matrix`);
    assert.ok(markup.includes('Cake inscription: Happy Birthday Eda'), `chocolate ${layers} labeled writing`);
    assert.ok(markup.includes('Happy Birthday') && markup.includes('Eda'), `chocolate ${layers} rendered lettering`);
    assert.ok(markup.indexOf('cake-base') < markup.indexOf('data-writing-font'), `chocolate ${layers} writing painted after base`);
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
  assert.ok(scene.includes('data-decoration="white-piping"'));
  assert.ok(scene.includes('data-decoration="always-white-top-frosting"'));
  assert.ok(scene.indexOf('data-decoration="white-piping"') > scene.indexOf('data-color-target="frosting-side"'),
    'Ivory piping must render after tinting the side');
  assert.ok(scene.includes('/art/masks/accents-1.png'), 'Use the prepared separate icing accents mask');
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
  const cake = applyCakePatch(createTemplateCake('pastel'), {
    toppers: ['christmas-tree'], candles: { style: 'plain', count: 5 },
  }).state;
  const svg = renderToStaticMarkup(createElement(CakeScene, { cake }));
  assert.ok(svg.includes('vibrant-topper'), 'Prepared fondant artwork should have a color saturation filter');
  assert.equal((svg.match(/data-candle-body="wide"/g) ?? []).length, 5,
    'Five candles should render wider bodies');
  assert.ok(svg.includes('M-4.5 0v-59q4.5-3 9 0V0Z'), 'The candle body should be wider but preserve its 59-unit height');
});

test('top frosting never receives a color filter for any flavor or supported layer count', () => {
  for (const flavor of ['vanilla', 'chocolate', 'red-velvet', 'lemon'] as const) {
    for (const layers of [1, 2, 3] as const) {
      for (const frosting of ['white', 'blush-pink', 'lavender', 'sky-blue', 'mint'] as const) {
        const cake = applyCakePatch(createTemplateCake('classic'), { flavor, layers, colors: { frosting } }).state;
        const markup = renderToStaticMarkup(createElement(CakeScene, { cake }));
        assert.ok(markup.includes(`href="/art/masks/side-${layers}.png"`), `${flavor} ${layers} side mask`);
        assert.ok(markup.includes(`href="/art/masks/frosting-${layers}.png"`), `${flavor} ${layers} white top`);
        const tintedSide = markup.match(/<image data-color-target="frosting-side"[^>]+>/);
        const whiteTop = markup.match(/<image data-decoration="always-white-top-frosting"[^>]+>/);
        assert.ok(tintedSide && whiteTop, `${flavor}/${layers}/${frosting} has both layers`);
        assert.match(tintedSide[0], /mask="url\(#.+-cake-side-mask\)"/);
        assert.doesNotMatch(whiteTop[0], /side-frosting-tint|clip-path|mask=/);
        assert.ok(markup.indexOf(whiteTop[0]) > markup.indexOf(tintedSide[0]), 'white top is drawn after side');
      }
    }
  }
});
