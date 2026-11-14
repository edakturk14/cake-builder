import { COLOR_TARGETS, PALETTE, PALETTE_IDS, POSITION_OPTIONS, SIZE_OPTIONS, WRITING_CASE_OPTIONS, WRITING_FONT_OPTIONS, WRITING_PLACEMENT_OPTIONS, type TopperStyle } from '../src/shared/appearance';
import type { CakePatch, CakeState } from '../src/shared/cake';
import { TOPPER_CATALOG, TOPPER_IDS, type TopperId } from '../src/shared/toppers';

type Ask = (id: string, instructions: string, choices: Record<string, string>) => void;
const keep = { keep: 'Not explicitly requested; preserve.', clarify: 'This specific appearance change is requested but unclear or unsupported.' };
const palette = Object.fromEntries(PALETTE.map(color => [color.id, `${color.jevDescription}.${color.id === 'blush-pink' ? ' Also unqualified pink.' : ''}`]));
const colorSubjects = {
  frosting: 'the outer frosting/icing surface color, NOT writing/inscription color or cake flavor',
  filling: 'the visible filling/between-layer cream color, NOT flavor or outer icing',
  inscription: 'the icing writing/letter color; write it in gold means GOLD LETTERS, not new text or outer frosting',
  accents: 'the general decorative accent color, NOT named gold-star toppings, fruit, theme colors or a specific topper tint',
};
export function appearanceQuestions(ask: Ask) {
  const question = (id: string, subject: string, values: Record<string, string>) => {
    ask(id, `Choose the explicitly requested ${subject}. Keep if this exact property is not changed. Preserve other properties.`, { ...keep, ...values });
    ask(`scope_${id}`, `Does the LATEST phrase explicitly request changing ${subject}? Existing state does not count. Do not infer colors/style from cake flavor, occasion, theme or prepared objects.`, {
      mentioned: 'This specific appearance property is explicitly requested, including an unclear requested value.',
      unmentioned: 'Not requested now; ordinary add/remove operations and implicit/default object colors do not count.',
    });
  };
  for (const { id } of COLOR_TARGETS) question(`appearance_color_${id}`, colorSubjects[id], { ...palette, reset: 'Explicitly restore the automatic/original/default color.' });
  const options = (values: readonly { id: string; label: string }[]) => Object.fromEntries(values.map(value => [value.id, `Explicitly ${value.label}.`]));
  question('appearance_writing_font', 'writing font (script/cursive versus plain print/block lettering)', options(WRITING_FONT_OPTIONS));
  question('appearance_writing_case', 'writing letter case, including write Eda in capitals = upper, WITHOUT making the literal inscription Eda in capitals', options(WRITING_CASE_OPTIONS));
  question('appearance_writing_size', 'writing/letter size (larger/bigger = large; smaller = small)', options(SIZE_OPTIONS));
  question('appearance_writing_placement', 'writing placement on the top surface (front versus center)', options(WRITING_PLACEMENT_OPTIONS));
  const identities = Object.fromEntries(TOPPER_CATALOG.map(item => [item.id, `${item.label}: ${item.jevDescription}`]));
  for (const slot of [1, 2]) {
    const ordinal = slot === 1 ? 'FIRST' : 'SECOND';
    const object = `${ordinal} explicitly restyled prepared topper in textual mention order. If only one is restyled, SECOND is keep. Restyling means size/position/tint, NOT adding/removing/replacing an object.`;
    question(`appearance_topper_${slot}_target`, `identity of the ${object}`, identities);
    ask(`scope_appearance_topper_${slot}_target`, `Is there a ${ordinal} prepared topper explicitly receiving a size/position/tint edit in latest_phrase? This asks WHETHER it is restyled, not whether its identity changes. "Make the castle bigger" or "put the princess on the left" restyles ONE object: FIRST mentioned, SECOND unmentioned. Add/remove/replace alone does not count.`, {
      mentioned: `There is a ${ordinal} explicitly restyled prepared topper.`,
      unmentioned: `No ${ordinal} restyled object; includes non-topper edits or only adding/removing objects.`,
    });
    question(`appearance_topper_${slot}_size`, `size of the ${object} Bigger/larger means large; smaller means small`, options(SIZE_OPTIONS));
    question(`appearance_topper_${slot}_position`, `position of the ${object} Left/center/right are positions; next to the princess when ADDING a knight is not a position edit`, options(POSITION_OPTIONS));
    question(`appearance_topper_${slot}_tint`, `tint/color of the ${object} Do not recolor a whole cake or writing`, { ...palette, reset: 'Restore original topper colors.' });
  }
}

export function applyAppearance(c: Record<string, string>, ambiguous: Set<string>, state: CakeState, patch: CakePatch, notices: string[]) {
  const mentioned = (id: string) => c[`scope_${id}`] === 'mentioned';
  const selected = (id: string, label: string) => {
    if (!mentioned(id)) return false;
    if (ambiguous.has(id)) { notices.push(`Please clarify ${label}; I kept it unchanged.`); return false; }
    return c[id] !== 'keep';
  };
  for (const { id, label } of COLOR_TARGETS) {
    const key = `appearance_color_${id}`;
    if (selected(key, `${label.toLowerCase()} color`) && (c[key] === 'reset' || PALETTE_IDS.includes(c[key] as never))) {
      patch.colors = { ...patch.colors, [id]: c[key] === 'reset' ? null : c[key] };
    }
  }
  const writing = [
    ['font', 'font'], ['case', 'letterCase'], ['size', 'size'], ['placement', 'placement'],
  ] as const;
  for (const [suffix, field] of writing) {
    const id = `appearance_writing_${suffix}`;
    if (selected(id, `writing ${suffix}`)) patch.inscriptionStyle = { ...patch.inscriptionStyle, [field]: c[id] };
  }
  const present = new Set<TopperId>([...state.toppers, ...(patch.addToppers ?? []), ...(patch.toppers ?? [])]);
  (patch.removeToppers ?? []).forEach(id => present.delete(id));
  for (const slot of [1, 2]) {
    const prefix = `appearance_topper_${slot}`;
    const targetId = `${prefix}_target`;
    const target = c[targetId] as TopperId;
    if (!TOPPER_IDS.includes(target)) {
      if (ambiguous.has(targetId) && mentioned(targetId)) notices.push('Which topper should I restyle?');
      continue;
    }
    const style: Partial<TopperStyle> = {};
    for (const field of ['size', 'position', 'tint'] as const) {
      const id = `${prefix}_${field}`;
      if (selected(id, `${target.replace(/-/g, ' ')} ${field}`)) Object.assign(style, { [field]: c[id] === 'reset' ? null : c[id] });
    }
    if (!Object.keys(style).length) continue;
    // A confident identity plus an explicitly scoped property is sufficient.
    // Do not require a redundant identity-scope question to be confident too.
    if (!present.has(target)) { notices.push(`Add the ${target.replace(/-/g, ' ')} before changing its appearance.`); continue; }
    patch.topperStyles = { ...patch.topperStyles, [target]: { ...patch.topperStyles?.[target], ...style } };
  }
}
