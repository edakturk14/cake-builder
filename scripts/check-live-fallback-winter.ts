import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', quiet: true });
import { applyCakePatch, createCake, estimateCake } from '../src/shared/cake';

const state = createCake({ toppers: ['princess'], occasion: 'birthday', candles: { style: 'none' } });
const response = await fetch('http://127.0.0.1:3001/api/interpret', { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ turnId: `winter-${Date.now()}`, phrase: 'make it a winter wonderland cake', state }) });
const body = await response.json();
const next = applyCakePatch(state, body.patch).state;
console.log(JSON.stringify({ status: response.status, interpreter: body.provider?.interpreter, fallback: body.provider?.fallback,
  patch: body.patch, notices: body.notices, toppers: next.toppers, colors: next.colors, price: estimateCake(next).totalCents }, null, 2));
