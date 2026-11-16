import type { CakePatch, CakeState, Topping } from './cake';
import type { PaletteId } from './appearance';
import type { TopperId } from './toppers';

export type LocalCommand =
  | { kind: 'edit'; patch: CakePatch; message: string }
  | { kind: 'undo' | 'reset' | 'help' | 'custom'; message: string };

const colors: readonly { id: PaletteId; pattern: RegExp }[] = [
  { id: 'chocolate-brown', pattern: /\b(?:chocolate brown|brown frosting|brown icing|brown buttercream)\b/i },
  { id: 'blush-pink', pattern: /\b(?:pink|blush|rose)\b/i },
  { id: 'lavender', pattern: /\b(?:lavender|lilac|purple)\b/i },
  { id: 'sky-blue', pattern: /\b(?:sky blue|baby blue|blue)\b/i },
  { id: 'mint', pattern: /\b(?:mint|mint green|light green)\b/i },
  { id: 'white', pattern: /\b(?:white|ivory|cream colored)\b/i },
];

const toppings: readonly { id: Topping; pattern: RegExp }[] = [
  { id: 'strawberries', pattern: /\bstrawberr(?:y|ies)\b/i },
  { id: 'raspberries', pattern: /\braspberr(?:y|ies)\b/i },
  { id: 'gold-stars', pattern: /\b(?:gold|golden)\s+stars?\b/i },
];

const toppers: readonly { id: TopperId; pattern: RegExp }[] = [
  { id: 'princess', pattern: /\bprincess\b/i },
  { id: 'castle', pattern: /\bcastle\b/i },
  { id: 'unicorn', pattern: /\bunicorn\b/i },
  { id: 'dinosaur', pattern: /\b(?:dinosaur|dino)\b/i },
  { id: 'flower-bouquet', pattern: /\b(?:flowers|flower bouquet)\b/i },
  { id: 'rainbow', pattern: /\brainbow\b/i },
  { id: 'balloons', pattern: /\bballoons?\b/i },
  { id: 'christmas-tree', pattern: /\b(?:christmas tree|xmas tree)\b/i },
  { id: 'snowman', pattern: /\bsnowman\b/i },
  { id: 'race-car', pattern: /\b(?:racing kart|race car|go[- ]kart|mario kart)\b/i },
];

const numberWords: Readonly<Record<string, number>> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};

function requestedNumber(raw: string): number | null {
  if (/^\d{1,2}$/.test(raw)) return Number(raw);
  return numberWords[raw.toLowerCase()] ?? null;
}

function removeRequested(text: string, item: RegExp): boolean {
  // Only a nearby removal word counts, so "remove berries and add caramel"
  // does not accidentally remove both decorations.
  const source = item.source.replace(/^\^|\$$/g, '');
  return new RegExp('(?:remove|take off|take away|without|no)\\s+(?:(?:the|some|a|any)\\s+)?' + source, 'i').test(text);
}

/**
 * Deterministic and zero-LLM-cost interpreter for a deliberately small menu.
 * Unrecognized prompts must never be converted into made-up objects or prices.
 */
export function interpretLocalCommand(text: string, cake: CakeState): LocalCommand {
  const phrase = text.trim();
  const lower = phrase.toLowerCase();
  if (!lower) return { kind: 'help', message: 'Choose an option or tell me what you want to change.' };

  if (/^(?:undo|go back)(?:\s+(?:last edit|that))?[.!]?$/i.test(phrase)) {
    return { kind: 'undo', message: 'Undid the last change.' };
  }
  if (/^(?:start over|start afresh|reset)(?:\s+(?:the cake|everything))?[.!]?$/i.test(phrase)) {
    return { kind: 'reset', message: 'Started with the classic cake.' };
  }

  // A sculpture is not a small decoration sitting on a normal round cake.
  if (/(?:whole|entire)\s+cake.*\b(?:castle|shape|shaped|sculpt)/i.test(lower)
    || /\b(?:cake\s+(?:shaped like|in the shape of)|sculpt(?:ed)?\s+cake|turn\s+(?:the|my|this)\s+cake\s+into|make\s+(?:the|my|this)\s+cake\s+(?:into|look like))\b/i.test(lower)
    || /\b(?:three|four|five|\d+)\s+tiers?\b/i.test(lower)
    || /\b(?:[\w-]+-shaped\s+cake|make\s+a\s+\w+\s+shaped\s+cake)\b/i.test(lower)) {
    return { kind: 'custom', message: 'A shaped or tiered cake needs a bakery quote. Your description is saved in the request form.' };
  }
  // A tier is a separate cake, not another sponge layer.
  if (/\btiers?\b/i.test(lower)) {
    return { kind: 'custom', message: 'Stacked tiers need a custom bakery quote.' };
  }

  // Drips and chocolate ganache need pre-designed finishes, not the old SVG drizzles.
  if (/\b(?:ganache|caramel drizzle|chocolate drip)\b/i.test(lower)) {
    const removal = /\b(?:remove|take off|without|no)\b/i.test(lower);
    if (removal) return { kind: 'edit', patch: {
      removeToppings: [/ganache/i.test(lower) ? 'ganache' : 'caramel'],
    }, message: 'Removed the older drip decoration.' };
    return { kind: 'help', message: 'Chocolate drips and caramel finishes are only available as prepared bakery designs. Choose berries or gold stars for now.' };
  }
    const patch: CakePatch = {};
  const requestedLayers = lower.match(/\b(?:make\s+(?:it\s+)?|change\s+(?:it\s+)?to\s+|with\s+|give\s+(?:me\s+)?|a\s+)?(one|two|three|[123])[-\s]layers?\b|\b(?:layers?\s+(?:to|of)\s+)(one|two|three|[123])\b/);
  const layerNumber = requestedLayers ? requestedNumber(requestedLayers[1] ?? requestedLayers[2]) : null;
  const addLayer = /\b(?:add|give\s+(?:it|me)|another)\s+(?:one\s+|an?\s+)?(?:extra\s+)?layer\b/i.test(lower);
  const removeLayer = /\b(?:remove|lose|take\s+off)\s+(?:one\s+|an?\s+)?layer\b/i.test(lower);
  if (layerNumber !== null) patch.layers = layerNumber as CakeState['layers'];
  else if (addLayer || removeLayer) {
    const next = cake.layers + (addLayer ? 1 : -1);
    if (next < 1 || next > 3) {
      return { kind: 'help', message: 'Choose 1, 2 or 3 sponge layers for this cake.' };
    }
    patch.layers = next as CakeState['layers'];
  } else if (/\b(?:layers?|stack(?:ed|ing)?)\b/i.test(lower)) {
    return { kind: 'help', message: 'Choose 1, 2 or 3 sponge layers, or request a custom shape.' };
  }

  const flavor = lower.match(/\b(red velvet|vanilla|chocolate|lemon)\b/);
  if (flavor && !/\b(?:chocolate brown|chocolate icing|chocolate frosting)\b/.test(lower)) {
    const value = flavor[1] === 'red velvet' ? 'red-velvet' : flavor[1];
    patch.flavor = value as CakeState['flavor'];
  }

  if (/\b(?:make|turn|change|frosting|icing|buttercream|colour|color)\b/i.test(lower)) {
    const color = colors.find(item => item.pattern.test(lower));
    if (color) patch.colors = { frosting: color.id };
  }

  for (const topping of toppings) {
    if (!topping.pattern.test(lower)) continue;
    if (removeRequested(lower, topping.pattern)) {
      patch.removeToppings = [...(patch.removeToppings ?? []), topping.id];
    } else {
      patch.addToppings = [...(patch.addToppings ?? []), topping.id];
    }
  }

  const topper = toppers.find(item => item.pattern.test(lower));
  if (topper) {
    if (removeRequested(lower, topper.pattern) || /\b(?:no|remove)\s+(?:the\s+)?topper\b/i.test(lower)) {
      patch.toppers = [];
    } else if (/\b(?:topper|on top|add|put|place|with)\b/i.test(lower)) {
      // One prepared topper at a time, rather than overlapping image cutouts.
      patch.toppers = [topper.id];
    }
  } else if (/\b(?:remove|no)\s+(?:the\s+)?(?:topper|figurine)\b/i.test(lower)) {
    patch.toppers = [];
  }

  if (/\b(?:no|remove|without)\s+(?:the\s+)?candles?\b/i.test(lower)) {
    patch.candles = { style: 'none' };
  } else if (/\bcandles?\b/i.test(lower)) {
    const numberMatch = lower.match(/\b(?:number|numeral)\s+(\d{1,2})\s+candle\b|\b(\d{1,2})\s+candle\b/);
    const plainMatch = lower.match(/\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(?:plain\s+)?candles\b/);
    if (numberMatch) patch.candles = { style: 'number', number: String(Number(numberMatch[1] ?? numberMatch[2])) };
    else if (plainMatch) patch.candles = { style: 'plain', count: requestedNumber(plainMatch[1]) ?? 5 };
    else patch.candles = { style: 'plain', count: 5 };
  }

  const writing = phrase.match(/\b(?:write|(?:change|set)\s+(?:the\s+)?(?:name|message)\s+to)\s+(.+)$/i);
  if (writing) {
    const message = writing[1].replace(/^(?:["“']+)/, '').replace(/(?:["”']+)$/, '')
      .replace(/\s+(?:on\s+(?:top|the cake)|please)\s*$/i, '')
      .replace(/\s+(?:and|then)\s+(?:make|add|remove|change|put)\b.*$/i, '').trim();
    if (message.length > 30) return { kind: 'help', message: 'Please keep your cake message to 30 characters.' };
    if (message) patch.inscription = message;
  }
  if (/\b(?:remove|clear)\s+(?:the\s+)?(?:writing|message|name)\b/i.test(lower)) patch.inscription = '';

  if (Object.keys(patch).length === 0) {
    return { kind: 'help', message: 'I can change flavors, frosting colors, toppings, toppers, candles and writing. For other ideas, use the custom request form.' };
  }
  return { kind: 'edit', patch, message: 'Updated your cake.' };
}
