import React from 'react';
import { createRoot } from 'react-dom/client';
import { CakeScene } from '../../src/components/CakeScene';
import { EMPTY_CAKE, type CakeState } from '../../src/shared/cake';
import { TOPPER_CATALOG } from '../../src/shared/toppers';
import '../../src/styles/builder.css';

const pairs: CakeState[] = [
  { ...EMPTY_CAKE, exists:true, flavor:'chocolate', layers:3, toppers:['castle','dragon'], inscription:'Ada', candles:{style:'number',number:'40'} },
  { ...EMPTY_CAKE, exists:true, flavor:'vanilla', layers:2, toppers:['bride-and-groom','flower-bouquet'], inscription:'Happy birthday, Selin', candles:{style:'plain',number:null} },
  { ...EMPTY_CAKE, exists:true, flavor:'lemon', layers:1, toppers:['rainbow','balloons'], inscription:'Game, Set, Match', candles:{style:'number',number:'100'} },
  { ...EMPTY_CAKE, exists:true, flavor:'red-velvet', layers:3, toppers:['cat','dog'], inscription:'Happy Birthday, Mira', candles:{style:'number',number:'41'} },
];
createRoot(document.getElementById('root')!).render(<>
  <style>{`body{padding:20px}h1{font:26px Georgia,serif;margin:0 0 16px}h2{font:13px system-ui;margin:0;text-align:center} .gallery{display:grid;grid-template-columns:repeat(7,300px);gap:12px}.card{height:280px}.card .cake-scene{width:300px;height:260px;margin:0}.pairs{display:grid;grid-template-columns:repeat(4,512px);margin-bottom:30px}.pairs .cake-scene{width:512px;height:470px}*{animation:none!important}`}</style>
  <h1>Prepared topper contact and placement checks</h1>
  <section className="pairs">{pairs.map((cake,i)=><div key={i}><h2>{cake.toppers.join(' + ')} · {cake.candles.number || 'plain candles'}</h2><CakeScene cake={cake}/></div>)}</section>
  <section className="gallery">{TOPPER_CATALOG.map(({id,label})=><div className="card" key={id}><h2>{label}</h2><CakeScene cake={{...EMPTY_CAKE,exists:true,flavor:'vanilla',layers:2,toppers:[id],inscription:'Ada'}}/></div>)}</section>
</>);
