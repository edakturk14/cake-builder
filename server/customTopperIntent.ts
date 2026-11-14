import type { CakePatch } from '../src/shared/cake';
import { PALETTE } from '../src/shared/appearance';
import { TOPPER_CATALOG } from '../src/shared/toppers';

export const CUSTOM_TOPPER_OBJECT_NOTICE =
  'I left the custom topper unchanged. Please name a physical object or figure, not a style or mood.';

const normalize = (value: string) => value.normalize('NFKC').toLowerCase()
  .replace(/['’]/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const determiner = /^(?:a|an|the|my|our|your|his|her|their|its)\b/u;
const modifiers = '(?:a|an|the|my|our|your|his|her|their|its|little|small|tiny|edible|fondant|sugar|paste|3d)';
const bridge = `(?:${modifiers}\\s+)*`;
const additionVerbs = '(?:add|put|place|include|want|like|have|use|make|sculpt|do|create|craft|shape|carve|mold|mould)';
const objectConstruction = new RegExp(
  `\\b(?:topper|figurine|figure|model|sculpture|portrait)\\s+(?:(?:shaped|made)\\s+)?(?:of|like)\\s+${bridge}$`
    + `|\\bshaped\\s+like\\s+${bridge}$`, 'u');
const additionConstruction = new RegExp(`\\b${additionVerbs}\\s+${bridge}$`, 'u');
const afterAdditionVerb = new RegExp(`\\b${additionVerbs}\\s+`, 'u');
const topperPurpose = /^(?:as\s+(?:(?:a|an|the|my|our)\s+)?(?:(?:cake\s+)?topper|figure|figurine)|(?:cake\s+)?topper|for\s+(?:(?:the|a)\s+)?top|on\s+(?:top|it|the\s+cake)|onto\s+(?:it|the\s+cake)|atop)\b/u;
const omittedModifiers = new RegExp(`^(?:${modifiers}\\s+)+`, 'u');
const paletteWords = new Set(PALETTE.flatMap(color => normalize(color.jevDescription).split(' ')));
const negativeConstruction = new RegExp(`\\b(?:no|not|never|dont|doesnt|didnt|cant|cannot|wont|wouldnt|shouldnt|without|avoid|skip|remove|delete|clear)(?:\\s+(?:even|ever|${additionVerbs}|a|an|the|any))*\\s*$`, 'u');

/**
 * Quality filter for source-grounded object descriptions, not a physical-noun classifier.
 * Some abstract descriptions can pass. Explicit user action in the client controls
 * preview generation and cost; this heuristic must not be used as that boundary.
 */
export function hasPhysicalCustomTopperIntent(phrase: string, request: string): boolean {
  const source = normalize(phrase), description = normalize(request);
  if (!description) return false;
  const head = description.replace(omittedModifiers, '');
  const headWord = head.split(' ').at(-1) ?? '';
  // Vague pronouns, degree/comparison phrases and appearance attributes are not object identities.
  if (!head || paletteWords.has(headWord) || /^(?:more|less|very|really|quite|rather|extra|kinda|sort|kind|bit|touch|dash|sense|something|anything|whatever|it|that|this)\b/u.test(head)
    || /^(?:style|mood|vibe|look|color|colour|quality|elegance|sophistication|decoration|topper|figure|figurine|object|thing)s?$/u.test(headWord)) return false;
  const needle = ` ${description} `, padded = ` ${source} `;
  for (let offset = padded.indexOf(needle); offset >= 0; offset = padded.indexOf(needle, offset + 1)) {
    const prefix = `${padded.slice(0, offset).trim()} `;
    const suffix = padded.slice(offset + needle.length).trim();
    // Do not accept an adjective-only slice that omits the following object noun.
    const purpose = topperPurpose.test(suffix);
    if (suffix && !purpose && !/^(?:on|onto|atop|please|and|but|then|with|without|instead|too|thanks)\b/u.test(suffix)) continue;
    const construction = objectConstruction.exec(prefix) ?? additionConstruction.exec(prefix);
    if (!construction || negativeConstruction.test(prefix.slice(0, construction.index))) continue;
    const nominal = purpose || objectConstruction.test(prefix) || determiner.test(description)
      || determiner.test(prefix.split(afterAdditionVerb).at(-1)?.trim() ?? '');
    if (nominal) return true;
  }
  return false;
}

/** Exact prepared names stay on the catalog path, even if a provider chose its custom field. */
export function catalogTopperForRequest(request: string) {
  const name = normalize(request).replace(/^(?:a|an|the)\s+/u, '');
  return TOPPER_CATALOG.find(topper => normalize(topper.id) === name || normalize(topper.label) === name)?.id;
}

/** Only omit a rejected addition: never clear the current custom topper or discard other edits. */
export function filterCustomTopperIntent(patch: CakePatch, phrase: string | readonly string[]): string[] {
  const sources = typeof phrase === 'string' ? [phrase] : phrase;
  const request = patch.customTopper?.request;
  if (request && !sources.some(source => hasPhysicalCustomTopperIntent(source, request))) {
    delete patch.customTopper;
    return [CUSTOM_TOPPER_OBJECT_NOTICE];
  }
  return [];
}
