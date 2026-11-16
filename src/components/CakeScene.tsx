import { useId, useState } from 'react';
import type { CakeState } from '../shared/cake';
import { TOPPER_BY_ID } from '../shared/toppers';
import TOPPER_ART from '../art/toppersManifest.json';
import { paletteHex, PALETTE_BY_ID } from '../shared/appearance';
import { CakeInscription } from './CakeInscription';
import { CustomTopper } from './CustomTopper';
import { placeToppers } from './topperLayout';
import { CakeCandles } from './CakeCandles';
import { FruitDecorations } from './FruitDecorations';

function colorMatrix(hex:string,blend=1){
  const [r,g,b]=hex.replace('#','').match(/../g)!.map(channel=>parseInt(channel,16)/255);
  const keep=1-blend;
  return `${keep||r} 0 0 0 ${keep?r*blend:0} 0 ${keep||g} 0 0 ${keep?g*blend:0} 0 0 ${keep||b} 0 ${keep?b*blend:0} 0 0 0 1 0`;
}
/**
 * Tint the original buttercream texture instead of painting it a flat color.
 * Retains the source photo's highlights and shaded piping.
 */
function buttercreamMatrix(hex: string) {
  const rgb = hex.replace('#', '').match(/../g)!.map(channel => parseInt(channel, 16) / 255);
  const sourceLuminance = [0.2126, 0.7152, 0.0722];
  const original = 0.38, tint = 0.62, shadow = 0.78, highlight = 0.22;
  const coefficients = rgb.map((channel, output) => [
    ...sourceLuminance.map((luma, input) => (output === input ? original : 0) + tint * channel * shadow * luma),
    0, // no dependence on source alpha in RGB; alpha is preserved by the last row
    tint * channel * highlight,
  ]);
  return coefficients.flat().concat([0, 0, 0, 1, 0]).join(' ');
}

function lightColor(hex:string){
  const [r,g,b]=hex.replace('#','').match(/../g)!.map(channel=>parseInt(channel,16)/255);
  return r*.2126+g*.7152+b*.0722>.55;
}

function ThemeDecorations({ theme, id }: { theme: CakeState['theme']; id: string }) {
  if (!theme) return null;
  return <g className="cake-decoration" data-decoration={`theme-${theme}`}>
    {theme === 'mario' && <>
      <image href="/art/mushroom.png" x="220" y="68" width="104" height="90" />
      <image href="/art/coins.png" x="310" y="145" width="64" height="47" />
      <g transform="translate(164 142) rotate(-12)" filter={`url(#${id}-object)`}><path d="M-30 0Q-37-29-12-42Q10-55 31-33L36-9Q13 2-30 0" fill={`url(#${id}-red)`} /><path d="M-35-4Q-3-14 39-4Q50 3 27 10Q-2 13-35-4" fill="#bd352a" stroke="#90271d" /><ellipse cx="2" cy="-23" rx="12" ry="11" fill="#fff1d7" /><text x="2" y="-17" textAnchor="middle" fontFamily="Georgia,serif" fontWeight="bold" fontSize="16" fill="#bd352a">M</text></g>
    </>}
    {theme === 'formula-one' && <>
      <path d="M139 200Q125 159 161 143Q192 129 213 143M290 173Q347 152 379 187" fill="none" stroke="#e6c5a1" strokeWidth="3" strokeLinecap="round" />
      <image href="/art/checkered-flag.png" x="183" y="24" width="113" height="106" />
      <image href="/art/race-car.png" x="160" y="94" width="201" height="121" />
    </>}
    {theme === 'spain-world-cup' && <>
      <path d="M113 296Q255 375 405 296" fill="none" stroke="#b62c27" strokeWidth="16" /><path d="M113 296Q255 375 405 296" fill="none" stroke="#f2be35" strokeWidth="6" />
      <image href="/art/football.png" x="207" y="83" width="104" height="83" />
      {[[-112, 28], [-79, -7], [83, -1], [113, 37]].map(([x, y], index) => <g key={index} transform={`translate(${256 + x} ${146 + y}) scale(1.15 .67)`}><path d="M-13 1Q-22-8-12-15Q-1-23 10-12Q22-5 12 8Q0 20-13 1" fill={index % 2 ? '#f4c138' : '#c93830'} /><path d="M-9 0Q-4-10 7-7M-7 6Q3 10 9 0" fill="none" stroke={index % 2 ? '#ffe291' : '#e98772'} strokeWidth="3" strokeLinecap="round" /></g>)}
    </>}
    {theme === 'tennis' && <>
      <g transform="translate(256 181) scale(1 .48)" fill="none" stroke="#dde1ad" strokeWidth="2"><path d="M-105-45H105V65H-105ZM-105 10H105M-65-45V65M65-45V65M0-45V65" /><path d="M-105 9H105" stroke="#fff7d6" strokeWidth="4" /></g>
      <image href="/art/tennis-racket.png" x="190" y="66" width="140" height="113" />
      <image href="/art/tennis-ball.png" x="315" y="133" width="49" height="43" />
      <image href="/art/tennis-ball.png" x="344" y="164" width="44" height="39" />
    </>}
    {theme === 'jensen-huang' && <g transform="translate(257 132)" filter={`url(#${id}-object)`}>
      <ellipse cx="0" cy="36" rx="56" ry="12" fill="#dad1b3" />
      <g transform="translate(51 15) rotate(12)"><rect x="-25" y="-22" width="49" height="40" rx="4" fill="#4e754c" stroke="#b7bd80" /><rect x="-15" y="-14" width="29" height="24" fill="#2f3d31" stroke="#c2bb85" />{[-18, -8, 2, 12].map(x => <path key={x} d={`M${x}-23v-6m0 48v5M-25 ${x}h-7m57 0h7`} stroke="#c4b57a" strokeWidth="2" />)}</g>
      <path d="M-24 29-21-12 18-12 25 29 12 34-2 27-10 35Z" fill="#222221" stroke="#171817" strokeWidth="2" />
      <path d="M-19-14Q-34-11-39 10L-41 25-31 28-19 4M17-13Q32-11 36 8L40 24 30 29 21 5" fill={`url(#${id}-jacket)`} stroke="#161717" strokeWidth="2" />
      <path d="M-11-18 0-6 11-18 19-7 10 0 6-6 6 29M-19 9-9 6M10 7l13 5" fill="none" stroke="#7c7b71" strokeWidth="1.2" />
      <path d="M-34 29q-11 4-8-6l6-3M35 28q11 3 8-6l-6-3" fill="#c69773" />
      <path d="M-5-17v-10h13v11" fill="#bc8c6c" /><ellipse cx="1" cy="-43" rx="20" ry="25" fill={`url(#${id}-skin)`} />
      <path d="M-19-48Q-23-72 1-71 26-70 21-45L14-53 8-59-9-57Z" fill="#77786f" /><path d="M-17-59Q-2-71 14-60" stroke="#b5b4a6" fill="none" strokeWidth="3" />
      <path d="M-18-44h15v9h-14Zm22 0h15v9H5Zm-6 3H4" fill="#b5a792" fillOpacity=".3" stroke="#272b29" strokeWidth="2" /><path d="M-4-25q7 4 12-1" fill="none" stroke="#79543e" strokeWidth="1.5" /><path d="M2-35v5l4 1" fill="none" stroke="#9c7357" />
      <rect x="-49" y="39" width="98" height="18" rx="4" fill="#efe1c6" stroke="#b29a72" /><text y="51" textAnchor="middle" fontSize="9" fill="#4e493b" fontFamily="sans-serif">JENSEN HUANG</text>
    </g>}
  </g>;
}

export interface CakeSceneProps {
  cake: CakeState;
  compact?: boolean;
  className?: string;
  label?: string;
}

/** A fixed-camera composition. Every decoration belongs to this saved design. */
export function CakeScene({ cake, compact = false, className = '', label }: CakeSceneProps) {
  const id = useId().replace(/:/g, '');
  const [failedAsset, setFailedAsset] = useState<string | null>(null);
  const [imageAttempt, setImageAttempt] = useState(0);
  const imageFailed = Boolean(cake.customTopper?.assetId && failedAsset === cake.customTopper.assetId);
  const top = cake.base === 'cheesecake' ? 0 : cake.layers === 1 ? 56 : cake.layers === 3 ? -47 : 0;
  const flavor = cake.flavor === 'classic' ? 'vanilla' : cake.flavor;
  const darkCake = cake.base !== 'cheesecake' && (cake.flavor === 'chocolate' || cake.flavor === 'red-velvet');
  const darkSurface=cake.colors.frosting ? !lightColor(PALETTE_BY_ID[cake.colors.frosting].hex) : darkCake;
  const placements=placeToppers(cake);
  const crowded=placements.length>2;
  const writingWidth=crowded||cake.inscriptionStyle.placement==='center'||(cake.candles.count??0)>8||cake.toppings.some(topping=>topping==='strawberries'||topping==='raspberries')?180:236;
  const writingOffset=cake.candles.style==='number'&&!crowded&&cake.inscriptionStyle.placement==='front'?(cake.base==='cheesecake'?16:6):0;
  const accent=cake.colors.accents?PALETTE_BY_ID[cake.colors.accents].hex:undefined;
  const writingColor=paletteHex(cake.colors.inscription,darkSurface?'#ffedb9':'#562d30');
  const maskVariant=cake.base==='cheesecake'?'cheesecake':cake.layers;
  const coloredParts=(['filling'] as const).filter(part=>cake.colors[part]);
  const description = label ?? (cake.exists
    ? `${cake.layers}-layer ${cake.base === 'cheesecake' ? 'cheesecake' : flavor} cake${cake.theme ? `, ${cake.theme.replaceAll('-', ' ')} theme` : ''}${cake.toppers.map(id => `, ${TOPPER_BY_ID[id].label} topper`).join('')}${cake.customTopper ? `, custom topper: ${cake.customTopper.request}` : ''}${cake.toppings.length ? `, ${cake.toppings.join(', ')}` : ''}${cake.candles.style === 'number' ? `, ${cake.candles.number} candle` : cake.candles.style === 'plain' ? ', birthday candles' : ''}${cake.inscription ? `, icing reads ${cake.inscription}` : ''}`
    : 'Your cake will appear here');
  return (
    <div className={`cake-scene ${compact ? 'cake-scene--compact' : ''} ${className}`} data-empty={!cake.exists}>
      {!cake.exists ? (
        <div className="empty-stage" role="img" aria-label={description}>
          <span className="empty-stage-glow" />
          <p>A little imagination.<br /><span>Something delicious.</span></p>
        </div>
      ) : (
        <svg className="cake-art" viewBox="0 -80 512 550" role="img" aria-label={description}>
          <defs>
            <radialGradient id={`${id}-shadow`}><stop stopColor="#8e6245" stopOpacity=".20" /><stop offset="1" stopColor="#8e6245" stopOpacity="0" /></radialGradient>
            <filter id={`${id}-icing`} x="-.2" y="-.5" width="1.4" height="2"><feDropShadow dx="1" dy="2" stdDeviation="1" floodColor="#48220f" floodOpacity=".65" /></filter>
            <filter id={`${id}-icing-light`} x="-.2" y="-.5" width="1.4" height="2"><feDropShadow dx=".5" dy="1" stdDeviation=".4" floodColor="#fff5d7" floodOpacity=".85" /></filter>
            <filter id={`${id}-object`} x="-.3" y="-.3" width="1.6" height="1.8"><feDropShadow dx="2" dy="4" stdDeviation="2" floodColor="#48220f" floodOpacity=".25" /></filter>
            <linearGradient id={`${id}-gold`} x2="1" y2="1"><stop stopColor="#fff0aa" /><stop offset=".45" stopColor="#deb559" /><stop offset="1" stopColor="#a17428" /></linearGradient>
            <linearGradient id={`${id}-red`} x2=".2" y2="1"><stop stopColor="#ec7560" /><stop offset=".4" stopColor="#d53a2d" /><stop offset="1" stopColor="#9f261d" /></linearGradient>
            <linearGradient id={`${id}-jacket`}><stop stopColor="#181c1c" /><stop offset=".5" stopColor="#454a47" /><stop offset="1" stopColor="#232827" /></linearGradient>
            <radialGradient id={`${id}-skin`} cx=".35" cy=".3"><stop stopColor="#e1b991" /><stop offset="1" stopColor="#b88766" /></radialGradient>
            <filter id={`${id}-ivory-piping`} colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values={colorMatrix('#fff9ed')} />
            </filter>
            {cake.colors.frosting && <filter id={`${id}-buttercream-tint`} colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values={buttercreamMatrix(PALETTE_BY_ID[cake.colors.frosting].hex)} />
            </filter>}
            {coloredParts.map(part=><filter key={part} id={`${id}-color-${part}`} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values={colorMatrix(PALETTE_BY_ID[cake.colors[part]!].hex)}/></filter>)}
            {placements.filter(item=>item.tint).map(item=><filter key={item.id} id={`${id}-tint-${item.id}`} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values={colorMatrix(PALETTE_BY_ID[item.tint!].hex,.2)}/></filter>)}
          </defs>
          <ellipse cx="263" cy="428" rx="175" ry="25" fill={`url(#${id}-shadow)`} />
          <image href={`/art/${cake.base === 'cheesecake' ? 'cheesecake' : `${flavor}-${cake.layers}`}.png`} width="512" height="512" className="cake-base" />
          {cake.colors.frosting && <image data-color-target="frosting" href={`/art/masks/frosting-${maskVariant}.png`} width="512" height="512" filter={`url(#${id}-buttercream-tint)`} opacity=".86" style={{ mixBlendMode: "color" }}/>}
          {coloredParts.map(part=><image key={part} data-color-target={part} href={`/art/masks/${part}-${maskVariant}.png`} width="512" height="512" filter={`url(#${id}-color-${part})`}/>)}
          {/* The artwork's pink piped accents are a separate mask. Restore them to ivory after coloring the buttercream. */}
          <image data-decoration="white-piping" href={`/art/masks/accents-${maskVariant}.png`} width="512" height="512" filter={`url(#${id}-ivory-piping)`}/>
          <g transform={`translate(0 ${top})`}>
            <FruitDecorations toppings={cake.toppings} hasInscription={Boolean(cake.inscription)} hasTopper={Boolean(placements.length || cake.candles.style !== "none")} accent={accent} />
            <g transform={`translate(0 ${cake.inscriptionStyle.placement==='center'?-48:0})`}><ThemeDecorations theme={cake.theme} id={id} /></g>
          </g>
          {placements.filter(item=>item.id!=='custom').map(placement => {
            const topper=placement.id as CakeState['toppers'][number];
            const art=TOPPER_ART.items[topper];
            return <g key={topper} className="cake-decoration" data-decoration={topper}>
              <title>{`${art.label} fondant topper`}</title>
              <ellipse cx={placement.center} cy={placement.contact-1+top} rx={placement.width*.235} ry={placement.width*.035} fill="#583622" opacity=".15" />
              <image href={art.file} x={placement.center-placement.width*art.anchor.x} y={placement.contact+top-placement.height*art.anchor.y} width={placement.width} height={placement.height} filter={placement.tint?`url(#${id}-tint-${topper})`:undefined}/>
            </g>;
          })}
          {cake.customTopper&&<CustomTopper key={`${cake.customTopper.assetId??cake.customTopper.request}-${imageAttempt}`} design={cake.customTopper} placement={placements.find(item=>item.id==='custom')!} top={top} imageAttempt={imageAttempt} onImageError={()=>setFailedAsset(cake.customTopper?.assetId??null)}/>}
          <CakeCandles cake={cake} top={top} toppers={placements} accent={accent} darkSurface={darkSurface} writingWidth={writingWidth}/>
          {cake.inscription&&<CakeInscription text={cake.inscription} style={cake.inscriptionStyle} color={writingColor} darkSurface={darkSurface} top={top+writingOffset} maxWidth={writingWidth}/>}
        </svg>
      )}
      {cake.exists && imageFailed && <div className="cake-preview-status" role="status">
        <p>Preview unavailable. Your request is saved.</p>
        <button type="button" className="text-button" onClick={()=>{setFailedAsset(null);setImageAttempt(attempt=>attempt+1);}}>Retry loading preview (free)</button>
      </div>}
    </div>
  );
}
export default CakeScene;
