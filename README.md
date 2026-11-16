# Cake Gallery

A small, template-first cake customizer for boutique bakeries. Customers start with a cake the bakery can actually make, personalize the frosting, toppings, topper, candles and inscription, and save the illustrated design to a browser basket.

The default experience **needs no AI API key**, no image-generation provider and no account.

## Run locally

Use Node.js 22+:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. The Vite web app works without configuring `.env.local`.

## What customers can do

1. Choose **Classic Birthday**, **Chocolate Party**, or **Pastel Celebration**.
2. Choose **1, 2, or 3 sponge layers**, change the flavor, select from six frosting colors, add/remove prepared toppings, choose one topper, set a short inscription and choose candles.
3. Optionally type or speak simple edits such as "Make it pink, add strawberries and write Eda." The deterministic interpreter lives in `src/shared/localCommands.ts`. Browser speech recognition may use a browser-provided online service and isn't available in every browser; controls and typing always remain available.
4. Review sample pricing and save a snapshot to a browser-local basket. Quantities/removal/reload are supported.
5. For sculpted cakes, castle-shaped cakes or unsupported designs, open the custom request **draft**. It can be copied, but is not sent to any bakery.

All starter products and visible edit options are defined in `src/shared/bakery.ts`, which is the place for a bakery to supply its actual menu. Existing pricing comes from `src/shared/cake.ts` and remains **sample pricing, not a bakery quote**.

### Layers and frosting rendering

The three starter templates have starting layer counts, but customers can change any sponge cake to **1, 2 or 3 sponge layers**, by clicking or saying e.g. "Make it three layers" or "Add a layer." An extra sponge layer updates sample pricing. **Stacked tiers** and sculpted shapes are custom quotes, not layer-count edits.

Each layer count uses existing prepared cake images. This does not mean the system generates a new cake image or fixes all artistic inconsistencies in the original assets. The frosting now uses a texture-preserving buttercream tint that keeps more of the original shading, rather than painting a harsh flat color over it.

The compact desktop page places starter designs on the left, live cake and speech/typing in the center, and personalization controls on the right. On narrow screens these become a vertical flow.

## Cost controls and safety

- Ordinary customization buttons and text commands use local React state. No Jev, OpenRouter or other LLM provider is called by the new page.
- The server's legacy `POST /api/interpret` and `POST /api/topper-image` endpoints are **disabled by default**, even if environment API keys happen to exist. They require `ENABLE_PAID_PROVIDERS=true` to allow calls.
- **Do not enable these paid endpoints on a public demo without authentication, user-level throttling and spend limits.**
- Prepared cake and topper artwork is included in the repo and does not trigger image generation.

## Not yet a live bakery storefront

- The basket lives in the customer's browser, not a shared database.
- There is no checkout, payment, real order submission, confirmed delivery/pickup slot or bakery inventory.
- Custom request form details are not sent, saved remotely or reviewed by a baker.
- Bakery owners must approve the menu, prices, lead times, serving sizes, allergen information and feasibility before accepting real orders.

## Development checks

```sh
npm run typecheck
npm test
npm run build
```

The new `tests/bakery-customizer.test.ts` covers templates, 1–3-layer text/voice edits, one-topper rules, shape-to-quote routing and sample pricing. `tests/topper-renderer.test.ts` checks that inscriptions are drawn over each chocolate layer variant and keep their natural color tint. The GitHub workflow also runs `tests/browser-smoke.mjs` in headless Chromium, exercising **Apply** on the actual inscription input, layer buttons, typed commands, mobile overflow and avoidance of paid endpoints.

For historical context on the earlier unrestricted voice-first experiment, see `docs/build-brief.md`, `docs/validation.md` and `docs/retest-interpretation.md`.
