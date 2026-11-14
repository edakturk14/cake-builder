import { useState } from 'react';
import type { CustomTopper as CustomDesign } from '../shared/cake';
import type { PlacedTopper } from './topperLayout';
import art from '../art/toppersManifest.json';

export function CustomTopper({design,placement,top,onImageError,imageAttempt=0}:{design:CustomDesign;placement:PlacedTopper;top:number;onImageError?:()=>void;imageAttempt?:number}){
  const [loadedAsset,setLoadedAsset]=useState<string|null>(null);
  const loaded=Boolean(design.assetId&&loadedAsset===design.assetId);
  const width=placement.width,height=placement.height;
  const plaqueScale=width/art.renderSize.width;
  return <>
    {!loaded&&<g className="cake-decoration" data-decoration="custom-topper" transform={`translate(${placement.center} ${placement.contact+top-72*plaqueScale}) scale(${plaqueScale})`}>
      <title>{`${design.request}, custom decoration to be quoted`}</title>
      <path d="M-58-22Q0-32 58-22L54 19Q0 27-54 19Z" fill="#f8e8d3" stroke="#c6996e"/>
      <path d="M-27 22v50m54-50v50" stroke="#bd966f" strokeWidth="3"/>
      <text textAnchor="middle" y="3" fill="#78513d" fontSize="11" fontFamily="sans-serif">{design.request.length>24?`${design.request.slice(0,23)}…`:design.request}</text>
      <text textAnchor="middle" y="15" fill="#98775f" fontSize="7">CUSTOM TOPPER · TO QUOTE</text>
    </g>}
    {design.assetId&&<g key={design.assetId} className={loaded?'cake-decoration':''} data-decoration="custom-topper-generated" opacity={loaded?1:0}>
      <title>{`${design.request}, generated custom fondant topper`}</title>
      <ellipse cx={placement.center} cy={placement.contact-1+top} rx={width*.235} ry={width*.035} fill="#583622" opacity=".15"/>
      <image href={`/api/topper-image/${encodeURIComponent(design.assetId)}${imageAttempt?`?retry=${imageAttempt}`:''}`} x={placement.center-width*art.anchor.x} y={placement.contact+top-height*art.anchor.y} width={width} height={height} preserveAspectRatio="xMidYMax meet" onLoad={()=>setLoadedAsset(design.assetId)} onError={()=>{setLoadedAsset(null);onImageError?.();}}/>
    </g>}
  </>;
}
