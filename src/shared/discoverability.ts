import { CANDLE_OPTIONS, CHEESECAKE_LAYERS, DESIGN_EXAMPLES, FLAVORS, LABELS, PRICING, SPONGE_LAYERS, THEMES, TOPPINGS, type CakeState } from './cake';
import { TOPPER_CATALOG } from './toppers';
import { COLOR_TARGETS, PALETTE, POSITION_OPTIONS, SIZE_OPTIONS, WRITING_CASE_OPTIONS, WRITING_FONT_OPTIONS, WRITING_PLACEMENT_OPTIONS, getTopperStyle } from './appearance';
import { OCCASIONS, OCCASION_BY_ID } from './occasions';

export interface AskOption { id: string; label: string; priceCents: number | null; detail?: string }
export interface AskGroup { id: string; label: string; options: AskOption[] }

/** Display data is derived from the same catalogs and prices as confirmed designs. */
export function getAskOptions(): AskGroup[] {
  return [
    { id: 'occasions', label: 'Occasions', options: OCCASIONS.map(({ id, label }) => ({ id, label, priceCents: 0, detail: 'included' })) },
    { id: 'flavors', label: 'Flavors & base', options: FLAVORS.map(id => ({ id, label: id === 'classic' ? LABELS[id] : `${LABELS[id]} sponge`, priceCents: PRICING.flavors[id], detail: 'base' })) },
    { id: 'layers', label: 'Layers', options: [
      ...SPONGE_LAYERS.map(count => ({ id: `sponge-${count}`, label: `${count}-layer sponge`, priceCents: (count - 1) * PRICING.additionalLayer, detail: count === SPONGE_LAYERS[0] ? 'included with base' : 'additional' })),
      { id: 'cheesecake', label: `Cheesecake: ${CHEESECAKE_LAYERS} baked layer`, priceCents: 0, detail: 'fixed, included with base' },
    ] },
    { id: 'toppings', label: 'Toppings', options: TOPPINGS.map(id => ({ id, label: LABELS[id], priceCents: PRICING.toppings[id] })) },
    { id: 'candles', label: 'Candles', options: CANDLE_OPTIONS.map(option => ({ ...option })) },
    { id: 'themes', label: 'Designs you can describe', options: THEMES.map(id => ({ id, label: DESIGN_EXAMPLES[id], priceCents: PRICING.themes[id] })) },
    { id: 'toppers', label: 'Toppers & characters', options: TOPPER_CATALOG.map(({ id, label, priceCents }) => ({ id, label, priceCents })) },
    { id: 'colors', label: 'Colors', options: PALETTE.map(({ id, label }) => ({ id, label, priceCents: 0, detail: 'included' })) },
    { id: 'color-targets', label: 'Where to use color', options: COLOR_TARGETS.map(({ id, label }) => ({ id, label, priceCents: 0, detail: 'included' })) },
    { id: 'sizes', label: 'Topper & writing sizes', options: SIZE_OPTIONS.map(({ id, label }) => ({ id, label, priceCents: 0, detail: 'included' })) },
    { id: 'positions', label: 'Topper positions', options: POSITION_OPTIONS.map(({ id, label }) => ({ id, label, priceCents: 0, detail: 'included' })) },
    { id: 'writing', label: 'Writing styles', options: [
      ...WRITING_FONT_OPTIONS.map(({ id, label }) => ({ id: `font:${id}`, label, priceCents: 0, detail: 'included' })),
      ...WRITING_CASE_OPTIONS.map(({ id, label }) => ({ id: `case:${id}`, label, priceCents: 0, detail: 'included' })),
      ...WRITING_PLACEMENT_OPTIONS.map(({ id, label }) => ({ id: `placement:${id}`, label, priceCents: 0, detail: 'included' })),
    ] },
    { id: 'custom', label: 'Anything else', options: [{ id: 'custom', label: 'Custom topper', priceCents: null, detail: 'quoted separately' }] },
  ];
}

function offsetFor(cake: CakeState): number {
  return [...JSON.stringify(cake)].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0);
}
function rotate<T>(items: readonly T[], offset: number): T[] {
  if (!items.length) return [];
  const start = offset % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}
function topperCommand(label: string): string {
  const name = label.toLowerCase();
  if (name === 'balloons' || name === 'bride and groom') return `Add ${name} on top`;
  const article = /^[aeio]/.test(name) ? 'an' : 'a';
  return `Add ${article} ${name} topper`;
}
/** Only filters our own catalog chip phrases; never interprets a live user command. */
function occasionSuggestionApplies(text: string, cake: CakeState): boolean {
  const phrase = text.toLowerCase();
  if (phrase.startsWith('write ')) return !cake.inscription;
  const topper = TOPPER_CATALOG.find(option => phrase.includes(option.label.toLowerCase()));
  if (topper) return cake.toppers.length < 2 && !cake.toppers.includes(topper.id);
  const topping = TOPPINGS.find(option => phrase.includes(LABELS[option].toLowerCase()));
  if (topping) return !cake.toppings.includes(topping);
  if (phrase.includes('number candle')) return cake.candles.style !== 'number';
  if (phrase.includes('candle')) return cake.candles.style === 'none';
  const target = COLOR_TARGETS.find(option => phrase.includes(option.id));
  const color = PALETTE.find(option => phrase.includes(option.label.toLowerCase()));
  return !target || !color || cake.colors[target.id] !== color.id;
}

/** Suggested text is always interpreted by Jev, never applied as a fixture patch. */
export function getCakeSuggestions(cake: CakeState): string[] {
  if (!cake.exists) return [`A ${OCCASION_BY_ID.birthday.label.toLowerCase()} cake`, 'I want a chocolate cake', 'I want a classic cheesecake'];
  const offset = offsetFor(cake);
  const toppers = cake.toppers.length < 2
    ? rotate(TOPPER_CATALOG.filter(topper => !cake.toppers.includes(topper.id)), offset).slice(0, 2).map(topper => topperCommand(topper.label))
    : [];
  const other: string[] = [];
  if (cake.base !== 'cheesecake') other.push('Make it cheesecake');
  const missingTopping = rotate(TOPPINGS.filter(topping => !cake.toppings.includes(topping)), offset)[0];
  if (missingTopping) other.push(`Add ${LABELS[missingTopping].toLowerCase()}`);
  if (cake.base === 'sponge' && cake.layers < SPONGE_LAYERS[SPONGE_LAYERS.length - 1]) other.push(`Make it ${cake.layers + 1} layers`);
  if (cake.candles.style === 'none') other.push(CANDLE_OPTIONS.find(option => option.id === 'plain')!.command);
  if (!cake.inscription) other.push('Write Eda on top');
  const color = rotate(PALETTE.filter(color => color.id !== cake.colors.frosting), offset)[0];
  const appearance = [`Make the frosting ${color.label.toLowerCase()}`];
  if (cake.toppers.length) {
    const id = cake.toppers[offset % cake.toppers.length];
    const style = getTopperStyle(cake.topperStyles, id);
    const size = rotate(SIZE_OPTIONS.filter(option => option.id !== style.size), offset)[0];
    const position = rotate(POSITION_OPTIONS.filter(option => option.id !== 'auto' && option.id !== style.position), offset)[0];
    const label = TOPPER_CATALOG.find(topper => topper.id === id)!.label.toLowerCase();
    appearance.push(`Make the ${label} topper ${size.label.toLowerCase()}`, `Move the ${label} topper to the ${position.label.toLowerCase()}`);
  }
  if (cake.inscription) {
    const font = WRITING_FONT_OPTIONS.find(option => option.id !== cake.inscriptionStyle.font)!;
    appearance.push(`Use ${font.label.toLowerCase()} writing`);
  }
  const alternatives = FLAVORS.filter(flavor => flavor !== 'classic' && (cake.base === 'cheesecake' || flavor !== cake.flavor))
    .map(flavor => `Make it a ${LABELS[flavor].toLowerCase()} sponge cake`);
  const rotated = rotate(other, offset);
  const preferred = cake.occasion ? OCCASION_BY_ID[cake.occasion].suggestions.filter(text => occasionSuggestionApplies(text, cake)).slice(0, 2) : [];
  return [...new Set([...preferred, ...rotated.slice(0, 1), rotate(appearance, offset)[0], ...toppers, ...rotated.slice(1), ...rotate(alternatives, offset)])].slice(0, 4);
}
