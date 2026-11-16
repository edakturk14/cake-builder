import type { CakeState } from '../shared/cake';

type Props = {
  toppings: CakeState['toppings'];
  hasInscription: boolean;
  hasTopper: boolean;
  accent?: string;
};

const STAR = 'M0-9 2.8-3 9-2.8 3.6 1.5 5.4 8.3 0 4.8-5.4 8.3-3.6 1.5-9-2.8-2.8-3Z';

/**
 * A few small, deliberately placed decorations on the outside of the top ellipse.
 * In mixed-fruit designs strawberries live at left, raspberries at right.
 * The center stays free for a figurine, candles, or a piped message.
 */
export function FruitDecorations({ toppings, hasInscription, hasTopper, accent }: Props) {
  const strawberries = toppings.includes('strawberries');
  const raspberries = toppings.includes('raspberries');
  const stars = toppings.includes('gold-stars');
  const mixedFruit = strawberries && raspberries;
  const busy = Boolean(hasInscription || hasTopper);
  const strawberryPositions = mixedFruit
    ? [[119, 158, 43, -12], [132, 197, 37, 13]]
    : busy
      ? [[120, 158, 43, -12], [352, 165, 42, 14]]
      : [[132, 160, 47, -8], [338, 169, 45, 14], [148, 198, 35, -12]];
  const raspberryPositions = mixedFruit
    ? [[354, 168, .71], [375, 185, .67], [349, 207, .65]]
    : busy
      ? [[355, 164, .76], [375, 195, .65], [342, 205, .68]]
      : [[141, 163, .79], [356, 169, .75], [150, 202, .69], [371, 206, .69]];
  const starsPositions = busy || strawberries || raspberries
    ? [[125, 184, .72], [386, 187, .67]]
    : [[125, 173, .81], [178, 148, .67], [383, 184, .8], [337, 220, .62]];

  return <g className="cake-decoration" data-decoration="arranged-toppings">
    {strawberries && <g data-decoration="strawberries">
      {strawberryPositions.map(([x, y, size, rotation], index) =>
        <image key={index} href="/art/strawberry-fan.png"
          x={x} y={y} width={size} height={size * .93}
          transform={`rotate(${rotation} ${x + size / 2} ${y + size / 2})`} />)}
    </g>}
    {raspberries && <g data-decoration="raspberries">
      {raspberryPositions.map(([x, y, scale], i) =>
        <g key={i} transform={`translate(${x} ${y}) rotate(${i % 2 ? 12 : -9}) scale(${scale})`}>
          <ellipse rx="13" ry="15" fill="#9b344a" />
          {[[0, -9], [-7, -5], [7, -5], [-9, 2], [0, 2], [9, 2], [-6, 10], [6, 10]].map(([a, b], j) =>
            <circle key={j} cx={a} cy={b} r="5" fill={j % 3 === 0 ? '#da5870' : '#b93451'} stroke="#90253d" strokeWidth=".45" />)}
          <path d="M-6-13l6-5 7 5" stroke="#64824e" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </g>)}
    </g>}
    {stars && <g data-decoration="gold-stars" fill={accent ?? '#d3ab58'} stroke="#9e7c37" strokeWidth=".5">
      {starsPositions.map(([x, y, scale], i) =>
        <path key={i} d={STAR} transform={`translate(${x} ${y}) rotate(${i * 23}) scale(${scale})`}/>)}
    </g>}
  </g>;
}
