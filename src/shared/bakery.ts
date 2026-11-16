import { createCake, estimateCake, type BasketItem, type CakeEstimate, type CakePatch, type CakeState } from './cake';
import type { TopperId } from './toppers';

/**
 * Starter catalog for a bakery to replace with products it really makes.
 * All prices still come from the existing shared sample-price rules.
 * Customers can vary the sponge count from one to three layers.
 */
export type TemplateId = 'classic' | 'chocolate' | 'red-velvet' | 'sprinkles';
export type BakeryTemplate = {
  id: TemplateId;
  name: string;
  description: string;
  design: CakePatch;
};

export const BAKERY_TEMPLATES: readonly BakeryTemplate[] = [
  {
    id: 'classic',
    name: 'Classic Birthday',
    description: 'Vanilla, simple white buttercream',
    design: { flavor: 'vanilla', layers: 1, occasion: 'birthday',
      colors: { frosting: 'white', filling: 'ivory', inscription: 'chocolate-brown' } },
  },
  {
    id: 'chocolate',
    name: 'Chocolate Party',
    description: 'Two layers with vanilla cream filling',
    design: { flavor: 'chocolate', layers: 2, occasion: 'birthday',
      toppings: [], colors: { frosting: 'white', filling: 'ivory', inscription: 'chocolate-brown' } },
  },
  {
    id: 'red-velvet',
    name: 'Red Velvet',
    description: 'Two layers of red velvet with cream-colored frosting',
    design: { flavor: 'red-velvet', layers: 2, occasion: 'birthday',
      toppings: [], colors: { frosting: 'white', filling: 'ivory', inscription: 'chocolate-brown' } },
  },
  {
    id: 'sprinkles',
    name: 'Birthday with Sprinkles',
    description: 'Classic vanilla cake with colorful birthday sprinkles',
    design: { flavor: 'vanilla', layers: 1, occasion: 'birthday',
      toppings: ['sprinkles'], colors: { frosting: 'white', filling: 'ivory', inscription: 'chocolate-brown' } },
  },
];

export const BAKERY_FLAVORS = [
  { id: 'vanilla', label: 'Vanilla' },
  { id: 'chocolate', label: 'Chocolate' },
  { id: 'red-velvet', label: 'Red velvet' },
  { id: 'lemon', label: 'Lemon' },
] as const;

// These have dedicated prepared arrangements. Drips and ganache are reserved for curated bakery presets.
export const BAKERY_TOPPINGS = [
  { id: 'strawberries', label: 'Strawberries' },
  { id: 'raspberries', label: 'Raspberries' },
  { id: 'gold-stars', label: 'Gold stars' },
] as const;

// Reuse the existing prepared fondant artwork rather than generating unpredictable user-specific figures.
export const BAKERY_TOPPERS: readonly { id: TopperId; label: string }[] = [
  { id: 'princess', label: 'Princess' },
  { id: 'castle', label: 'Castle' },
  { id: 'unicorn', label: 'Unicorn' },
  { id: 'balloons', label: 'Balloons' },
  { id: 'flower-bouquet', label: 'Flowers' },
  { id: 'rainbow', label: 'Rainbow' },
  { id: 'christmas-tree', label: 'Christmas tree' },
  { id: 'snowman', label: 'Snowman' },
  { id: 'race-car', label: 'Racing kart' },
];

export function createTemplateCake(id: TemplateId): CakeState {
  const template = BAKERY_TEMPLATES.find(item => item.id === id) ?? BAKERY_TEMPLATES[0];
  return createCake({ ...template.design, toppers: [], customTopper: null, inscription: '' });
}

export function isBakeryTopper(value: string): value is TopperId {
  return BAKERY_TOPPERS.some(item => item.id === value);
}

/** NYC bakery showcase pricing. Existing legacy demo fixtures retain their original price rules. */
export const BAKERY_STARTING_PRICE_CENTS = 5800;

/**
 * Every sponge flavor starts at $58. Layers, toppers, fruit, candles and
 * prepared decorations use their existing add-on amounts.
 * The bakery site uses this estimator everywhere instead of demo estimateCake.
 */
export function estimateBakeryCake(cake: CakeState): CakeEstimate {
  const estimated = estimateCake(cake);
  if (!cake.exists) return estimated;
  const base = estimated.lines.find(line => line.id === 'base');
  if (!base) return estimated;
  const baseAdjustment = BAKERY_STARTING_PRICE_CENTS - base.amountCents;
  return {
    ...estimated,
    totalCents: estimated.totalCents + baseAdjustment,
    lines: estimated.lines.map(line =>
      line.id === 'base' ? { ...line, amountCents: BAKERY_STARTING_PRICE_CENTS } : line),
  };
}

/** Reprice a saved cake after the core legacy-basket validator reloads it. */
export function priceBakeryBasketItem(item: BasketItem): BasketItem {
  return { ...item, estimate: estimateBakeryCake(item.design) };
}
