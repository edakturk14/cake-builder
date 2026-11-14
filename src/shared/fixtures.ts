import type { CakePatch } from './cake';

/** Local fixture patches, never a replacement for the live Jev command path. */
export interface FixtureTurn { text: string; patch: CakePatch; expectedCents: number }
export interface CakeFixture { id: string; title: string; turns: FixtureTurn[] }
const turn = (text: string, patch: CakePatch, expectedCents: number): FixtureTurn => ({ text, patch, expectedCents });
export const DEMO_TURNS: FixtureTurn[] = [
  turn('I want a cake.', { exists: true }, 4200),
  turn('Make it two layers.', { layers: 2 }, 4800),
  turn('Add a princess on top.', { addToppers: ['princess'] }, 5800),
  turn('Make it a birthday cake and write Eda on top.', { occasion: 'birthday', inscription: 'Eda' }, 5800),
  turn('Change the name to Ada.', { inscription: 'Ada' }, 5800),
  turn('Remove the princess.', { removeToppers: ['princess'] }, 4800),
];
export const CAKE_FIXTURES: CakeFixture[] = [
  { id: '01', title: 'Classic cheesecake', turns: [
    turn('I want a classic cheesecake.', { exists: true, base: 'cheesecake' }, 4400),
    turn('Add strawberries and write Eda on top.', { addToppings: ['strawberries'], inscription: 'Eda' }, 5100),
  ] },
  { id: '02', title: 'Eda birthday princess', turns: [
    turn('Make me a two-layer chocolate birthday cake with a princess on top. Write Eda on it.', { exists: true, flavor: 'chocolate', layers: 2, occasion: 'birthday', addToppers: ['princess'], inscription: 'Eda' }, 5800),
  ] },
  { id: '03', title: '40th birthday', turns: [
    turn('It’s my 40th birthday. Make it a two-layer vanilla cake with a 40 candle and strawberries.', { exists: true, flavor: 'vanilla', layers: 2, occasion: 'birthday', candles: { style: 'number', number: '40' }, addToppings: ['strawberries'] }, 5600),
    turn('Actually, make it 41.', { candles: { style: 'number', number: '41' } }, 5600),
  ] },
  { id: '04', title: 'New Year birthday', turns: [
    turn('I have a New Year’s birthday. Give me a two-layer chocolate cake with gold stars and candles. Write Happy New Year, Eda.', { exists: true, flavor: 'chocolate', layers: 2, occasion: 'birthday', addToppings: ['gold-stars'], candles: { style: 'plain', number: null }, inscription: 'Happy New Year, Eda' }, 5500),
  ] },
  { id: '05', title: 'Mario', turns: [
    turn('Give me a two-layer vanilla Mario cake.', { exists: true, flavor: 'vanilla', layers: 2, theme: 'mario' }, 5600),
    turn('Add a 7 candle.', { candles: { style: 'number', number: '7' } }, 6100),
  ] },
  { id: '06', title: 'Formula One', turns: [
    turn('I want a two-layer chocolate Formula One cake.', { exists: true, flavor: 'chocolate', layers: 2, theme: 'formula-one' }, 6000),
    turn('Write Eda on it.', { inscription: 'Eda' }, 6000),
  ] },
  { id: '07', title: 'Spain World Cup', turns: [
    turn('Make a two-layer vanilla World Cup cake for Spain.', { exists: true, flavor: 'vanilla', layers: 2, theme: 'spain-world-cup' }, 5600),
  ] },
  { id: '08', title: 'Tennis', turns: [
    turn('Make a two-layer lemon tennis cake and write Game, Set, Match.', { exists: true, flavor: 'lemon', layers: 2, theme: 'tennis', inscription: 'Game, Set, Match' }, 5600),
  ] },
  { id: '09', title: 'Jensen Huang', turns: [
    turn('I want a two-layer chocolate Jensen Huang cake.', { exists: true, flavor: 'chocolate', layers: 2, theme: 'jensen-huang' }, 6300),
  ] },
  { id: '10', title: 'Red velvet', turns: [
    turn('Give me a three-layer red velvet cake with raspberries and birthday candles. Write Happy Birthday, Mira.', { exists: true, flavor: 'red-velvet', layers: 3, addToppings: ['raspberries'], candles: { style: 'plain', number: null }, inscription: 'Happy Birthday, Mira', occasion: 'birthday' }, 6600),
  ] },
  { id: '11', title: 'Caramel and strawberries', turns: [
    turn('I want a two-layer chocolate cake with caramel drizzle and strawberries.', { exists: true, layers: 2, addToppings: ['caramel', 'strawberries'] }, 5900),
    turn('Take the strawberries off and add ganache.', { removeToppings: ['strawberries'], addToppings: ['ganache'] }, 5700),
  ] },
  { id: '12', title: 'Miso custom topper', turns: [
    turn('Make a two-layer vanilla birthday cake with a topper shaped like my cat Miso.', { exists: true, flavor: 'vanilla', layers: 2, occasion: 'birthday', customTopper: { request: 'My cat Miso', assetId: null } }, 4400),
    turn('Actually remove the cat and put a 30 candle there.', { customTopper: null, candles: { style: 'number', number: '30' } }, 4900),
  ] },
  { id: '13', title: 'Princess to Mario', turns: [
    turn('Make a two-layer chocolate cake with a princess topper and a 6 candle.', { exists: true, layers: 2, addToppers: ['princess'], candles: { style: 'number', number: '6' } }, 6300),
    turn('Swap the princess for Mario and write Luca.', { removeToppers: ['princess'], theme: 'mario', inscription: 'Luca' }, 6500),
  ] },
  { id: '14', title: 'Lemon to cheesecake', turns: [
    turn('Make me a lemon cake with strawberries and a number 21 candle. Write Happy birthday, Selin.', { exists: true, flavor: 'lemon', occasion: 'birthday', addToppings: ['strawberries'], candles: { style: 'number', number: '21' }, inscription: 'Happy birthday, Selin' }, 5200),
    turn('Actually, make it a cheesecake, keep everything else.', { base: 'cheesecake' }, 5600),
  ] },
];
