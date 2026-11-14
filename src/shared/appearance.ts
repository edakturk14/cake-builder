import type { TopperId } from './toppers';

export const PALETTE = [
  { id: 'white', label: 'White', hex: '#fffaf2', jevDescription: 'White, snowy white' },
  { id: 'ivory', label: 'Ivory', hex: '#f3e4c7', jevDescription: 'Ivory, cream, off white' },
  { id: 'blush-pink', label: 'Blush pink', hex: '#e8b4c3', jevDescription: 'Blush pink, pale pink, baby pink' },
  { id: 'hot-pink', label: 'Hot pink', hex: '#df4387', jevDescription: 'Hot pink, bright pink, fuchsia' },
  { id: 'lavender', label: 'Lavender', hex: '#a38ac5', jevDescription: 'Lavender, soft purple' },
  { id: 'lilac', label: 'Lilac', hex: '#c9b0d8', jevDescription: 'Lilac, pale purple' },
  { id: 'sky-blue', label: 'Sky blue', hex: '#8fc6e3', jevDescription: 'Sky blue, light blue, baby blue' },
  { id: 'navy', label: 'Navy', hex: '#30456e', jevDescription: 'Navy, dark blue, midnight blue' },
  { id: 'mint', label: 'Mint', hex: '#a6d5bd', jevDescription: 'Mint, mint green, pastel green' },
  { id: 'sage-green', label: 'Sage green', hex: '#9cae8e', jevDescription: 'Sage green, muted green' },
  { id: 'lemon-yellow', label: 'Lemon yellow', hex: '#f1d973', jevDescription: 'Lemon yellow, yellow, sunny yellow' },
  { id: 'gold', label: 'Gold', hex: '#c99c43', jevDescription: 'Gold, golden, warm metallic gold' },
  { id: 'peach', label: 'Peach', hex: '#efbd9e', jevDescription: 'Peach, light apricot' },
  { id: 'coral', label: 'Coral', hex: '#e48477', jevDescription: 'Coral, salmon pink, warm pink orange' },
  { id: 'red', label: 'Red', hex: '#bd474b', jevDescription: 'Red, cherry red, crimson' },
  { id: 'chocolate-brown', label: 'Chocolate brown', hex: '#704536', jevDescription: 'Chocolate brown, cocoa brown, brown' },
  { id: 'black', label: 'Black', hex: '#302a2b', jevDescription: 'Black, charcoal black' },
] as const;
export type PaletteId = typeof PALETTE[number]['id'];
export const PALETTE_IDS: readonly PaletteId[] = PALETTE.map(color => color.id);
export const PALETTE_BY_ID = Object.fromEntries(PALETTE.map(color => [color.id, color])) as Record<PaletteId, typeof PALETTE[number]>;
export const COLOR_TARGETS = [
  { id: 'frosting', label: 'Frosting' }, { id: 'filling', label: 'Filling' },
  { id: 'inscription', label: 'Writing' }, { id: 'accents', label: 'Accents' },
] as const;
export type CakeColors = Record<typeof COLOR_TARGETS[number]['id'], PaletteId | null>;
export const SIZE_OPTIONS = [
  { id: 'small', label: 'Small' }, { id: 'medium', label: 'Medium' }, { id: 'large', label: 'Large' },
] as const;
export const POSITION_OPTIONS = [
  { id: 'auto', label: 'Automatic' }, { id: 'left', label: 'Left' }, { id: 'center', label: 'Center' }, { id: 'right', label: 'Right' },
] as const;
export const WRITING_FONT_OPTIONS = [{ id: 'script', label: 'Script' }, { id: 'print', label: 'Print' }] as const;
export const WRITING_CASE_OPTIONS = [{ id: 'as-written', label: 'As written' }, { id: 'upper', label: 'Uppercase' }] as const;
export const WRITING_PLACEMENT_OPTIONS = [{ id: 'front', label: 'Front of top' }, { id: 'center', label: 'Center of top' }] as const;
export interface TopperStyle {
  size: typeof SIZE_OPTIONS[number]['id'];
  position: typeof POSITION_OPTIONS[number]['id'];
  tint: PaletteId | null;
}
export type TopperStyles = Partial<Record<TopperId, TopperStyle>>;
export interface InscriptionStyle {
  font: typeof WRITING_FONT_OPTIONS[number]['id'];
  letterCase: typeof WRITING_CASE_OPTIONS[number]['id'];
  size: typeof SIZE_OPTIONS[number]['id'];
  placement: typeof WRITING_PLACEMENT_OPTIONS[number]['id'];
}
export const DEFAULT_COLORS: CakeColors = Object.freeze({ frosting: null, filling: null, inscription: null, accents: null });
export const DEFAULT_TOPPER_STYLE: TopperStyle = Object.freeze({ size: 'medium', position: 'auto', tint: null });
export const DEFAULT_INSCRIPTION_STYLE: InscriptionStyle = Object.freeze({ font: 'script', letterCase: 'as-written', size: 'medium', placement: 'front' });
export function paletteHex(id: PaletteId | null | undefined, fallback: string): string {
  return id ? PALETTE_BY_ID[id].hex : fallback;
}
export function getTopperStyle(styles: TopperStyles, id: TopperId): TopperStyle {
  return { ...DEFAULT_TOPPER_STYLE, ...styles[id] };
}
