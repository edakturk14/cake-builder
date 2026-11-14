import { performance } from 'node:perf_hooks';
import {
  applyCakePatch, validateCakePatch,
  FLAVORS, THEMES, TOPPINGS, SPONGE_LAYERS, PLAIN_CANDLE_COUNTS, CANDLE_STYLES,
  type CakePatch,
} from '../src/shared/cake';
import type { InterpretRequest } from '../src/shared/interpretation';
import { TOPPER_CATALOG, TOPPER_IDS } from '../src/shared/toppers';
import { OCCASIONS, OCCASION_IDS } from '../src/shared/occasions';
import {
  PALETTE, PALETTE_IDS, SIZE_OPTIONS, POSITION_OPTIONS,
  WRITING_FONT_OPTIONS, WRITING_CASE_OPTIONS, WRITING_PLACEMENT_OPTIONS,
} from '../src/shared/appearance';

export const DEFAULT_TEXT_MODEL = 'openai/gpt-4.1-nano';
const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
/** Test/observability counter: real fallback POST attempts in this process. */
export let fallbackAttempts = 0;

export class FallbackError extends Error {
  constructor(message: string, public status: number, public model: string, public durationMs: number) { super(message); }
}

const nullable = (schema: object) => ({ anyOf: [schema, { type: 'null' }] });
// Nullable CakePatch fields need three states: leave alone, set a value, reset.
const resettable = (schema: object) => ({ anyOf: [schema, { type: 'null' }, { type: 'string', enum: ['keep'] }] });
const enumeration = (values: readonly string[]) => ({ type: 'string', enum: [...values] });
// Match the explicit spaceship synonym already supported by Jev's topper question.
const topperAliases: Partial<Record<typeof TOPPER_IDS[number], readonly string[]>> = { rocket: ['spaceship'] };

/** Strict wire format: null is unchanged except on resettable fields, where "keep" is unchanged. */
export function fallbackSchema() {
  const palette = resettable(enumeration(PALETTE_IDS));
  const styleObject = {
    type: 'object', additionalProperties: false,
    properties: {
      size: nullable(enumeration(SIZE_OPTIONS.map(o => o.id))),
      position: nullable(enumeration(POSITION_OPTIONS.map(o => o.id))),
      tint: palette,
    },
    required: ['size', 'position', 'tint'],
  };
  const idArray = (values: readonly string[], max: number) => ({
    type: 'array', items: enumeration(values), maxItems: max,
  });
  return {
    type: 'object', additionalProperties: false,
    properties: {
      exists: nullable({ type: 'boolean' }),
      base: nullable(enumeration(['sponge', 'cheesecake'])),
      flavor: nullable(enumeration(FLAVORS)),
      layers: nullable({ type: 'integer', enum: [...SPONGE_LAYERS] }),
      occasion: resettable(enumeration(OCCASION_IDS)),
      theme: resettable(enumeration(THEMES)),
      toppings: nullable(idArray(TOPPINGS, TOPPINGS.length)),
      toppers: nullable(idArray(TOPPER_IDS, 2)),
      customTopper: resettable({
        type: 'object', additionalProperties: false,
        properties: { request: { type: 'string', minLength: 1, maxLength: 120 } },
        required: ['request'],
      }),
      colors: nullable({
        type: 'object', additionalProperties: false,
        properties: { frosting: palette, filling: palette, inscription: palette, accents: palette },
        required: ['frosting', 'filling', 'inscription', 'accents'],
      }),
      topperStyles: nullable({
        type: 'object', additionalProperties: false,
        properties: Object.fromEntries(TOPPER_IDS.map(id => [id, resettable(styleObject)])),
        required: [...TOPPER_IDS],
      }),
      inscriptionStyle: nullable({
        type: 'object', additionalProperties: false,
        properties: {
          font: nullable(enumeration(WRITING_FONT_OPTIONS.map(o => o.id))),
          letterCase: nullable(enumeration(WRITING_CASE_OPTIONS.map(o => o.id))),
          size: nullable(enumeration(SIZE_OPTIONS.map(o => o.id))),
          placement: nullable(enumeration(WRITING_PLACEMENT_OPTIONS.map(o => o.id))),
        },
        required: ['font', 'letterCase', 'size', 'placement'],
      }),
      candles: nullable({
        type: 'object', additionalProperties: false,
        properties: {
          style: nullable(enumeration(CANDLE_STYLES)),
          number: resettable({ type: 'string', pattern: '^\\d{1,3}$' }),
          count: resettable({ type: 'integer', minimum: 1, maximum: 12 }),
        },
        required: ['style', 'number', 'count'],
      }),
      inscription: nullable({ type: 'string', maxLength: 60 }),
      addToppings: nullable(idArray(TOPPINGS, TOPPINGS.length)),
      removeToppings: nullable(idArray(TOPPINGS, TOPPINGS.length)),
      addToppers: nullable(idArray(TOPPER_IDS, 2)),
      removeToppers: nullable(idArray(TOPPER_IDS, 2)),
    },
    required: [
      'exists', 'base', 'flavor', 'layers', 'occasion', 'theme', 'toppings', 'toppers',
      'customTopper', 'colors', 'topperStyles', 'inscriptionStyle', 'candles', 'inscription',
      'addToppings', 'removeToppings', 'addToppers', 'removeToppers',
    ],
  };
}

export function systemPrompt() {
  return `You convert one sentence from an ongoing cake-design conversation into a CakePatch JSON object describing ONLY the requested change. Output JSON matching the provided schema exactly. Rules:
- Every top-level key is required. Never invent prices. This is a PATCH, not the resulting cake: do NOT echo current values. Preserve unmentioned fields.
- Unchanged occasion, theme and customTopper MUST be "keep"; null explicitly removes them. An unchanged colors/topperStyles/candles container is null. Inside colors, every unchanged color is "keep", null resets that color. Inside topperStyles, every unchanged topper entry is "keep", null resets that topper's whole appearance; inside a changed entry tint uses "keep"/null/value, while size/position use null for unchanged. Inside candles, unchanged number/count are "keep", null explicitly clears them. Other nullable fields use null for unchanged. inscription "" explicitly clears writing.
- Lists use null for unchanged, [] to explicitly clear the whole list, and a nonempty array to replace it. Empty add/remove lists perform no operations.
- CRITICAL: the patch describes ONLY the change, never the resulting cake. If flavor is unmentioned, flavor MUST be null. If existing toppers are merely preserved, toppers MUST be null. Echoing current values is a failure.
- Use ONLY the enum values supplied. occasion must be one of the listed occasion ids. toppers/addToppers/removeToppers must be catalog topper ids; at most two toppers may be on the cake at once.
- For a decorative object explicitly named in the sentence but NOT in the topper catalog, use customTopper {request:"<exact object words from the sentence>"}. Check the catalog FIRST: a catalog object uses its id, never customTopper. Never invent a custom object from a mood.
- Prefer addToppings/removeToppings/addToppers/removeToppers for additions/removals; use the full toppings/toppers arrays only for explicit whole-list replacements.
- Interpret open-ended aesthetic requests using the palette meanings and existing objects' appearance. Infer a coherent palette/style, not an unrelated object. Adding new prepared objects, occasion labels and theme kits requires that the user actually names them: do not turn a mood or season into an unsolicited decoration, occasion or theme. If no defensible bounded interpretation exists, leave it unchanged rather than selecting arbitrary enum values.
- Never set both a full list (toppings/toppers) and its add/remove lists in the same patch; prefer add/remove lists.
- candles: style plain with count 1-12 for ordinary candles, style number with number for numeral/age candles, style none to remove. Leave candles null unless the sentence actually requests candles or an age numeral.
- If the sentence requests any design and the current cake does not exist yet, set exists true; otherwise leave exists null.
- colors.frosting is outer icing, colors.filling is between layers, colors.inscription is writing color, colors.accents is decoration color. inscriptionStyle describes the writing only. topperStyles restyle an existing named topper only.
- occasion is just a label: never add decorations because of it. theme is only for an explicitly named listed theme kit.
- If the sentence requests nothing that maps to these fields, use the unchanged representation for every key.`;
}

export function userPayload(request: InterpretRequest) {
  return JSON.stringify({
    latest_sentence: request.phrase,
    current_confirmed_cake: request.state,
    catalogs: {
      flavors: FLAVORS, bases: ['sponge', 'cheesecake'], layers: SPONGE_LAYERS,
      toppings: TOPPINGS,
      toppers: TOPPER_CATALOG.map(t => ({ id: t.id, label: t.label, meaning: t.jevDescription, aliases: topperAliases[t.id] ?? [] })),
      occasions: OCCASIONS.map(o => ({ id: o.id, label: o.label })),
      themes: THEMES,
      palette: PALETTE.map(c => ({ id: c.id, label: c.label, meaning: c.jevDescription })),
      topper_sizes: SIZE_OPTIONS.map(o => o.id), topper_positions: POSITION_OPTIONS.map(o => o.id),
      writing_fonts: WRITING_FONT_OPTIONS.map(o => o.id), writing_cases: WRITING_CASE_OPTIONS.map(o => o.id),
      writing_placements: WRITING_PLACEMENT_OPTIONS.map(o => o.id),
      candle_styles: CANDLE_STYLES, plain_candle_counts: [PLAIN_CANDLE_COUNTS[0], PLAIN_CANDLE_COUNTS.at(-1)],
    },
  });
}

/** Demo-limit and user-input-dependent answers are intentional; open vagueness goes to the fallback. */
export function isIntentionalNotice(notice: string): boolean {
  return [
    'Which topper would you like? Try a castle, unicorn, or knight.',
    'Up to two toppers in this demo',
    "Tiers aren't in this demo; I kept the existing layer count.",
    'Which existing topper should I replace?',
    'Which topper should I restyle?',
    'Cheesecake has one baked layer in this demo. Sponge cakes support up to three layers.',
    'Which number should go on the candles? I kept them unchanged.',
    'Do you mean ordinary candles or a numeral-shaped candle? I kept them unchanged.',
    'How many plain candles would you like? I kept them unchanged.',
    'Use between 1 and 12 plain candles. I kept them unchanged.',
    'Please use an inscription of 60 characters or fewer.',
    'Please describe the custom topper in 120 characters or fewer.',
  ].includes(notice) || notice.startsWith('Add the ');
}

function meaningfulPatch(patch: CakePatch): boolean {
  return Object.entries(patch).some(([key, value]) => {
    if (key === 'notes' || value === undefined) return false;
    return Array.isArray(value) ? value.length > 0 : true;
  });
}

/** Fallback only when Jev produced no meaningful edit and no intentional design answer. */
export function shouldUseFallback(action: string, patch: CakePatch, notices: readonly string[], changed: boolean): boolean {
  if (action !== 'edit' && action !== 'clarify') return false;
  if (changed || meaningfulPatch(patch)) return false;
  return notices.every(note => !isIntentionalNotice(note));
}

export type FallbackSuccess = {
  patch: CakePatch; notices: string[]; model: string; durationMs: number; status: number; costUsd?: number;
};

function resettablePath(path: string[]): boolean {
  return path.length === 1 && ['occasion', 'theme', 'customTopper'].includes(path[0])
    || path[0] === 'colors' && path.length === 2
    || path[0] === 'topperStyles' && (path.length === 2 || path.length === 3 && path[2] === 'tint')
    || path[0] === 'candles' && path.length === 2 && ['number', 'count'].includes(path[1]);
}

/** Decode only the wire's unchanged values; [] and explicit resets retain CakePatch semantics. */
function sanitizePatch(value: unknown, path: string[] = []): unknown {
  if (resettablePath(path)) {
    if (value === 'keep') return undefined;
    if (value === null) return null;
  }
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      const next = sanitizePatch(item, [...path, key]);
      if (next !== undefined) clean[key] = next;
    }
    return Object.keys(clean).length ? clean : undefined;
  }
  return value === null ? undefined : value;
}

type WireSchema = {
  anyOf?: WireSchema[]; type?: string; enum?: readonly unknown[];
  properties?: Record<string, WireSchema>; required?: readonly string[]; additionalProperties?: boolean;
  items?: WireSchema; maxItems?: number; minLength?: number; maxLength?: number; pattern?: string;
  minimum?: number; maximum?: number;
};

/** Validate the restricted schema vocabulary above locally as well as at the provider boundary. */
function matchesWireSchema(value: unknown, schema: WireSchema): boolean {
  if (schema.anyOf) return schema.anyOf.some(branch => matchesWireSchema(value, branch));
  if (schema.enum && !schema.enum.includes(value)) return false;
  if (schema.type === 'null') return value === null;
  if (schema.type === 'boolean') return typeof value === 'boolean';
  if (schema.type === 'integer') return typeof value === 'number' && Number.isInteger(value)
    && (schema.minimum === undefined || value >= schema.minimum) && (schema.maximum === undefined || value <= schema.maximum);
  if (schema.type === 'string') return typeof value === 'string'
    && (schema.minLength === undefined || value.length >= schema.minLength)
    && (schema.maxLength === undefined || value.length <= schema.maxLength)
    && (!schema.pattern || new RegExp(schema.pattern).test(value));
  if (schema.type === 'array') return Array.isArray(value)
    && (schema.maxItems === undefined || value.length <= schema.maxItems)
    && value.every(item => schema.items && matchesWireSchema(item, schema.items));
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const object = value as Record<string, unknown>, properties = schema.properties ?? {};
    return (schema.required ?? []).every(key => Object.hasOwn(object, key))
      && Object.entries(object).every(([key, item]) => Object.hasOwn(properties, key) && matchesWireSchema(item, properties[key]));
  }
  return false;
}

const words = (value: string) => value.normalize('NFKC').toLowerCase().replace(/['’]/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const containsWords = (phrase: string, value: string) => ` ${words(phrase)} `.includes(` ${words(value)} `);

/** A support check, not an interpreter: never select a value or invent a replacement here. */
function assertGroundedAdditions(patch: CakePatch, request: InterpretRequest): void {
  const unsupported = () => { throw new Error('Unsupported inferred object or event'); };
  const source = words(request.phrase);
  const generic = new Set(['a', 'an', 'the', 'and', 'with', 'in', 'on', 'of', 'or', 'not', 'no', 'original',
    'generic', 'friendly', 'little', 'baby', 'figure', 'figurine', 'topper', 'decoration', 'cake', 'character',
    'creature', 'object', 'design', 'blue', 'white', 'red', 'gold', 'pink', 'green', 'black', 'pastel', 'colorful']);
  const sourceTokens = new Set(source.split(' '));
  const objectSupported = (id: typeof TOPPER_IDS[number]) => {
    const topper = TOPPER_CATALOG.find(item => item.id === id)!;
    // Catalog descriptions supply aliases/concepts, but their "not ..." exclusions are never evidence.
    const meaning = topper.jevDescription.split(/;|\bnot\b/i)[0];
    const named = [id, topper.label, ...meaning.split(','), ...(topperAliases[id] ?? [])].some(alias => containsWords(source, alias));
    // Descriptive concepts may support an explicit scene/theme request, not a mere palette/mood.
    const sceneRequested = /\b(?:theme|themed|scene|wonderland|landscape|tableau)\b/u.test(source)
      && !/\b(?:palette|colors|colours|frosting|icing|lettering)\b/u.test(source);
    return named || sceneRequested && words(meaning).split(' ').some(token =>
      token.length > 2 && !generic.has(token) && sourceTokens.has(token));
  };
  for (const id of [...(patch.addToppers ?? []), ...(patch.toppers ?? [])]) {
    if (!request.state.toppers.includes(id) && !objectSupported(id)) unsupported();
  }
  if (patch.customTopper?.request && !containsWords(source, patch.customTopper.request)) unsupported();
  if (patch.theme && patch.theme !== request.state.theme && !containsWords(source, patch.theme)) unsupported();
  if (patch.occasion && patch.occasion !== request.state.occasion) {
    const occasion = OCCASIONS.find(item => item.id === patch.occasion)!;
    const named = [occasion.id, occasion.label, ...occasion.jevDescription.split(/[,;]/)].some(alias => containsWords(source, alias));
    const ageContext = patch.occasion === 'birthday' && /\b(?:turning|turns|aged|age|years? old)\b/u.test(source);
    if (!named && !ageContext) unsupported();
  }
}

/** Returns null only when the key is missing (fallback disabled, Jev answer stands). */
export async function runFallback(request: InterpretRequest): Promise<FallbackSuccess | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  const model = process.env.OPENROUTER_TEXT_MODEL || DEFAULT_TEXT_MODEL;
  fallbackAttempts += 1;
  const started = performance.now();
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt() },
          { role: 'user', content: userPayload(request) },
        ],
        response_format: { type: 'json_schema', json_schema: { name: 'cake_patch', strict: true, schema: fallbackSchema() } },
        temperature: 0,
        max_tokens: 4000,
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    const timeout = error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name);
    throw new FallbackError(
      timeout ? 'The backup interpreter timed out. Your design is unchanged.'
        : 'The backup interpreter could not be reached. Your design is unchanged.',
      timeout ? 504 : 502, model, performance.now() - started);
  }
  const durationMs = performance.now() - started;
  const text = await response.text();
  if (!response.ok) {
    throw new FallbackError(
      response.status === 402
        ? 'The backup interpreter returned HTTP 402 (insufficient OpenRouter credits). Your design is unchanged.'
        : `The backup interpreter returned HTTP ${response.status}. Your design is unchanged.`,
      response.status, model, durationMs);
  }
  let content: unknown, usage: unknown;
  try {
    const body = JSON.parse(text) as { choices?: { message?: { content?: unknown } }[]; usage?: unknown };
    content = body.choices?.[0]?.message?.content;
    usage = body.usage;
  } catch { content = undefined; }
  if (typeof content !== 'string' || !content.trim()) {
    throw new FallbackError('The backup interpreter returned no edit. Your design is unchanged.', 502, model, durationMs);
  }
  let parsed: unknown;
  try { parsed = JSON.parse(content); }
  catch { throw new FallbackError('The backup interpreter returned malformed JSON. Your design is unchanged.', 502, model, durationMs); }
  // The model must not supply assetIds; strip defensively before validation.
  if (parsed && typeof parsed === 'object' && 'customTopper' in parsed) {
    const custom = (parsed as { customTopper?: unknown }).customTopper;
    if (custom && typeof custom === 'object') delete (custom as { assetId?: unknown }).assetId;
  }
  if (!matchesWireSchema(parsed, fallbackSchema())) {
    throw new FallbackError('The backup interpreter returned an invalid cake edit. Your design is unchanged.', 502, model, durationMs);
  }
  const patch = sanitizePatch(parsed) ?? {};
  // Deterministic safety net: a customTopper naming a catalog topper becomes that catalog id
  // (custom requests trigger paid image generation; catalog ids never should).
  if (patch && typeof patch === 'object') {
    const record = patch as Record<string, unknown>;
    const custom = record.customTopper as { request?: unknown } | undefined;
    if (custom && typeof custom.request === 'string') {
      const normalized = custom.request.toLowerCase().replace(/^(?:a|an|the)\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();
      const hit = TOPPER_CATALOG.find(topper => topper.id.replace(/-/g, ' ') === normalized || topper.label.toLowerCase() === normalized);
      if (hit) {
        record.addToppers = [...new Set([...(Array.isArray(record.addToppers) ? record.addToppers : []), hit.id])];
        delete record.customTopper;
      }
    }
  }
  try { validateCakePatch(patch); }
  catch { throw new FallbackError('The backup interpreter returned an invalid cake edit. Your design is unchanged.', 502, model, durationMs); }
  let checked: ReturnType<typeof applyCakePatch>;
  try {
    assertGroundedAdditions(patch, request);
  } catch {
    throw new FallbackError('Please clarify the decoration or occasion you want. Your design is unchanged.', 422, model, durationMs);
  }
  try {
    checked = applyCakePatch(request.state, patch);
  } catch {
    throw new FallbackError('The backup interpreter returned an invalid cake edit. Your design is unchanged.', 502, model, durationMs);
  }
  if (JSON.stringify(checked.state) === JSON.stringify(request.state)) {
    throw new FallbackError('The backup interpreter found no change to make. Your design is unchanged.', 422, model, durationMs);
  }
  const cost = (usage as { cost?: unknown } | undefined)?.cost;
  return {
    patch, notices: checked.notes, model, durationMs, status: response.status,
    ...(typeof cost === 'number' && Number.isFinite(cost) && cost >= 0 ? { costUsd: cost } : {}),
  };
}
