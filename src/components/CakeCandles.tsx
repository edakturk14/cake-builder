import { useLayoutEffect, useRef, useState } from 'react';
import type { CakeState } from '../shared/cake';
import type { PlacedTopper } from './topperLayout';
import { candleSpace } from './topperLayout';

interface Point {x:number;y:number;scale:number}
interface Rect {left:number;right:number;top:number;bottom:number}
const intersects=(a:Rect,b:Rect)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
const numberFront=(cake:CakeState,toppers:PlacedTopper[])=>toppers.length>2||Boolean(cake.inscription&&cake.inscriptionStyle.placement==='center');

export function plainCandlePositions(cake:CakeState,toppers:PlacedTopper[],writingWidth:number):Point[]{
  const count=cake.candles.count??5;
  const cy=cake.base==='cheesecake'?200:187;
  const rx=149,ry=cake.base==='cheesecake'?55:62;
  const textSize=48*({small:.75,medium:1,large:1.25}[cake.inscriptionStyle.size]);
  const longest=cake.inscription.split(' ').reduce((max,word)=>Math.max(max,word.length),0);
  const estimated=cake.inscription.length>15?Math.max(longest,cake.inscription.length*.6):cake.inscription.length;
  const textWidth=Math.min(writingWidth,estimated*textSize*.65);
  const writing:Rect={left:256-textWidth/2-5,right:256+textWidth/2+5,top:cake.inscriptionStyle.placement==='center'?165:187,bottom:260};
  const obstacles:Rect[]=toppers.map(item=>({left:item.center-item.halfWidth-3,right:item.center+item.halfWidth+3,top:item.contact-item.height*.9,bottom:item.contact+3}));
  if(cake.inscription)obstacles.push(writing);
  const initial=count>8?32:count>5?42:toppers.length?56:80;
  for(const height of [initial,initial*.8,26]){
    const scale=height/80,half=8*scale+1.5;
    const candidates:{point:Point;box:Rect;angle:number;distance:number}[]=[];
    let distance=0;
    for(let angle=0;angle<360;angle++){
      const theta=angle*Math.PI/180;
      const point={x:256+rx*Math.cos(theta),y:cy+ry*Math.sin(theta),scale};
      const box={left:point.x-half,right:point.x+half,top:point.y-height,bottom:point.y+2};
      if(obstacles.some(obstacle=>intersects(box,obstacle)))continue;
      const previous=candidates.at(-1);
      if(previous&&angle-previous.angle===1)distance+=Math.hypot(point.x-previous.point.x,point.y-previous.point.y);
      candidates.push({point,box,angle,distance});
    }
    const selected:typeof candidates=[];
    for(let index=0;index<count;index++){
      const target=distance*(index+.5)/count;
      const nearest=[...candidates].sort((a,b)=>Math.abs(a.distance-target)-Math.abs(b.distance-target)).find(candidate=>!selected.some(other=>intersects(candidate.box,other.box)));
      if(nearest)selected.push(nearest);
    }
    if(selected.length===count)return selected.map(item=>item.point);
  }
  // Dense arrangements use the two free front flanks, still on the same top ellipse.
  return Array.from({length:count},(_,index)=>{
    const leftCount=Math.ceil(count/2),left=index<leftCount;
    const sideIndex=left?index:index-leftCount,sideCount=left?leftCount:count-leftCount;
    const x=sideCount===1?140:123+35*sideIndex/(sideCount-1);
    return {x:left?x:512-x,y:cy+ry*Math.sqrt(1-((x-256)/rx)**2),scale:.36};
  });
}

function NumberCandle({number,fontSize,color,stroke}:{number:string;fontSize:number;color:string;stroke:string}){
  const ref=useRef<SVGTextElement>(null);
  const [extents,setExtents]=useState<{cx:number;center:number;top:number;bottom:number}[]>([]);
  useLayoutEffect(()=>{
    let alive=true;
    const measure=()=>{
      if(!alive||!ref.current)return;
      // Metrics APIs (getExtentOfChar, measureText) return font-level boxes for
      // old-style Georgia figures, not the visible ink. Rasterize each digit with
      // the same font and scan pixels for its true ink box and highest-ink point.
      const style=getComputedStyle(ref.current);
      const font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const canvas=document.createElement('canvas');
      const context=canvas.getContext('2d',{willReadFrequently:true});
      if(!context)return;
      context.font=font;
      const pad=Math.ceil(fontSize*.2);
      const advances=[...number].map(digit=>context.measureText(digit).width);
      const total=advances.reduce((sum,width)=>sum+width,0);
      const baselineY=Math.ceil(fontSize*1.15);
      const height=Math.ceil(fontSize*1.55);
      let start=-total/2;
      const next=[...number].map((digit,index)=>{
        const width=Math.ceil(advances[index])+pad*2;
        canvas.width=width;canvas.height=height;
        context.font=font;context.textBaseline='alphabetic';
        context.fillStyle='#000';
        context.fillText(digit,pad,baselineY);
        const pixels=context.getImageData(0,0,width,height).data;
        let minY=height,maxY=0,minX=width,maxX=0,found=false;
        for(let y=0;y<height;y++)for(let x=0;x<width;x++){
          if(pixels[(y*width+x)*4+3]>40){found=true;if(y<minY)minY=y;if(y>maxY)maxY=y;if(x<minX)minX=x;if(x>maxX)maxX=x;}
        }
        const digitStart=start;
        start+=advances[index];
        if(!found)return null;
        let sumX=0,count=0;
        const band=Math.max(3,Math.round(fontSize*.08));
        for(let y=minY;y<Math.min(height,minY+band);y++)for(let x=0;x<width;x++){
          if(pixels[(y*width+x)*4+3]>40){sumX+=x;count++;}
        }
        return {
          cx:digitStart+(count?sumX/count:(minX+maxX)/2)-pad,
          center:digitStart+(minX+maxX)/2-pad,
          top:minY-baselineY,
          bottom:maxY-baselineY,
        };
      });
      if(next.some(item=>item===null))return;
      const resolved=next as {cx:number;center:number;top:number;bottom:number}[];
      setExtents(previous=>previous.length===resolved.length&&previous.every((item,index)=>Math.abs(item.cx-resolved[index].cx)<.5&&Math.abs(item.top-resolved[index].top)<.5&&Math.abs(item.bottom-resolved[index].bottom)<.5)?previous:resolved);
    };
    measure();
    void document.fonts.ready.then(measure);
    return()=>{alive=false;};
  },[number,fontSize]);
  const scale=fontSize/68;
  // Old-style figures (3, 4, 5, 7, 9) descend below the baseline; lift the numeral
  // so the lowest digit ink touches the cake surface.
  const lift=Math.max(0,...extents.map(extent=>extent.bottom));
  return <>
    {extents.map((extent,index)=><ellipse key={index} cx={extent.center} cy="1" rx={Math.max(5,fontSize*.16)} ry="2" fill="#583622" opacity=".2"/>)}
    <g transform={`translate(0 ${-lift})`}>
      <text ref={ref} textAnchor="middle" fill={color} stroke={stroke} strokeWidth="1.5" paintOrder="stroke" fontFamily="Georgia,serif" fontWeight="bold" fontSize={fontSize}>{number}</text>
      {extents.map((extent,index)=>{
        const wickTop=extent.top-4*scale;
        return <g key={index}>
          <path d={`M${extent.cx} ${extent.top+2}V${wickTop}`} stroke="#684a35" strokeWidth={Math.max(1.2,2*scale)}/>
          <g transform={`translate(${extent.cx} ${wickTop}) scale(${scale})`}>
            <path d="M0 0Q-7.5-11 0-23Q7.5-11 0 0" fill="#f2a13d" stroke="#c07a24" strokeWidth=".6"/>
            <path d="M0-3.5Q-3.8-10 0-16.5Q3.8-10 0-3.5" fill="#ffe9ad"/>
          </g>
        </g>;
      })}
    </g>
  </>;
}

export function CakeCandles({cake,top,toppers,accent,darkSurface,writingWidth}:{cake:CakeState;top:number;toppers:PlacedTopper[];accent?:string;darkSurface:boolean;writingWidth:number}){
  if(cake.candles.style==='none')return null;
  if(cake.candles.style==='plain')return <g className="cake-decoration" data-decoration="plain-candles">
    {plainCandlePositions(cake,toppers,writingWidth).sort((a,b)=>a.y-b.y).map((point,index)=><g key={index} data-plain-candle={index+1} transform={`translate(${point.x} ${point.y+top}) scale(${point.scale})`}>
      <ellipse cy="1" rx="8.5" ry="2" fill="#583622" opacity=".2"/>
      <path data-candle-body="wide" d="M-4.5 0v-59q4.5-3 9 0V0Z" fill={accent??'#fff0c8'} stroke="#b88c61" strokeWidth=".7"/>
      <path d="M-3.3-9l6.6-9m-6.6-6 6.6-9m-6.6-6 6.6-9" stroke="#dfb39d" strokeWidth="1.5"/>
      <path d="M0-59v-6" stroke="#684a35" strokeWidth="1.2"/>
      <path d="M0-65Q-7-74 0-84Q7-74 0-65" fill="#f2a13d" stroke="#c07a24" strokeWidth=".6"/>
      <path d="M0-68.5Q-3.6-75 0-80.5Q3.6-75 0-68.5" fill="#ffe9ad"/>
    </g>)}
  </g>;
  const space=candleSpace(toppers);
  const front=numberFront(cake,toppers);
  const digits=cake.candles.number?.length||1;
  const fontSize=front?Math.min(48,80/digits):Math.min(toppers.length===2?48:68,(space.width-4)/(digits*.65));
  // Bring numeral candles closer to the visual center without covering prepared toppers.
  const x=front?190:space.center + Math.sign(256-space.center)*Math.min(36, Math.abs(256-space.center)*.4);
  const y=front?(cake.base==='cheesecake'?220:224):(cake.base==='cheesecake'?200:187);
  return <g className="cake-decoration" data-decoration="number-candles" data-candle-contact={y+top} transform={`translate(${x} ${y+top})`}>
    <NumberCandle number={cake.candles.number??''} fontSize={fontSize} color={accent??(darkSurface?'#ffefbf':'#b86672')} stroke={darkSurface?'#bc8c38':'#763e47'}/>
  </g>;
}
