import React from 'react';
import {createRoot} from 'react-dom/client';
import {CakeScene} from '../../src/components/CakeScene';
import {EMPTY_CAKE,type CakeState} from '../../src/shared/cake';
import '../../src/styles/builder.css';
const bases:CakeState[]=[
  {...EMPTY_CAKE,exists:true,base:'cheesecake',flavor:'classic',layers:1},
  ...([1,2,3] as const).map(layers=>({...EMPTY_CAKE,exists:true,flavor:'vanilla' as const,layers})),
];
const rows=[
  {label:'Numeral 3 · original reported cheesecake case',patch:{candles:{style:'number',number:'3',count:null}}},
  {label:'Numeral 40 · princess + castle · exact writing',patch:{toppers:['princess','castle'],inscription:'Selin',candles:{style:'number',number:'40',count:null}}},
  {label:'Five plain candles · evenly spaced on the top ellipse',patch:{inscription:'Eda',candles:{style:'plain',number:null,count:5}}},
  {label:'Twelve candles · large paired toppers · uppercase writing',patch:{toppers:['princess','castle'],topperStyles:{princess:{size:'large',position:'left',tint:null},castle:{size:'large',position:'right',tint:null}},inscription:'Happy Birthday, Selin',inscriptionStyle:{font:'print',letterCase:'upper',size:'large',placement:'front'},candles:{style:'plain',number:null,count:12}}},
] satisfies {label:string;patch:Partial<CakeState>}[];
createRoot(document.getElementById('root')!).render(<>
  <style>{`body{padding:22px}h1{font:26px Georgia;margin:0 0 20px}.grid{display:grid;grid-template-columns:repeat(4,512px);gap:20px}.card{height:600px;border-top:1px solid #dfc7ba}.card h2{font:13px/1.4 system-ui;height:40px;margin:12px 8px 0}.card>.cake-scene:not(.cake-scene--compact){width:512px;height:550px;margin:0}*{animation:none!important}`}</style>
  <h1>Base-aware candle contact / attached flames / exact plain candle counts</h1>
  <div className="grid">{rows.flatMap((row,rowIndex)=>bases.map((base,index)=><section className="card" key={`${rowIndex}-${index}`} data-case={`${rowIndex}-${index}`}><h2>{base.base==='cheesecake'?'Cheesecake':`${base.layers}-layer sponge`} · {row.label}</h2><CakeScene cake={{...base,...row.patch}}/></section>))}</div>
</>);
