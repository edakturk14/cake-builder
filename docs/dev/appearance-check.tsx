import React from 'react';
import {createRoot} from 'react-dom/client';
import {CakeScene} from '../../src/components/CakeScene';
import {EMPTY_CAKE,type CakeState} from '../../src/shared/cake';
import '../../src/styles/builder.css';
const requested:CakeState={...EMPTY_CAKE,exists:true,flavor:'vanilla',layers:2,toppers:['castle','princess'],colors:{frosting:'blush-pink',filling:'lavender',inscription:'gold',accents:'sky-blue'},topperStyles:{castle:{size:'large',position:'right',tint:'blush-pink'},princess:{size:'medium',position:'left',tint:null}},inscription:'Happy Birthday, Selin',inscriptionStyle:{font:'print',letterCase:'upper',size:'large',placement:'front'},candles:{style:'number',number:'40',count:null}};
const examples:{label:string;cake:CakeState;compact?:boolean}[]=[
  {label:'Pink frosting · lavender filling · gold capitals · big castle · princess left',cake:requested},
  {label:'Natural chocolate · princess + castle · exact Eda inscription',cake:{...EMPTY_CAKE,exists:true,toppers:['princess','castle'],inscription:'Eda',candles:{style:'number',number:'40',count:null}}},
  {label:'Sky-blue frosting · mint filling · white script · subtle pink unicorn tint',cake:{...EMPTY_CAKE,exists:true,layers:1,toppers:['unicorn'],topperStyles:{unicorn:{size:'medium',position:'left',tint:'blush-pink'}},colors:{frosting:'sky-blue',filling:'mint',inscription:'white',accents:'coral'},inscription:'Happy Birthday, Ada',candles:{style:'plain',number:null,count:5}}},
  {label:'Largest castle on tallest cake · fixed extra headroom',cake:{...EMPTY_CAKE,exists:true,layers:3,toppers:['castle'],topperStyles:{castle:{size:'large',position:'center',tint:null}},inscription:'Ada'}},
  {label:'Small left / large right · centered print · numeral at front-left',cake:{...requested,layers:3,toppers:['princess','castle'],inscriptionStyle:{font:'print',letterCase:'upper',size:'large',placement:'center'},topperStyles:{princess:{size:'small',position:'left',tint:'lavender'},castle:{size:'large',position:'right',tint:null}},candles:{style:'number',number:'100',count:null}}},
  {label:'Cheesecake colors retain baked texture · twelve plain candles',cake:{...EMPTY_CAKE,exists:true,base:'cheesecake',flavor:'classic',layers:1,colors:{frosting:'peach',filling:'ivory',inscription:'chocolate-brown',accents:'lavender'},inscription:'Happy Birthday, Selin',candles:{style:'plain',number:null,count:12}}},
  {label:'Custom plaque remains until its image has loaded (QA asset)',cake:{...EMPTY_CAKE,exists:true,flavor:'vanilla',customTopper:{request:'Moon adventure',assetId:'qa-custom-moon'},inscription:'Ada'}},
  {label:'Saved basket thumbnails use the identical renderer and appearance',cake:requested,compact:true},
  {label:'Two large toppers + custom plaque + twelve candles + uppercase writing',cake:{...requested,customTopper:{request:'Garden party',assetId:null},topperStyles:{castle:{size:'large',position:'center',tint:null},princess:{size:'large',position:'center',tint:null}},candles:{style:'plain',number:null,count:12}}},
];
createRoot(document.getElementById('root')!).render(<>
  <style>{`body{padding:22px}h1{font:26px Georgia;margin:0 0 20px}.grid{display:grid;grid-template-columns:repeat(3,512px);gap:20px}.card{height:610px;border-top:1px solid #dfc7ba}.card h2{font:13px/1.4 system-ui;height:40px;margin:12px 8px 0}.card>.cake-scene:not(.cake-scene--compact){width:512px;height:550px;margin:0}.card>.cake-scene--compact{margin:70px auto}*{animation:none!important}`}</style>
  <h1>Appearance renderer checks · prepared artwork, no live generation</h1>
  <div className="grid">{examples.map(({label,cake,compact},index)=><section className="card" key={index} data-case={index}><h2>{label}</h2><CakeScene cake={cake} compact={compact}/></section>)}</div>
</>);
