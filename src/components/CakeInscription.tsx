import { useLayoutEffect, useRef, useState } from 'react';
import type { InscriptionStyle } from '../shared/appearance';

interface Props { text:string; style:InscriptionStyle; color:string; darkSurface:boolean; top:number; maxWidth:number }
export function CakeInscription({text,style,color,darkSurface,top,maxWidth}:Props){
  const display=style.letterCase==='upper'?text.toUpperCase():text;
  const words=display.split(' ');
  let lines=[display];
  if(display.length>15&&words.length>1){
    let split=1,best=Infinity;
    for(let i=1;i<words.length;i++){
      const difference=Math.abs(words.slice(0,i).join(' ').length-words.slice(i).join(' ').length);
      if(difference<=best){split=i;best=difference;}
    }
    lines=[words.slice(0,split).join(' '),words.slice(split).join(' ')];
  }
  const size=(lines.length>1?40:48)*({small:.75,medium:1,large:1.25}[style.size]);
  const ref=useRef<SVGTextElement>(null);
  const [fit,setFit]=useState(1);
  const family=style.font==='print'?"'DM Sans',sans-serif":"'Snell Roundhand','Apple Chancery','Brush Script MT',cursive";
  useLayoutEffect(()=>{
    let alive=true;
    const measure=()=>{
      if(!alive||!ref.current)return;
      const spans=[...ref.current.querySelectorAll('tspan')];
      const width=Math.max(...spans.map(span=>span.getComputedTextLength()),1);
      const height=Math.max(ref.current.getBBox().height*.82,1);
      setFit(Math.min(1,maxWidth/width,(lines.length>1?52:45)/height));
    };
    measure();
    void document.fonts.ready.then(measure);
    return()=>{alive=false;};
  },[display,size,family,maxWidth,lines.length]);
  const center=style.placement==='center';
  const baseline=lines.length>1?(center?194:211):(center?205:228);
  const rgb=color.replace('#','').match(/../g)!.map(value=>parseInt(value,16)/255);
  const light=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>.62;
  const needsOutline=light!==darkSurface;
  return <g className="cake-inscription" data-writing-font={style.font} data-writing-placement={style.placement} transform={`translate(256 ${baseline+top}) scale(1 .82) skewX(${style.font==='print'?0:-10})`}>
    <g transform={`scale(${fit})`}>
      <text ref={ref} textAnchor="middle" fontFamily={family} fontStyle={style.font==='script'?'italic':'normal'} fontWeight="600" fontSize={size} fill={color} stroke={needsOutline?(light?'#795745':'#fff0d3'):color} strokeWidth={needsOutline?1.1:.65} paintOrder="stroke" style={{filter:`drop-shadow(.5px 1px .4px ${light?'#714b3f66':'#fff3daaa'})`}}>
        {lines.map((line,index)=><tspan key={index} x="0" dy={index?size*.9:0}>{line}</tspan>)}
      </text>
    </g>
  </g>;
}
