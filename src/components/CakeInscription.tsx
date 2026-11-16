import type { InscriptionStyle } from '../shared/appearance';

interface Props {
  text: string;
  style: InscriptionStyle;
  color: string;
  darkSurface: boolean;
  top: number;
  maxWidth: number;
}

/** Stable text geometry: no late font measurements or resize effects that can hide the inscription. */
export function CakeInscription({ text, style, color, darkSurface, top, maxWidth }: Props) {
  const display = style.letterCase === 'upper' ? text.toUpperCase() : text;
  const words = display.trim().split(/\s+/);
  let lines = [display];
  if (display.length > 14 && words.length > 1) {
    let split = 1;
    let best = Infinity;
    for (let i = 1; i < words.length; i++) {
      const difference = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
      if (difference < best) { best = difference; split = i; }
    }
    lines = [words.slice(0, split).join(' '), words.slice(split).join(' ')];
  }
  const isPrint = style.font === 'print';
  const fontSize = (lines.length > 1 ? 37 : 43) * ({ small: 0.84, medium: 1, large: 1.12 }[style.size]);
  const estimatedWidth = Math.max(...lines.map(line => Array.from(line).length), 1) * fontSize * (isPrint ? 0.61 : 0.57);
  const fit = Math.min(1, maxWidth / estimatedWidth);
  const centered = style.placement === 'center';
  const baseline = lines.length > 1 ? (centered ? 186 : 199) : (centered ? 205 : 226);
  const rgb = color.replace('#', '').match(/../g)!.map(channel => parseInt(channel, 16) / 255);
  const lightInk = rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722 > .62;
  const similarToSurface = lightInk === !darkSurface;
  const halo = lightInk ? '#513a32' : '#fff9e8';
  const strokeWidth = similarToSurface ? 2.4 : .9;
  return <g className="cake-inscription" data-writing-font={style.font} data-writing-placement={style.placement}
    role="group" aria-label={`Cake inscription: ${display}`}
    transform={`translate(256 ${baseline + top}) scale(1 .83)`}>
    <title>{`Cake message: ${display}`}</title>
    <g transform={`scale(${fit})`}>
      <text textAnchor="middle"
        fontFamily={isPrint ? "'DM Sans',Arial,sans-serif" : "'Baskervville',Georgia,serif"}
        fontStyle={isPrint ? 'normal' : 'italic'} fontWeight={isPrint ? 600 : 400} fontSize={fontSize}
        fill={color} stroke={similarToSurface ? halo : color} strokeWidth={strokeWidth}
        paintOrder="stroke" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0px .6px .6px ${lightInk ? '#4f352b99' : '#fff9ef88'})` }}>
        {lines.map((line, index) => <tspan key={index} x={0} dy={index ? fontSize * .85 : 0}>{line}</tspan>)}
      </text>
    </g>
  </g>;
}
