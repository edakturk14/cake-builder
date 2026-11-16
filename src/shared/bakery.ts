import { createCake, type CakePatch, type CakeState } from './cake';
import type { PaletteId } from './appearance';
import type { TopperId } from './toppers';

/**
 * Starter catalog for a bakery to replace with products it really makes.
 * All prices still come from the existing shared sample-price rules.
 * Customers can vary the sponge count from one to three layers.
 */
export type TemplateId = 'classic' | 'chocolate' | 'pastel';
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
    description: 'Two-layer chocolate with vanilla cream',
    design: { flavor: 'chocolate', layers: 2, occasion: 'birthday',
      toppings: [], colors: { frosting: 'white', filling: 'blush-pink', inscription: 'chocolate-brown' } },
  },
  {
    id: 'pastel',
    name: 'Pastel Celebration',
    description: 'Pink buttercream and gold stars',
    design: { flavor: 'vanilla', layers: 1, occasion: 'birthday',
      toppings: ['gold-stars'], colors: { frosting: 'blush-pink', inscription: 'chocolate-brown', accents: 'gold' } },
  },
];

export const BAKERY_FLAVORS = [
  { id: 'vanilla', label: 'Vanilla' },
  { id: 'chocolate', label: 'Chocolate' },
  { id: 'red-velvet', label: 'Red velvet' },
  { id: 'lemon', label: 'Lemon' },
] as const;

export const BAKERY_COLORS: readonly PaletteId[] = [
  'white', 'blush-pink', 'lavender', 'sky-blue', 'mint', 'chocolate-brown',
];

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
