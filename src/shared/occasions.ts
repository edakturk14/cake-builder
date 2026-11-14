/** An occasion is a free label, never an instruction to add decorations. */
export const OCCASIONS = [
  { id: 'birthday', label: 'Birthday', jevDescription: 'Birthday, birthday party, celebrating an age', suggestions: ['Add a number candle', 'Write Happy Birthday', 'Add balloons on top'] },
  { id: 'wedding', label: 'Wedding', jevDescription: 'Wedding, marriage ceremony, getting married', suggestions: ['Add a bride and groom topper', 'Write Mr & Mrs', 'Make the frosting ivory'] },
  { id: 'anniversary', label: 'Anniversary', jevDescription: 'Anniversary, wedding anniversary, years together', suggestions: ['Add a heart topper', 'Write Happy Anniversary', 'Make the accents gold'] },
  { id: 'engagement', label: 'Engagement', jevDescription: 'Engagement, proposal, newly engaged', suggestions: ['Add a heart topper', 'Write Congratulations', 'Make the frosting blush pink'] },
  { id: 'graduation', label: 'Graduation', jevDescription: 'Graduation, finishing school or university, graduate celebration', suggestions: ['Add a graduation cap', 'Write Congratulations', 'Add gold stars'] },
  { id: 'promotion', label: 'Promotion', jevDescription: 'Job promotion, career achievement, new role', suggestions: ['Write Congratulations', 'Add gold stars', 'Make the accents gold'] },
  { id: 'retirement', label: 'Retirement', jevDescription: 'Retirement, retiring from work, leaving a career', suggestions: ['Write Happy Retirement', 'Add a flower bouquet topper', 'Add gold stars'] },
  { id: 'baby-shower', label: 'Baby shower', jevDescription: 'Baby shower, welcoming a baby, baby on the way', suggestions: ['Add a baby bootie topper', 'Add a teddy bear topper', 'Write Welcome Baby'] },
  { id: 'christening', label: 'Christening', jevDescription: 'Christening, baptism, naming ceremony', suggestions: ['Add a baby bootie topper', 'Write Blessings', 'Make the frosting white'] },
  { id: 'housewarming', label: 'Housewarming', jevDescription: 'Housewarming, new house, moving into a new home', suggestions: ['Add a flower bouquet topper', 'Write Home Sweet Home', 'Make the frosting peach'] },
  { id: 'christmas', label: 'Christmas', jevDescription: 'Christmas, Christmas party, festive Christmas celebration', suggestions: ['Add a Christmas tree topper', 'Add a snowman topper', 'Write Merry Christmas'] },
  { id: 'new-year', label: 'New Year', jevDescription: "New Year, New Year's Eve, New Year's Day; a year is not a candle age", suggestions: ['Add gold stars', 'Write Happy New Year', 'Make the accents gold'] },
  { id: 'valentines-day', label: "Valentine's Day", jevDescription: "Valentine's Day, Valentine, romantic celebration", suggestions: ['Add a heart topper', 'Write With Love', 'Make the frosting red'] },
  { id: 'mothers-day', label: "Mother's Day", jevDescription: "Mother's Day, Mothers Day, celebrating mum or mom", suggestions: ['Add a flower bouquet topper', "Write Happy Mother's Day", 'Make the frosting blush pink'] },
  { id: 'fathers-day', label: "Father's Day", jevDescription: "Father's Day, Fathers Day, celebrating dad or father", suggestions: ["Write Happy Father's Day", 'Add a heart topper', 'Make the frosting navy'] },
  { id: 'thank-you', label: 'Thank you', jevDescription: 'Thank you, gratitude, appreciation gift', suggestions: ['Add a flower bouquet topper', 'Write Thank You', 'Add gold stars'] },
  { id: 'just-because', label: 'Just because', jevDescription: 'Just because, no special occasion, an everyday treat', suggestions: ['Add strawberries', 'Add a heart topper', 'Write Just Because'] },
] as const;
export type OccasionId = typeof OCCASIONS[number]['id'];
export const OCCASION_IDS: readonly OccasionId[] = OCCASIONS.map(occasion => occasion.id);
export const OCCASION_BY_ID = Object.fromEntries(OCCASIONS.map(occasion => [occasion.id, occasion])) as Record<OccasionId, typeof OCCASIONS[number]>;

function labelKey(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase().replace(/['’]/gu, '').replace(/[\s-]+/gu, '-');
}
/** Storage migration only: match a supported ID or label, otherwise drop the old free label. */
export function matchOccasion(value: unknown): OccasionId | null {
  if (typeof value !== 'string') return null;
  const key = labelKey(value);
  return OCCASIONS.find(occasion => labelKey(occasion.id) === key || labelKey(occasion.label) === key)?.id ?? null;
}
