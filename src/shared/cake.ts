import { TOPPER_BY_ID, TOPPER_IDS, type TopperId } from './toppers';
import { OCCASION_IDS, matchOccasion, type OccasionId } from './occasions';
import { COLOR_TARGETS, DEFAULT_COLORS, DEFAULT_INSCRIPTION_STYLE, DEFAULT_TOPPER_STYLE, PALETTE_IDS, POSITION_OPTIONS, SIZE_OPTIONS, WRITING_CASE_OPTIONS, WRITING_FONT_OPTIONS, WRITING_PLACEMENT_OPTIONS, type CakeColors, type InscriptionStyle, type TopperStyle, type TopperStyles } from './appearance';
export type { TopperId } from './toppers';
export type { OccasionId } from './occasions';
export type { CakeColors, InscriptionStyle, TopperStyle, TopperStyles } from './appearance';

export const TOPPINGS = ['strawberries', 'raspberries', 'ganache', 'caramel', 'gold-stars'] as const;
export const THEMES = ['mario', 'formula-one', 'spain-world-cup', 'tennis', 'jensen-huang'] as const;
export const DESIGN_EXAMPLES: Record<typeof THEMES[number], string> = {
  mario: 'a Mario cake', 'formula-one': 'a Formula One cake', 'spain-world-cup': 'a Spain World Cup cake',
  tennis: 'a tennis cake', 'jensen-huang': 'a Jensen Huang cake',
};
export const FLAVORS = ['vanilla', 'chocolate', 'red-velvet', 'lemon', 'classic'] as const;
export const SPONGE_LAYERS = [1, 2, 3] as const;
export const CHEESECAKE_LAYERS = 1 as const;
export const CANDLE_STYLES = ['none', 'plain', 'number'] as const;
export const DEFAULT_PLAIN_CANDLE_COUNT = 5;
export const PLAIN_CANDLE_COUNTS: readonly number[] = Array.from({ length: 12 }, (_, index) => index + 1);
export interface CandleState { style: typeof CANDLE_STYLES[number]; number: string | null; count: number | null }
export type CandlePatch = Partial<CandleState>;
export type Topping = typeof TOPPINGS[number];
export type Theme = typeof THEMES[number];
export type Flavor = typeof FLAVORS[number];
export interface CustomTopper { request: string; assetId: string | null }
export interface CakeState {
  exists: boolean;
  base: 'sponge' | 'cheesecake';
  flavor: Flavor;
  layers: typeof SPONGE_LAYERS[number];
  occasion: OccasionId | null;
  theme: Theme | null;
  toppings: Topping[];
  toppers: TopperId[];
  customTopper: CustomTopper | null;
  colors: CakeColors;
  topperStyles: TopperStyles;
  inscriptionStyle: InscriptionStyle;
  candles: CandleState;
  inscription: string;
}
export type CakePatch = Partial<Omit<CakeState, 'colors' | 'topperStyles' | 'inscriptionStyle' | 'customTopper' | 'candles'>> & {
  candles?: CandlePatch;
  colors?: Partial<CakeColors>;
  topperStyles?: Partial<Record<TopperId, Partial<TopperStyle> | null>>;
  inscriptionStyle?: Partial<InscriptionStyle>;
  customTopper?: Partial<CustomTopper> | null;
  addToppings?: Topping[];
  removeToppings?: Topping[];
  addToppers?: TopperId[];
  removeToppers?: TopperId[];
  notes?: string[];
};
export interface PriceLine { id: string; label: string; amountCents: number }
export interface CakeEstimate {
  totalCents: number;
  lines: PriceLine[];
  requiresQuote: boolean;
  quoteItems: string[];
}
export interface BasketItem {
  id: string;
  design: CakeState;
  estimate: CakeEstimate;
  quantity: number;
  createdAt: string;
}

export const EMPTY_CAKE: CakeState = {
  exists: false, base: 'sponge', flavor: 'chocolate', layers: 1,
  occasion: null, theme: null, toppings: [], toppers: [], customTopper: null,
  colors: { ...DEFAULT_COLORS }, topperStyles: {}, inscriptionStyle: { ...DEFAULT_INSCRIPTION_STYLE },
  candles: { style: 'none', number: null, count: null }, inscription: '',
};
Object.freeze(EMPTY_CAKE.toppings);
Object.freeze(EMPTY_CAKE.toppers);
Object.freeze(EMPTY_CAKE.candles);
Object.freeze(EMPTY_CAKE.colors);
Object.freeze(EMPTY_CAKE.topperStyles);
Object.freeze(EMPTY_CAKE.inscriptionStyle);
Object.freeze(EMPTY_CAKE);

export function cloneCake(cake: CakeState): CakeState {
  return {
    ...cake, toppings: [...cake.toppings], toppers: [...cake.toppers], candles: { ...cake.candles },
    colors: { ...cake.colors }, inscriptionStyle: { ...cake.inscriptionStyle },
    topperStyles: Object.fromEntries(Object.entries(cake.topperStyles).map(([id, style]) => [id, { ...style }])),
    customTopper: cake.customTopper ? { ...cake.customTopper } : null,
  };
}
function fail(message: string): never { throw new Error(message); }
function enumValue(value: unknown, values: readonly unknown[], field: string) {
  if (!values.includes(value)) fail(`Unsupported ${field}.`);
}
function boundedText(value: unknown, max: number, field: string, nullable = false) {
  if (nullable && value === null) return;
  if (typeof value !== 'string' || value.length > max) fail(`${field} must be text up to ${max} characters.`);
}
function toppingList(value: unknown, field: string) {
  if (!Array.isArray(value) || value.length > 10) fail(`Invalid ${field}.`);
  for (const topping of value as unknown[]) enumValue(topping, TOPPINGS, 'topping');
}
function topperList(value: unknown, field: string) {
  if (!Array.isArray(value) || value.length > TOPPER_IDS.length) fail(`Invalid ${field}.`);
  for (const topper of value as unknown[]) enumValue(topper, TOPPER_IDS, 'topper');
}
function record(value: unknown, allowed: readonly string[], field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`Invalid ${field}.`);
  const object = value as Record<string, unknown>;
  if (Object.keys(object).some(key => !allowed.includes(key) || object[key] === undefined)) fail(`Invalid ${field} field.`);
  return object;
}
export function isAssetId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value);
}
/** Cache/match key only. Never replace the customer's exact displayed request with it. */
export function normalizeCustomRequest(request: string): string {
  return request.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();
}

/** Untrusted model output must pass this validator before any confirmed state changes. */
export function validateCakePatch(value: unknown): asserts value is CakePatch {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Invalid cake edit.');
  const patch = value as Record<string, unknown>;
  const allowed = [...Object.keys(EMPTY_CAKE), 'addToppings', 'removeToppings', 'addToppers', 'removeToppers', 'notes'];
  for (const key of Object.keys(patch)) {
    if (!allowed.includes(key) || patch[key] === undefined) fail(`Invalid cake edit field: ${key}.`);
  }
  if ('exists' in patch && typeof patch.exists !== 'boolean') fail('Invalid cake existence.');
  if ('base' in patch) enumValue(patch.base, ['sponge', 'cheesecake'], 'base');
  if ('flavor' in patch) enumValue(patch.flavor, FLAVORS, 'flavor');
  if ('layers' in patch) enumValue(patch.layers, SPONGE_LAYERS, 'layer count');
  if ('theme' in patch) enumValue(patch.theme, [...THEMES, null], 'theme');
  if ('occasion' in patch) enumValue(patch.occasion, [...OCCASION_IDS, null], 'occasion');
  if ('customTopper' in patch && patch.customTopper !== null) {
    const custom = record(patch.customTopper, ['request', 'assetId'], 'custom decoration');
    if ('request' in custom) {
      boundedText(custom.request, 120, 'Custom decoration');
      if (!(custom.request as string).trim()) fail('Describe the custom decoration.');
    }
    if ('assetId' in custom && custom.assetId !== null && !isAssetId(custom.assetId)) fail('Invalid custom decoration asset ID.');
  }
  if ('colors' in patch) {
    const colors = record(patch.colors, COLOR_TARGETS.map(target => target.id), 'colors');
    for (const color of Object.values(colors)) enumValue(color, [...PALETTE_IDS, null], 'color');
  }
  if ('topperStyles' in patch) {
    const styles = record(patch.topperStyles, TOPPER_IDS, 'topper styles');
    for (const value of Object.values(styles)) {
      if (value === null) continue;
      const style = record(value, ['size', 'position', 'tint'], 'topper style');
      if ('size' in style) enumValue(style.size, SIZE_OPTIONS.map(option => option.id), 'topper size');
      if ('position' in style) enumValue(style.position, POSITION_OPTIONS.map(option => option.id), 'topper position');
      if ('tint' in style) enumValue(style.tint, [...PALETTE_IDS, null], 'topper tint');
    }
  }
  if ('inscriptionStyle' in patch) {
    const style = record(patch.inscriptionStyle, ['font', 'letterCase', 'size', 'placement'], 'writing style');
    if ('font' in style) enumValue(style.font, WRITING_FONT_OPTIONS.map(option => option.id), 'writing font');
    if ('letterCase' in style) enumValue(style.letterCase, WRITING_CASE_OPTIONS.map(option => option.id), 'writing case');
    if ('size' in style) enumValue(style.size, SIZE_OPTIONS.map(option => option.id), 'writing size');
    if ('placement' in style) enumValue(style.placement, WRITING_PLACEMENT_OPTIONS.map(option => option.id), 'writing placement');
  }
  if ('inscription' in patch) boundedText(patch.inscription, 80, 'Inscription');
  for (const key of ['toppings', 'addToppings', 'removeToppings']) {
    if (key in patch) toppingList(patch[key], key);
  }
  for (const key of ['toppers', 'addToppers', 'removeToppers']) {
    if (key in patch) topperList(patch[key], key);
  }
  if ('notes' in patch) {
    if (!Array.isArray(patch.notes) || patch.notes.length > 8) fail('Invalid edit notes.');
    for (const note of patch.notes as unknown[]) boundedText(note, 240, 'Note');
  }
  if ('candles' in patch) {
    const candles = record(patch.candles, ['style', 'number', 'count'], 'candles');
    if ('style' in candles) enumValue(candles.style, CANDLE_STYLES, 'candle style');
    if ('number' in candles && candles.number !== null && (typeof candles.number !== 'string' || !/^\d{1,3}$/.test(candles.number))) fail('Use a number candle from 0 to 999.');
    if ('count' in candles && candles.count !== null && !PLAIN_CANDLE_COUNTS.includes(candles.count as number)) fail('Use between 1 and 12 plain candles.');
    if (candles.style !== undefined && candles.style !== 'number' && candles.number != null) fail('Only numeral candles have a number.');
    if (candles.style !== undefined && candles.style !== 'plain' && candles.count != null) fail('Only plain candles have a count.');
    if (candles.number != null && candles.count != null) fail('Choose plain candles or a numeral candle set.');
  }
}

export function applyCakePatch(current: CakeState, patch: CakePatch): { state: CakeState; notes: string[] } {
  validateCakePatch(patch);
  const { addToppings = [], removeToppings = [], addToppers = [], removeToppers = [], colors, topperStyles, inscriptionStyle, customTopper, candles, notes: suppliedNotes = [], ...fields } = patch;
  const cake = cloneCake({ ...current, ...fields });
  const notes = [...suppliedNotes];
  cake.toppings = [...new Set([...cake.toppings, ...addToppings])].filter(topping => !removeToppings.includes(topping));
  cake.toppers = [...new Set([...cake.toppers, ...addToppers])].filter(topper => !removeToppers.includes(topper));
  if (cake.toppers.length > 2) return { state: cloneCake(current), notes: [...notes, 'Up to two toppers in this demo'] };
  if (candles) {
    const style = candles.style ?? cake.candles.style;
    if (style === 'none') {
      if (candles.number != null || candles.count != null) fail('Choose a candle style before setting a number or count.');
      cake.candles = { style, number: null, count: null };
    } else if (style === 'plain') {
      if (candles.number != null) fail('Use numeral style for a number candle.');
      const previousCount = cake.candles.style === 'plain' ? cake.candles.count ?? DEFAULT_PLAIN_CANDLE_COUNT : DEFAULT_PLAIN_CANDLE_COUNT;
      cake.candles = {
        style, number: null,
        count: 'count' in candles ? candles.count ?? DEFAULT_PLAIN_CANDLE_COUNT : previousCount,
      };
    } else {
      if (candles.count != null) fail('Use plain style for a candle count.');
      const number = 'number' in candles ? candles.number : cake.candles.style === 'number' ? cake.candles.number : null;
      if (!number) fail('Specify the numeral for a number candle.');
      cake.candles = { style, number, count: null };
    }
  }
  cake.colors = { ...cake.colors, ...colors };
  cake.inscriptionStyle = { ...cake.inscriptionStyle, ...inscriptionStyle };
  if (customTopper === null) cake.customTopper = null;
  else if (customTopper !== undefined) {
    const request = customTopper.request ?? cake.customTopper?.request;
    if (!request) fail('Describe the custom decoration before attaching its preview.');
    const changedRequest = !cake.customTopper || normalizeCustomRequest(request) !== normalizeCustomRequest(cake.customTopper.request);
    cake.customTopper = { request, assetId: 'assetId' in customTopper ? customTopper.assetId! : changedRequest ? null : cake.customTopper?.assetId ?? null };
  }
  for (const id of TOPPER_IDS) {
    if (!cake.toppers.includes(id) || topperStyles?.[id] === null) delete cake.topperStyles[id];
    else if (topperStyles?.[id]) cake.topperStyles[id] = { ...DEFAULT_TOPPER_STYLE, ...cake.topperStyles[id], ...topperStyles[id] };
  }
  if (cake.base === 'cheesecake') {
    cake.flavor = 'classic';
    if (cake.layers !== CHEESECAKE_LAYERS) {
      notes.push('Cheesecake has one baked layer in this demo. Sponge cakes support up to three layers.');
      cake.layers = CHEESECAKE_LAYERS;
    }
  } else if (cake.flavor === 'classic') {
    cake.flavor = 'chocolate';
  }
  return { state: cake, notes };
}

export function createCake(overrides: CakePatch = {}): CakeState {
  return applyCakePatch(EMPTY_CAKE, { ...overrides, exists: true }).state;
}

export const PRICING = {
  flavors: { vanilla: 3800, chocolate: 4200, 'red-velvet': 4400, lemon: 4000, classic: 4400 },
  additionalLayer: 600,
  toppings: { strawberries: 700, raspberries: 700, ganache: 500, caramel: 400, 'gold-stars': 400 },
  themes: { mario: 1200, 'formula-one': 1200, 'spain-world-cup': 1200, tennis: 1000, 'jensen-huang': 1500 },
  plainCandles: 300, numberCandles: 500,
} as const;
export const CANDLE_OPTIONS = CANDLE_STYLES.map(id => ({
  id,
  label: id === 'none' ? 'No candles' : id === 'plain' ? `Plain candles (${PLAIN_CANDLE_COUNTS[0]}–${PLAIN_CANDLE_COUNTS[PLAIN_CANDLE_COUNTS.length - 1]})` : 'Number candle set',
  command: id === 'none' ? 'Remove the candles' : id === 'plain' ? 'Add plain candles' : 'Add a number candle',
  priceCents: id === 'none' ? 0 : id === 'plain' ? PRICING.plainCandles : PRICING.numberCandles,
}));
export const LABELS = {
  vanilla: 'Vanilla', chocolate: 'Chocolate', 'red-velvet': 'Red velvet', lemon: 'Lemon', classic: 'Classic baked cheesecake',
  strawberries: 'Strawberries', raspberries: 'Raspberries', ganache: 'Chocolate ganache', caramel: 'Caramel drizzle', 'gold-stars': 'Gold stars',
  mario: 'Mario theme kit', 'formula-one': 'Formula One kit', 'spain-world-cup': 'Spain World Cup kit', tennis: 'Tennis kit', 'jensen-huang': 'Jensen Huang figurine',
} as const;

export function estimateCake(cake: CakeState): CakeEstimate {
  const lines: PriceLine[] = [];
  const quoteItems: string[] = [];
  const add = (id: string, label: string, amountCents: number) => lines.push({ id, label, amountCents });
  if (cake.exists) {
    const flavor = cake.base === 'cheesecake' ? 'classic' : cake.flavor;
    add('base', cake.base === 'cheesecake' ? LABELS.classic : `${LABELS[flavor]} sponge`, PRICING.flavors[flavor]);
    if (cake.base === 'sponge' && cake.layers > 1) add('layers', `${cake.layers - 1} additional sponge layer${cake.layers === 3 ? 's' : ''}`, (cake.layers - 1) * PRICING.additionalLayer);
    for (const topping of new Set(cake.toppings)) add(topping, LABELS[topping], PRICING.toppings[topping]);
    if (cake.theme) add('theme', LABELS[cake.theme], PRICING.themes[cake.theme]);
    for (const topper of new Set(cake.toppers)) add(`topper:${topper}`, `${TOPPER_BY_ID[topper].label} topper`, TOPPER_BY_ID[topper].priceCents);
    if (cake.candles.style !== 'none') add('candles', cake.candles.style === 'number' ? `Number ${cake.candles.number} candle set` : `${cake.candles.count} plain candles`, cake.candles.style === 'number' ? PRICING.numberCandles : PRICING.plainCandles);
    if (cake.customTopper) quoteItems.push(cake.customTopper.request);
  }
  return { totalCents: lines.reduce((sum, line) => sum + line.amountCents, 0), lines, requiresQuote: quoteItems.length > 0, quoteItems };
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
export function createBasketItem(cake: CakeState, id: string = crypto.randomUUID()): BasketItem {
  if (!cake.exists) fail('Create a cake before adding it to your basket.');
  const design = cloneCake(cake);
  return deepFreeze({ id, design, estimate: estimateCake(design), quantity: 1, createdAt: new Date().toISOString() });
}
/** The only post-save design change: fill a missing preview for the exact saved request. */
export function fulfillBasketAsset(items: BasketItem[], request: string, assetId: string): BasketItem[] {
  if (!isAssetId(assetId)) fail('Invalid custom decoration asset ID.');
  let changed = false;
  const next = items.map(item => {
    if (!item.design.customTopper || normalizeCustomRequest(item.design.customTopper.request) !== normalizeCustomRequest(request) || item.design.customTopper.assetId !== null) return item;
    changed = true;
    const design = cloneCake(item.design);
    design.customTopper = { request: item.design.customTopper.request, assetId };
    return deepFreeze({ ...item, design });
  });
  return changed ? next : items;
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}

/** Restore only bounded, valid designs, and derive estimates instead of trusting storage. */
export function parseBasket(serialized: string | null): BasketItem[] {
  if (!serialized || serialized.length > 250_000) return [];
  try {
    const items: unknown = JSON.parse(serialized);
    if (!Array.isArray(items) || items.length > 100) return [];
    const ids = new Set<string>();
    return items.map((item: unknown): BasketItem => {
      if (!item || typeof item !== 'object') fail('Invalid basket item.');
      const raw = item as Record<string, unknown>;
      if (typeof raw.id !== 'string' || raw.id.length > 100 || !raw.id || ids.has(raw.id)) fail('Invalid basket identity.');
      ids.add(raw.id);
      if (typeof raw.createdAt !== 'string' || !Number.isFinite(Date.parse(raw.createdAt))) fail('Invalid basket date.');
      if (!Number.isInteger(raw.quantity) || (raw.quantity as number) < 1 || (raw.quantity as number) > 10) fail('Invalid basket quantity.');
      let storedDesign = raw.design;
      if (storedDesign && typeof storedDesign === 'object' && !Array.isArray(storedDesign)
        && Object.hasOwn(storedDesign, 'topper') && !Object.hasOwn(storedDesign, 'toppers')) {
        const { topper, ...legacy } = storedDesign as Record<string, unknown>;
        if (topper !== null && topper !== 'princess') fail('Invalid legacy topper.');
        storedDesign = { ...legacy, toppers: topper ? [topper] : [] };
      }
      if (storedDesign && typeof storedDesign === 'object' && !Array.isArray(storedDesign)) {
        const legacy = storedDesign as Record<string, unknown>;
        storedDesign = {
          colors: { ...DEFAULT_COLORS }, topperStyles: {}, inscriptionStyle: { ...DEFAULT_INSCRIPTION_STYLE },
          ...legacy,
          occasion: typeof legacy.occasion === 'string' ? matchOccasion(legacy.occasion) : legacy.occasion,
          customTopper: typeof legacy.customTopper === 'string' ? (legacy.customTopper.trim() ? { request: legacy.customTopper, assetId: null } : null) : legacy.customTopper,
        };
        if (legacy.candles && typeof legacy.candles === 'object' && !Array.isArray(legacy.candles) && !Object.hasOwn(legacy.candles, 'count')) {
          const candles = legacy.candles as Record<string, unknown>;
          (storedDesign as Record<string, unknown>).candles = { ...candles, count: candles.style === 'plain' ? DEFAULT_PLAIN_CANDLE_COUNT : null };
        }
      }
      validateCakePatch(storedDesign);
      const designFields = Object.keys(storedDesign);
      if (Object.keys(EMPTY_CAKE).some(key => !designFields.includes(key)) || designFields.some(key => !Object.keys(EMPTY_CAKE).includes(key))) fail('Incomplete saved cake.');
      const savedDesign = storedDesign as CakeState;
      const design = applyCakePatch(EMPTY_CAKE, savedDesign).state;
      if (!design.exists || canonical(design) !== canonical(savedDesign)) fail('Invalid saved cake.');
      return deepFreeze({ id: raw.id, design, estimate: estimateCake(design), quantity: raw.quantity as number, createdAt: raw.createdAt });
    });
  } catch { return []; }
}

export interface CakeHistory { cake: CakeState; history: CakeState[] }
export type CakeAction = { type: 'apply'; patch: CakePatch } | { type: 'undo' } | { type: 'reset' } | { type: 'assetReady'; request: string; assetId: string };
export function cakeReducer(state: CakeHistory, action: CakeAction): CakeHistory {
  if (action.type === 'assetReady') {
    if (!isAssetId(action.assetId)) fail('Invalid custom decoration asset ID.');
    if (!state.cake.customTopper || normalizeCustomRequest(state.cake.customTopper.request) !== normalizeCustomRequest(action.request)) return state;
    const complete = (cake: CakeState): CakeState => {
      if (!cake.customTopper || normalizeCustomRequest(cake.customTopper.request) !== normalizeCustomRequest(action.request) || cake.customTopper.assetId === action.assetId) return cake;
      return { ...cloneCake(cake), customTopper: { request: cake.customTopper.request, assetId: action.assetId } };
    };
    return { cake: complete(state.cake), history: state.history.map(cake => deepFreeze(complete(cake))) };
  }
  if (action.type === 'reset') return { cake: cloneCake(EMPTY_CAKE), history: [] };
  if (action.type === 'undo') return state.history.length ? { cake: cloneCake(state.history[state.history.length - 1]), history: state.history.slice(0, -1) } : state;
  const { state: cake } = applyCakePatch(state.cake, action.patch);
  if (JSON.stringify(cake) === JSON.stringify(state.cake)) return state;
  return { cake, history: [...state.history, deepFreeze(cloneCake(state.cake))].slice(-100) };
}
