import type { CakeState } from '../shared/cake';
import { getTopperStyle, type PaletteId } from '../shared/appearance';
import type { TopperId } from '../shared/toppers';
import art from '../art/toppersManifest.json';

export interface PlacedTopper {
  id: TopperId | 'custom';
  center: number;
  contact: number;
  width: number;
  height: number;
  halfWidth: number;
  tint: PaletteId | null;
}
const SIZE_SCALE = { small: .75, medium: 1, large: 1.25 };
const clamp = (value:number,min:number,max:number) => Math.max(min,Math.min(max,value));

export function placeToppers(cake: CakeState): PlacedTopper[] {
  const ids: (TopperId|'custom')[] = [...cake.toppers, ...(cake.customTopper ? ['custom' as const] : [])];
  const count=ids.length;
  // Keep prepared figures in proportion to the cake, especially when fruit is present.
  const hasFruit=cake.toppings.includes('strawberries')||cake.toppings.includes('raspberries');
  const groupScale=count>2 ? .55 : count>1 ? .74 : hasFruit ? .78 : .90;
  const placed=ids.map((id,index) => {
    const style=id==='custom' ? {size:'medium' as const,position:'auto' as const,tint:null} : getTopperStyle(cake.topperStyles,id);
    const scale=groupScale*SIZE_SCALE[style.size]*(id==='custom'?1:art.items[id].scale);
    const width=art.renderSize.width*scale;
    const height=art.renderSize.height*scale;
    const bounds=id==='custom' ? [14,26,242,306] : art.items[id].bounds;
    const halfWidth=(bounds[2]-bounds[0])/art.canvas.width*width/2;
    const automatic=count>2 ? [150,256,362][index] : count===2 ? [176,336][index] : 256;
    const desired=style.position==='auto' ? automatic : {left:172,center:256,right:340}[style.position];
    return {id,center:clamp(desired,96+halfWidth,416-halfWidth),contact:cake.inscriptionStyle.placement==='center'?164:177,width,height,halfWidth,tint:style.tint};
  });
  if(count>1){
    const ordered=[...placed].sort((a,b)=>a.center-b.center);
    const gap=count===2 && cake.candles.style!=='none' ? 64 : 12;
    for(let i=1;i<ordered.length;i++){
      const minimum=ordered[i-1].halfWidth+ordered[i].halfWidth+gap;
      if(count>2){
        ordered[i].center=Math.max(ordered[i].center,ordered[i-1].center+minimum);
      }else if(ordered[i].center-ordered[i-1].center<minimum){
        const midpoint=(ordered[i].center+ordered[i-1].center)/2;
        ordered[i-1].center=midpoint-minimum/2;
        ordered[i].center=midpoint+minimum/2;
      }
    }
    const left=ordered[0].center-ordered[0].halfWidth;
    const right=ordered[count-1].center+ordered[count-1].halfWidth;
    const shift=left<96?96-left:right>416?416-right:0;
    ordered.forEach(item=>{item.center+=shift;});
  }
  return placed;
}

export function candleSpace(toppers: PlacedTopper[]) {
  if(!toppers.length) return {center:256,width:150};
  const intervals: [number,number][]=[];
  let cursor=110;
  for(const topper of [...toppers].sort((a,b)=>a.center-b.center)){
    const left=Math.max(110,topper.center-topper.halfWidth-7);
    if(left>cursor) intervals.push([cursor,left]);
    cursor=Math.max(cursor,topper.center+topper.halfWidth+7);
  }
  if(cursor<402) intervals.push([cursor,402]);
  const preferred=toppers.length===2?256:366;
  const options=intervals.filter(([a,b])=>b-a>=30);
  const candidates=options.length?options:intervals;
  const best=candidates.sort((a,b)=>{
    const score=(range:[number,number])=>Math.abs(clamp(preferred,range[0],range[1])-preferred)-(range[1]-range[0])*.05;
    return score(a)-score(b);
  })[0]??[112,154];
  const width=best[1]-best[0];
  return {center:clamp(preferred,best[0]+width/2,best[1]-width/2),width};
}
