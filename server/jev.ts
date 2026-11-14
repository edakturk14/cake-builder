import { performance } from 'node:perf_hooks';
import { applyCakePatch, validateCakePatch, cloneCake, PLAIN_CANDLE_COUNTS, type CakePatch, type CakeState } from '../src/shared/cake';
import { applyAppearance, appearanceQuestions } from './appearance';
import { OCCASIONS, OCCASION_IDS } from '../src/shared/occasions';
import { FallbackError, runFallback, shouldUseFallback } from './fallback';
import { catalogTopperForRequest, filterCustomTopperIntent } from './customTopperIntent';
import type { InterpretRequest, InterpretResponse } from '../src/shared/interpretation';
import { TOPPER_CATALOG, TOPPER_IDS, TOPPER_BY_ID, type TopperId } from '../src/shared/toppers';

type Question = { type: 'choice'; instructions: string; criteria: Record<string, string> };
type Questions = Record<string, Question>;
const flavors = ['vanilla', 'chocolate', 'red-velvet', 'lemon', 'classic'] as const;
const themes = ['mario', 'formula-one', 'spain-world-cup', 'tennis', 'jensen-huang'] as const;
const toppings = ['strawberries', 'raspberries', 'ganache', 'caramel', 'gold-stars'] as const;
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const oneOf = (value: unknown, options: readonly unknown[]) => options.includes(value);

export class InterpretationError extends Error {
  constructor(message: string, public status: number, public providerMs?: number) {
    super(message);
  }
}

export function validateRequest(value: unknown): InterpretRequest {
  if (!record(value) || typeof value.turnId !== 'string' || !/^[\w-]{1,100}$/.test(value.turnId)
    || typeof value.phrase !== 'string' || !value.phrase.trim() || value.phrase.length > 600
    || !record(value.state)) throw new InterpretationError('Invalid command. Use 1–600 characters.', 400);
  const s = value.state;
  if (typeof s.exists !== 'boolean' || !oneOf(s.base, ['sponge', 'cheesecake'])
    || !oneOf(s.flavor, flavors) || !oneOf(s.layers, [1, 2, 3])
    || !oneOf(s.occasion, [...OCCASION_IDS, null])
    || !oneOf(s.theme, [...themes, null]) || Object.hasOwn(s, 'topper')
    || !Array.isArray(s.toppers) || s.toppers.length > 2 || new Set(s.toppers).size !== s.toppers.length
    || !s.toppers.every(topper => oneOf(topper, TOPPER_IDS))
    || !(s.customTopper === null || (record(s.customTopper) && typeof s.customTopper.request === 'string' && s.customTopper.request.length <= 120))
    || typeof s.inscription !== 'string' || s.inscription.length > 80
    || !Array.isArray(s.toppings) || s.toppings.length > 5 || !s.toppings.every(t => oneOf(t, toppings))
    || !record(s.candles) || !oneOf(s.candles.style, ['none', 'plain', 'number'])
    || !(s.candles.count === null || oneOf(s.candles.count, PLAIN_CANDLE_COUNTS))
    || (s.candles.style === 'plain' && !oneOf(s.candles.count, PLAIN_CANDLE_COUNTS))
    || !(s.candles.number === null || (typeof s.candles.number === 'string' && /^\d{1,3}$/.test(s.candles.number)))) {
    throw new InterpretationError('The confirmed cake state is invalid. Reset and try again.', 400);
  }
  try {
    validateCakePatch({ colors: s.colors, topperStyles: s.topperStyles, inscriptionStyle: s.inscriptionStyle, customTopper: s.customTopper, candles: s.candles });
    if (!record(s.colors) || Object.keys(s.colors).length !== 4 || !record(s.inscriptionStyle) || Object.keys(s.inscriptionStyle).length !== 4
      || (record(s.customTopper) && (!Object.hasOwn(s.customTopper, 'assetId') || !Object.hasOwn(s.customTopper, 'request')))) throw new Error('Incomplete appearance state.');
  } catch { throw new InterpretationError('The confirmed cake appearance is invalid. Reset and try again.', 400); }
  const state: CakeState = {
    exists: s.exists as boolean, base: s.base as CakeState['base'], flavor: s.flavor as CakeState['flavor'],
    layers: s.layers as CakeState['layers'], occasion: s.occasion as CakeState['occasion'], theme: s.theme as CakeState['theme'],
    toppings: [...s.toppings] as CakeState['toppings'], toppers: [...s.toppers] as TopperId[],
    customTopper: s.customTopper as CakeState['customTopper'], colors: s.colors as CakeState['colors'], topperStyles: s.topperStyles as CakeState['topperStyles'], inscriptionStyle: s.inscriptionStyle as unknown as CakeState['inscriptionStyle'],
    candles: { style: s.candles.style as CakeState['candles']['style'], number: s.candles.number as string | null, count: s.candles.count as number | null },
    inscription: s.inscription,
  };
  return { turnId: value.turnId, phrase: value.phrase.trim(), state: cloneCake(state) };
}

// These are candidate spans, not decisions. Only Jev may assign them a purpose.
export function extractCandidates(phrase: string): string[] {
  const candidates = new Set<string>();
  const add = (text: string, quoted = false) => {
    const clean = quoted ? text.trim() : text.trim().replace(/^[“"'‘]+|[”"'’.]+$/g, '').trim();
    if (clean && clean.length <= 160 && candidates.size < 240) candidates.add(clean);
    // Keep the exact punctuation-bearing span for inscriptions, while also
    // discovering its bare numeric token (30th, -> 30th) for numeric choices.
    const numericToken = clean.replace(/[,;:!?]+$/g, '');
    if (numericToken && numberFromSpan(numericToken) !== null && candidates.size < 240) candidates.add(numericToken);
  };
  for (const match of phrase.matchAll(/[“"‘']([^“”"'‘’]{1,160})[”"’']/g)) add(match[1], true);
  for (const match of phrase.matchAll(/(?:write|inscribe|name\s+(?:it|to|is)|named|says?|shaped like)\s+(.+)/gi)) {
    add(match[1]);
    add(match[1].split(/\s+(?:on\s+(?:it|top|the cake)|and\s+(?:add|make|put|keep|remove))\b/i)[0]);
  }
  const words = [...phrase.matchAll(/[\p{L}\p{N}][\p{L}\p{N}'’,-]*/gu)];
  // Long suffixes and clauses support arbitrary names/messages, including punctuation.
  for (const part of phrase.split(/[.!?;]/)) add(part);
  for (let length = 1; length <= 8; length++) {
    for (let start = 0; start + length <= words.length; start++) {
      const a = words[start], b = words[start + length - 1];
      add(phrase.slice(a.index, b.index! + b[0].length));
    }
  }
  return [...candidates];
}

export function buildQuestions(candidates: string[]): Questions {
  const q: Questions = {};
  const ask = (id: string, instructions: string, values: Record<string, string>) => {
    q[id] = { type: 'choice', instructions, criteria: values };
  };
  const keep = { keep: 'Not explicitly changed by latest_phrase; preserve confirmed value.', clarify: 'Requested but unclear or unsupported. Preserve and ask.' };
  const choose = (id: string, instructions: string, values: readonly string[], extra = {}) =>
    ask(id, instructions, { ...keep, ...Object.fromEntries(values.map(v => [v, `Explicitly requested ${v}.`])), ...extra });
  ask('action', `What cake action does latest_phrase request in this ongoing cake-design conversation? Any relevant edit includes context-only occasion statements without the word cake, e.g. "it's for my promotion", "it's my graduation", "wedding", or appearance edits. Supported occasions: ${OCCASIONS.map(item => item.label).join(', ')}.`, {
    edit: 'Create/edit a cake OR provide its occasion/context/appearance, including it is for my promotion.',
    undo: 'Explicitly undo/revert the previous edit.',
    reset: 'Explicitly start over/reset the design.',
    keep: 'No interpretable cake-design request or relevant occasion context.',
    clarify: 'Unrelated or cannot understand the request. Do not use for a clear occasion statement.',
  });
  choose('exists', 'Does latest_phrase request creating or editing a cake? Any meaningful cake edit creates a default chocolate sponge if empty.', ['yes']);
  choose('base', 'Which cake base is explicitly requested now? Flavor names imply sponge, except cheesecake. Preserve unmentioned base.', ['sponge', 'cheesecake']);
  choose('flavor', 'Which flavor is explicitly requested? Spain is a theme, not flavor. Classic means classic baked cheesecake only. Keep if unmentioned.', flavors);
  choose('layers', 'How many sponge layers are explicitly requested now? A tier is a separate stacked cake, NOT a layer. Keep for tiers.', ['1', '2', '3']);
  choose('tiers', 'Does latest_phrase request multiple tiers, meaning separate cakes stacked? Not sponge layers.', ['yes', 'no']);
  ask('occasion', 'Choose the explicitly requested cake occasion. "graduation cake with a cap" means GRADUATION occasion (plus a separate cap topper); "it is for my promotion" means PROMOTION. "It is my 30th, add a number candle" means BIRTHDAY, even without the word birthday. A New Year birthday is birthday (the birthday is the event, New Year its date). Happy birthday in icing may infer birthday. Adding only a cap object, without saying graduation cake/event, does not change occasion. Generic birthday candles alone do not change occasion. Preserve unmentioned occasion. Do NOT invent decorations from the occasion.', {
    ...keep, none: 'Explicitly clear/remove the occasion label.',
    ...Object.fromEntries(OCCASIONS.map(occasion => [occasion.id, `${occasion.label}: ${occasion.jevDescription}`])),
  });
  choose('theme', 'Which supported visual theme is explicitly requested? Spain World Cup is football with Spain colors. Jensen Huang is a figurine theme. Replacing only princess with Mario should set Mario, not clear candles.', themes, { remove: 'Explicitly remove current theme.' });
  const preparedNames = TOPPER_CATALOG.map(topper => topper.label).join(', ');
  ask('topperOperation', `What operation does latest_phrase request on prepared topper objects? Available prepared identities: ${preparedNames}. Add keeps all unrelated existing toppers. Replace removes ONLY named outgoing objects. A supported theme such as Mario is not a catalog topper, but swapping princess for Mario still removes princess. Only an unnamed generic category such as a character or a figure needs clarification; a named unicorn/castle/knight is specific and supported.`, {
    keep: 'No prepared topper change. Gold stars, fruit, ganache, caramel, candles, inscription, flavor and layers are NOT prepared topper requests, even when placed on top. Existing toppers are only context. A custom portrait alone is separate.',
    add: 'Explicit ADD or PUT of named prepared toppers. Add a unicorn, add a castle, add a spaceship, put a knight next to princess all mean add. App code enforces the limit; still choose add for a third topper.',
    remove: 'Remove explicitly named prepared toppers only.',
    replace: 'Swap explicitly named outgoing toppers for new objects or a theme; preserve unrelated toppers.',
    clarify: 'Only an unspecified category is given, e.g. a character, a figure, an animal, something cute. Specific named unicorn/castle/knight/dragon etc are NOT generic.',
  });
  const catalogCriteria = Object.fromEntries(TOPPER_CATALOG.map(topper => [topper.id, topper.jevDescription]));
  for (const position of ['First', 'Second', 'Third'] as const) {
    ask(`topperIncoming${position}`, `Select the ${position.toLowerCase()} NEW prepared topper object explicitly being ADDED or the incoming replacement, in mention order. Use descriptions to match synonyms, including spaceship -> rocket. Do NOT select objects being removed or only used as location/context: put a knight next to the princess adds knight, not princess. For one incoming object, second and third=none; for two, third=none. The third slot detects overflow, so do NOT truncate a request for three toppers. Named theme kits Mario, Formula One, Spain World Cup, tennis, Jensen Huang are handled as themes: none. Exact portraits of a named pet/person, e.g. my cat Miso or my grandma's face, are no_match even though generic cat/boy/girl exists.`, {
      none: 'No new prepared topper at this position. Also use if only removing, only a theme, or no topper request.',
      no_match: 'A specifically described custom topper/portrait is requested, but no catalog item represents it accurately.',
      clarify: 'Only a vague unspecified character/figure/animal/object was requested; ask what kind.',
      ...catalogCriteria,
    });
    if (position !== 'Third') ask(`topperOutgoing${position}`, `Select the ${position.toLowerCase()} prepared topper explicitly being REMOVED or REPLACED by latest_phrase. Never remove an existing object just because it is mentioned as location/context or was not mentioned. For one outgoing object, second=none. Put a knight next to princess does NOT remove princess. Swap castle for dragon removes castle, NOT dragon.`, {
      none: 'No explicitly named outgoing prepared topper at this position.',
      ...catalogCriteria,
    });
  }
  const spans = Object.fromEntries(candidates.map((span, i) => [`span_${i}`, `Exact transcript span: ${JSON.stringify(span)}`]));
  ask('customTopperAction', `What action does the latest phrase request on an UNSUPPORTED custom topper? Prepared catalog: ${preparedNames}. Theme kits Mario, Formula One, Spain World Cup, tennis, Jensen Huang are also supported. These are NEVER custom. A specific portrait of my cat Miso or my grandma's face IS custom; a generic cat IS catalog. Vague a character/a figure must clarify, not invent a custom portrait. Ignore icing names.`, {
    keep: 'No custom topper change. Also use for supported decorations, icing, candles, fruit or cake flavors.',
    add: 'Explicitly requests a custom/unsupported object or figurine, e.g. a topper shaped like my cat Miso.',
    remove: 'Explicitly removes or replaces the existing custom topper, e.g. remove the cat and put a candle there.',
    clarify: 'A custom topper edit is requested but its operation is unclear.',
  });
  ask('customTopper', `If adding an UNSUPPORTED custom topper/portrait, select ONLY the exact object-description noun phrase, including possessive and name: a topper shaped like my cat Miso -> my cat Miso; add my grandma's face -> my grandma's face. Exclude command/wrapper words a topper shaped like, add, remove. For removal choose remove, not a span. Prepared catalog (${preparedNames}) and theme kits are not custom; generic character/figure is unclear: keep.`, { ...keep, remove: 'Explicitly remove or replace existing custom topper, not add a new object.', ...spans });
  ask('candles', 'Choose candle style. A quantity of plural candles (3 candles, three candles, add 5 candles, make it 6 candles) means PLAIN candles with that count, NOT a numeral. Generic candles/birthday candles without numeric age means PLAIN. A singular a 3 candle, number 3 candle, candle shaped like a 3, or 40th birthday means NUMBER/numeral candles. Calendar years are not ages. Preserve unmentioned candles.', {
    keep: 'No candle change or age requested. Birthday occasion or Happy birthday icing alone does not request candles.',
    plain: 'Ordinary/birthday candles, or a count such as 3 candles/three candles/add 5 candles/make it 6 candles. Includes gold stars and candles.',
    number: 'A numeral/number-shaped candle or birthday age: a 3 candle, number 21 candle, 40th birthday. Or correction of an existing numeral.',
    remove: 'Explicitly remove candles.',
    clarify: 'A candle change is explicitly requested but cannot be understood. Do NOT use just because candles have no number; that means plain.',
  });
  ask('candleNumericRole', 'Classify the explicitly requested number near candles or a birthday age. Plural QUANTITY: 3 candles, three candles, add 5 candles, make it 6 candles => plain-count. Singular numeral: a 3 candle, number 3 candle, numeral, candle shaped like a 3 => numeral. Ordinal birthday age (3rd/40th birthday or it is my 30th, add a number candle) => numeral. Actually make it 41 corrects an existing numeral unless phrase explicitly says 41 ordinary candles. Calendar year/layers/inscription-only numbers do not count. Generic candles/birthday candles with NO number => keep.', {
    keep: 'No numeric candle quantity, numeral request or birthday age is referred to.',
    'plain-count': 'A QUANTITY of ordinary candles, e.g. 3 candles or three candles, not the numeral3.',
    numeral: 'A number-shaped candle or birthday age, e.g. a 3 candle, number3, or 30th birthday.',
    clarify: 'A number is explicitly requested for candles but quantity versus numeral is genuinely unclear.',
  });
  ask('scope_candleNumericRole', 'Does this phrase explicitly request a candle quantity, a numeral-shaped candle, or numeric birthday age? 3 candles/three candles/a 3 candle/40th birthday count. Candles or birthday candles WITHOUT any numeric age/count do not count. Exclude calendar years, layers, inscription-only numbers.', {
    mentioned: 'A numeric candle quantity, numeral style/value or birthday age is explicitly referred to.',
    unmentioned: 'No numeric candle role; generic plain candles or unrelated numbers alone.',
  });
  // Candidate discovery/number normalization is mechanical. Jev still decides which
  // number, if any, is an age/candle rather than a layer count or other reference.
  const numericCandidates = candidates.map((text, index) => ({ text, index, number: numberFromSpan(text) }))
    .filter(item => item.number !== null)
    .sort((a, b) => Number(/^\d+$/.test(b.text)) - Number(/^\d+$/.test(a.text)));
  const numericSpans: Record<string, string> = {};
  const seenNumbers = new Set<string>();
  for (const item of numericCandidates) {
    if (seenNumbers.has(item.number!)) continue;
    seenNumbers.add(item.number!);
    numericSpans[`span_${item.index}`] = `Numeric candidate ${item.number}, exact transcript span: ${JSON.stringify(item.text)}. Equivalent ordinal/spelled mentions are grouped with this value.`;
  }
  ask('candleNumber', 'Which candidate numeric value is explicitly requested as the ordinary candle COUNT, birthday AGE or candle NUMERAL? 3 candles/three candles => select3 as a count; a 3 candle => select3 as a numeral (role classified separately). Each value has one candidate even if repeated as40th and40. Actually make it41 corrects existing number candles. Exclude layer counts, calendar years and inscription-only numbers. No numeric age/count/value means keep.', { ...keep, ...numericSpans });
  ask('inscription', 'Choose the EXACT requested icing text only, excluding command words, on top/on it, and style instructions in capitals/in gold/in print/etc. Write Eda in capitals -> Eda, with case handled separately. Write it in gold changes ONLY letter color: keep text. Write Eda -> Eda; Change the name to Ada -> Ada; Write Happy New Year, Eda -> Happy New Year, Eda. Do not invent inscription from age or topper name. Preserve exact spelling and case.', { ...keep, remove: 'Explicitly remove inscription.', ...spans });
  for (const topping of toppings) ask(`topping_${topping}`, `What action is explicitly requested on ${topping} ONLY? Do not remove unrelated toppings. Ganache means chocolate ganache topping, not chocolate sponge flavor.`, { keep: 'Not mentioned; keep.', add: 'Explicitly add or include.', remove: 'Explicitly remove.', clarify: 'Ambiguous requested action.' });
  const subjects: Record<string, string> = {
    base: 'cake base type (sponge or cheesecake), including a flavor that identifies sponge',
    flavor: 'cake flavor', layers: 'sponge layer count, NOT tiers', tiers: 'multiple separate stacked cake tiers, NOT layers',
    occasion: 'occasion, including Happy birthday icing', theme: 'a supported visual theme: Mario, Formula One, Spain World Cup, tennis, Jensen Huang',
    topperOperation: 'prepared topper objects being added, removed or replaced; vague character/figure requests count',
    customTopper: 'an unsupported custom portrait/topper, NOT prepared catalog items, supported themes or inscription names',
    candles: 'candles or numeric age', candleNumber: 'candle number or age, NOT layer count or calendar year',
    inscription: 'icing inscription or its name/message',
    ...Object.fromEntries(toppings.map(topping => [`topping_${topping}`, `${topping} topping specifically`])),
  };
  for (const [id, subject] of Object.entries(subjects)) ask(`scope_${id}`, `Does latest_phrase request a change to ${subject}? Only assess the latest phrase, not fields already present in confirmed_cake.`, {
    mentioned: 'The latest request asks to add, remove, replace or change this field.',
    unmentioned: 'The latest request does not concern this field. Existing confirmed values do not count as a mention.',
  });
  ask('scope_topperOperation', `Does the LATEST phrase request adding, removing or replacing a standalone prepared topper object, or ask for an unspecified character/figure? Prepared identities: ${preparedNames}. A named object such as castle, unicorn or knight counts even without the word topper IF being added/removed/replaced. EXCLUDE size/position/tint-only edits to existing toppers, e.g. make the castle bigger or put the princess on the left: those are separate appearance questions, not an add/remove operation. EXCLUDE loose gold stars, fruit/berries, ganache, caramel, candles, icing inscription, cake layers/flavor/base/occasion; these alone mean unmentioned even if they go on top. A named theme kit alone or a specific custom portrait alone is handled elsewhere and means unmentioned. Existing confirmed toppers do not count unless this phrase asks to add/remove/replace them.`, {
    mentioned: 'This latest phrase explicitly asks for a prepared topper object edit, e.g. add a unicorn, remove castle, swap princess for Mario, or asks for an unspecified character/figure.',
    unmentioned: 'No prepared topper edit is requested. A cake/flavor/layers/toppings/candles/icing/occasion edit alone is unmentioned. Gold stars are loose toppings, not a star-wand topper. My cat Miso and my grandma’s face are specific custom portraits, not prepared toppers.',
  });
  ask('scope_candleNumber', 'Does latest_phrase refer to an explicit ordinary candle COUNT, numeric candle VALUE or birthday AGE, digits or spelled words? 3 candles, three candles, a 3 candle, 40th birthday count. Generic candles/birthday candles without any number do NOT. Exclude layer counts, calendar years and inscription-only numbers. Existing number candles alone do not count; actually make it41 is an explicit correction.', {
    mentioned: 'The request explicitly refers to a candle numeral or birthday age, or explicitly asks for a number value but leaves it ambiguous.',
    unmentioned: 'No candle number or numeric age is referred to. Includes add candles, add birthday candles, remove candles, and ordinary plain candles.',
  });
  ask('scope_inscription', 'Does the latest phrase explicitly request new/changed/removed literal inscription TEXT? Write Eda in capitals = mentioned (text Eda plus separate style). Make the icing pink = unmentioned (outer frosting only). Write it in gold = unmentioned (existing letter color only). Changes only to font/color/size/placement/case of existing writing are unmentioned here. Existing text does not count.', {
    mentioned: 'Explicit new/replacement/removal of literal writing content, e.g. write Eda, change the name to Ada, write Happy birthday.',
    unmentioned: 'No new literal text. Frosting, color, font, case, size, position or other appearance-only edit; preserve existing content.',
  });
  ask('scope_occasion', `Does latest_phrase explicitly name the cake's event/occasion, or ask to clear it? "Graduation cake with a cap" explicitly names graduation as the cake event, so MENTIONED. "It's for my promotion" explicitly names promotion, MENTIONED. "It's my 30th, add a number candle" explicitly gives a birthday age, MENTIONED. Supported events: ${OCCASIONS.map(item => item.label).join(', ')}. Happy birthday inscription may imply birthday. An object-only instruction such as add a cap or Christmas tree, with no cake event requested, is unmentioned. A theme kit such as Mario or Formula One is not an occasion.`, {
    mentioned: 'The cake is explicitly for an event, or event label is being changed/removed. Happy birthday icing counts.',
    unmentioned: 'No occasion edit now. Colors, cake ingredients, layers, generic/birthday candles, object additions and theme kits alone do not count.',
  });
  appearanceQuestions(ask);
  return q;
}

function numberFromSpan(span: string): string | null {
  const digits = span.match(/^(\d{1,3})(?:st|nd|rd|th)?$/i);
  if (digits) return String(Number(digits[1]));
  const units = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const words = span.toLowerCase().replace(/-/g, ' ').trim().split(/\s+/);
  if (words.length === 1 && units.includes(words[0])) return String(units.indexOf(words[0]));
  if (tens.includes(words[0]) && words.length <= 2 && (!words[1] || units.indexOf(words[1]) >= 1 && units.indexOf(words[1]) <= 9)) return String(tens.indexOf(words[0]) * 10 + (words[1] ? units.indexOf(words[1]) : 0));
  return null;
}

export function normalizeAnswers(payload: unknown, questions: Questions, candidates: string[], state: CakeState, phrase?: string) {
  if (!record(payload) || typeof payload.model !== 'string' || !record(payload.answers)) throw new InterpretationError('Jev returned an invalid response. Please retry.', 502);
  const answers = payload.answers;
  const notices: string[] = [];
  const ambiguous = new Set<string>();
  const pick = (id: string) => {
    const a = answers[id];
    if (!record(a) || a.type !== 'choice' || typeof a.choice !== 'string'
      || !Object.hasOwn(questions[id].criteria, a.choice) || typeof a.confidence !== 'number'
      || !Number.isFinite(a.confidence) || a.confidence < 0 || a.confidence > 1 || !record(a.probabilities)
      || Object.keys(a.probabilities).length !== Object.keys(questions[id].criteria).length
      || Object.keys(questions[id].criteria).some(key => !Object.hasOwn(a.probabilities as object, key))
      || Object.values(a.probabilities).some(p => typeof p !== 'number' || !Number.isFinite(p) || p < 0 || p > 1)
      || Math.abs(Object.values(a.probabilities).reduce<number>((sum, value) => sum + (value as number), 0) - 1) > 0.03) {
      throw new InterpretationError(`Jev returned an invalid ${id} decision. Please retry.`, 502);
    }
    if (a.confidence < 0.45 || a.choice === 'clarify') {
      ambiguous.add(id);
      return 'keep';
    }
    return a.choice;
  };
  const choices = Object.fromEntries(Object.keys(questions).map(id => [id, pick(id)]));
  const span = (id: string) => choices[id].startsWith('span_') ? candidates[Number(choices[id].slice(5))] : undefined;
  const patch: CakePatch = {};
  const c = choices;
  const isTopper = (value: string): value is TopperId => TOPPER_IDS.includes(value as TopperId);
  const preparedTargetSelected = [c.topperIncomingFirst, c.topperIncomingSecond, c.topperIncomingThird,
    c.topperOutgoingFirst, c.topperOutgoingSecond].some(isTopper);
  const customOnly = ['add', 'remove'].includes(c.customTopperAction) && !preparedTargetSelected;
  const topperMentioned = c.scope_topperOperation === 'mentioned' && !customOnly;
  const numericRole = c.candleNumericRole === 'plain-count' || c.candleNumericRole === 'numeral' ? c.candleNumericRole : null;
  const candleNumberApplicable = numericRole !== 'plain-count' && c.candles !== 'plain' && c.candles !== 'remove'
    && !ambiguous.has('candles') && c.scope_candleNumber === 'mentioned';
  const action = c.action === 'undo' || c.action === 'reset' ? c.action : c.action === 'edit' ? 'edit' : 'clarify';
  if (action !== 'edit') {
    if (action === 'clarify') notices.push('Please describe the cake or the change you would like.');
    return { action, patch, notices, model: payload.model } as const;
  }
  for (const id of ambiguous) {
    if (id.startsWith('appearance_')) continue;
    if (id === 'candleNumericRole') continue;
    if (id === 'candles' && numericRole) continue;
    if (id === 'customTopper' && c.customTopperAction !== 'add') continue;
    if (id === 'candleNumber' && !candleNumberApplicable) continue;
    if (id === 'topperOperation' && !topperMentioned) continue;
    if (id === 'topperOperation' && (answers[id] as Record<string, unknown>).choice === 'clarify') continue;
    if (c[`scope_${id}`] === 'mentioned') notices.push(`Please clarify ${id.replace('topping_', '').replace(/([A-Z])/g, ' $1').toLowerCase()}; I kept it unchanged.`);
  }
  if (c.exists === 'yes') patch.exists = true;
  if (c.base === 'sponge' || c.base === 'cheesecake') patch.base = c.base;
  if (oneOf(c.flavor, flavors)) patch.flavor = c.flavor as CakeState['flavor'];
  if (['1', '2', '3'].includes(c.layers)) patch.layers = Number(c.layers) as 1 | 2 | 3;
  if (c.tiers === 'yes') { delete patch.layers; notices.push("Tiers aren't in this demo; I kept the existing layer count."); }
  if (c.scope_occasion === 'mentioned' && c.occasion === 'none') patch.occasion = null;
  else if (c.scope_occasion === 'mentioned' && OCCASION_IDS.includes(c.occasion as never)) patch.occasion = c.occasion as CakeState['occasion'];
  if (c.theme !== 'keep') patch.theme = c.theme === 'remove' ? null : c.theme as CakeState['theme'];
  const incoming = [c.topperIncomingFirst, c.topperIncomingSecond, c.topperIncomingThird].filter(isTopper);
  const outgoing = [c.topperOutgoingFirst, c.topperOutgoingSecond].filter(isTopper);
  const generic = topperMentioned && ['topperOperation', 'topperIncomingFirst', 'topperIncomingSecond', 'topperIncomingThird'].some(id =>
    (answers[id] as Record<string, unknown>).choice === 'clarify');
  if (generic) notices.push('Which topper would you like? Try a castle, unicorn, or knight.');
  else if (topperMentioned && !ambiguous.has('topperOperation')) {
    if (c.topperOperation === 'add') patch.addToppers = [...new Set(incoming)];
    if (c.topperOperation === 'remove' || c.topperOperation === 'replace') {
      if (outgoing.length) patch.removeToppers = [...new Set(outgoing)];
      else if (c.topperOperation === 'replace' && incoming.length) notices.push('Which existing topper should I replace?');
      if (c.topperOperation === 'replace' && outgoing.length) patch.addToppers = [...new Set(incoming)];
    }
  }
  const customSpan = span('customTopper');
  const normalizedSpan = customSpan?.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const supportedNames: Partial<Record<NonNullable<CakeState['theme']> | 'princess', string[]>> = {
    mario: ['mario'], 'jensen-huang': ['jensen huang'], 'formula-one': ['formula one', 'formula 1', 'f1'],
    'spain-world-cup': ['spain world cup', 'world cup spain'], tennis: ['tennis'], princess: ['princess'],
  };
  const sameSupportedObject = [c.theme, ...incoming].some(value =>
    supportedNames[value as keyof typeof supportedNames]?.includes(normalizedSpan ?? '')
    || (isTopper(value) && [value.replace(/-/g, ' '), TOPPER_BY_ID[value].label.toLowerCase()].includes(normalizedSpan ?? '')));
  if (c.customTopperAction === 'remove') patch.customTopper = null;
  else if (c.customTopperAction === 'add' && customSpan && !generic) {
    const catalogTopper = catalogTopperForRequest(customSpan);
    if (catalogTopper) patch.addToppers = [...new Set([...(patch.addToppers ?? []), catalogTopper])];
    else if (!sameSupportedObject) {
      if (customSpan.length <= 120) patch.customTopper = { request: customSpan };
      else notices.push('Please describe the custom topper in 120 characters or fewer.');
    }
  }
  // Real requests use the complete phrase. Direct normalization callers can supply
  // the existing contiguous source candidates; never assemble unrelated spans.
  notices.push(...filterCustomTopperIntent(patch, phrase ?? candidates));
  const numberSpan = span('candleNumber');
  const number = numberSpan ? numberFromSpan(numberSpan) : null;
  if (c.candles === 'remove') patch.candles = { style: 'none', number: null, count: null };
  else if (ambiguous.has('candleNumericRole') && c.scope_candleNumericRole === 'mentioned') {
    notices.push('Do you mean ordinary candles or a numeral-shaped candle? I kept them unchanged.');
  } else if (ambiguous.has('candles') && !numericRole) { /* Preserve the whole candle field. */ }
  else if (numericRole === 'plain-count') {
    const count = number === null ? null : Number(number);
    if (count !== null && PLAIN_CANDLE_COUNTS.includes(count)) patch.candles = { style: 'plain', number: null, count };
    else notices.push(count === null ? 'How many plain candles would you like? I kept them unchanged.' : 'Use between 1 and 12 plain candles. I kept them unchanged.');
  } else if (numericRole !== 'numeral' && c.candles === 'plain') patch.candles = { style: 'plain', number: null };
  else if (numericRole === 'numeral' || c.candles === 'number' || number) {
    const value = number ?? (state.candles.style === 'number' ? state.candles.number : null);
    if (value) patch.candles = { style: 'number', number: value, count: null };
    else notices.push('Which number should go on the candles? I kept them unchanged.');
  }
  if (c.scope_inscription === 'mentioned' && c.inscription === 'remove') patch.inscription = '';
  else if (c.scope_inscription === 'mentioned' && span('inscription')) {
    if (span('inscription')!.length <= 60) patch.inscription = span('inscription')!;
    else notices.push('Please use an inscription of 60 characters or fewer.');
  }
  patch.addToppings = toppings.filter(t => c[`topping_${t}`] === 'add');
  patch.removeToppings = toppings.filter(t => c[`topping_${t}`] === 'remove');
  applyAppearance(c, ambiguous, state, patch, notices);
  // Composition of validated decisions: an accepted visible addition implies a cake,
  // even when the independent existence answer conservatively chose keep.
  if (!state.exists && (patch.addToppers?.length || patch.addToppings.length || patch.customTopper
    || patch.base || patch.flavor || patch.layers || patch.theme || patch.occasion || patch.inscription
    || (patch.candles && patch.candles.style !== 'none'))) patch.exists = true;
  const checked = applyCakePatch(state, patch);
  notices.push(...checked.notes);
  return { action, patch, notices: [...new Set(notices)], model: payload.model } as const;
}

export async function interpret(request: InterpretRequest): Promise<InterpretResponse> {
  const key = process.env.TYPESAFE_API_KEY;
  if (!key) throw new InterpretationError('TYPESAFE_API_KEY is missing on the server. Add it to .env.local and retry.', 503);
  const candidates = extractCandidates(request.phrase);
  const questions = buildQuestions(candidates);
  const started = performance.now();
  let response: Response;
  try {
    response = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.TYPESAFE_MODEL || 'jev-1.14.0', state: { latest_phrase: request.phrase, confirmed_cake: request.state }, questions }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    const timeout = error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name);
    throw new InterpretationError(timeout ? 'Jev request timed out. Please retry.' : 'Could not reach Jev. Check the connection and retry.', timeout ? 504 : 502, performance.now() - started);
  }
  const body = await response.text();
  const durationMs = performance.now() - started;
  if (!response.ok) {
    // Never echo provider bodies: they can contain submitted text or credential details.
    throw new InterpretationError(`Jev returned HTTP ${response.status} ${response.statusText}. Please retry${response.status === 401 ? ' after checking the server API key' : ' shortly'}.`, response.status, durationMs);
  }
  let payload: unknown;
  try { payload = JSON.parse(body); } catch { throw new InterpretationError('Jev returned non-JSON data. Please retry.', 502, durationMs); }
  const result = normalizeAnswers(payload, questions, candidates, request.state, request.phrase);
  const provider: InterpretResponse['provider'] = { model: result.model, durationMs, status: response.status, interpreter: 'jev' };
  const changed = JSON.stringify(applyCakePatch(request.state, result.patch).state) !== JSON.stringify(request.state);
  const meaningful: CakePatch = { ...result.patch };
  if (request.state.exists && meaningful.exists) delete meaningful.exists; // idempotent exists is not a real answer
  if (shouldUseFallback(result.action, meaningful, result.notices, changed)) {
    try {
      const fallback = await runFallback(request);
      if (fallback) {
        provider.interpreter = 'fallback';
        provider.fallback = { model: fallback.model, durationMs: fallback.durationMs, status: fallback.status,
          ...(fallback.costUsd !== undefined ? { costUsd: fallback.costUsd } : {}) };
        return { turnId: request.turnId, action: 'edit', patch: fallback.patch, notices: fallback.notices, provider };
      }
      // No OPENROUTER_API_KEY: fallback disabled, the Jev answer stands as before.
    } catch (error) {
      if (error instanceof FallbackError) {
        provider.fallback = { model: error.model, durationMs: error.durationMs, status: error.status };
        return { turnId: request.turnId, action: result.action, patch: result.patch,
          notices: [...result.notices, error.message], provider };
      }
      throw error;
    }
  }
  return { turnId: request.turnId, action: result.action, patch: result.patch, notices: [...result.notices], provider };
}
