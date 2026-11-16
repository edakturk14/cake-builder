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
    assert.ok(markup.includes('buttercream-tint'), `chocolate ${layers} natural frosting tint`);
    const matrix = markup.match(/buttercream-tint"[^>]*><feColorMatrix[^>]*values="([^"]+)"/);
    assert.ok(matrix, `chocolate ${layers} has a tint matrix`);
    assert.equal(matrix[1].trim().split(/\s+/).length, 20, `chocolate ${layers} uses a valid 4x5 SVG matrix`);
    assert.ok(markup.includes('Cake inscription: Happy Birthday Eda'), `chocolate ${layers} labeled writing`);
    assert.ok(markup.includes('Happy Birthday') && markup.includes('Eda'), `chocolate ${layers} rendered lettering`);
    assert.ok(markup.indexOf('cake-base') < markup.indexOf('data-writing-font'), `chocolate ${layers} writing painted after base`);
  }
});
