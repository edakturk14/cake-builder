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
2. Change the flavor, choose from six icing colors, add/remove prepared toppings, choose up to one prepared topper, set a short inscription and choose candles.
3. Optionally type or speak simple edits such as "Make it pink, add strawberries and write Eda." The deterministic interpreter lives in `src/shared/localCommands.ts`. Browser speech recognition may use a browser-provided online service and isn't available in every browser; controls and typing always remain available.
4. Review sample pricing and save a snapshot to a browser-local basket. Quantities/removal/reload are supported.
5. For sculpted cakes, castle-shaped cakes or unsupported designs, open the custom request **draft**. It can be copied, but is not sent to any bakery.

All starter products and visible edit options are defined in `src/shared/bakery.ts`, which is the place for a bakery to supply its actual menu. Existing pricing comes from `src/shared/cake.ts` and remains **sample pricing, not a bakery quote**.

### Why heights are fixed

The original prototype swapped entire raster assets for one-, two- and three-layer cakes, with separate masks and offsets for decorations. This could cause visual inconsistencies when layer counts changed. The new flow offers **fixed-height designs only**, with one- and two-layer artwork already prepared. "Add layers" and "tiers" don't silently change geometry or price. Complex shapes go to the custom request draft.

The underlying older scene renderer and state support for three layers remain available for legacy saved designs and fixture tests. This is a product-scope change, **not** proof that every old raster alignment defect has been fixed.

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

The new `tests/bakery-customizer.test.ts` covers the fixed templates, voice/text edits, one-topper rule, fixed-height restrictions, shape-to-quote routing and unchanged price calculation. Older tests remain for the original cake state, renderer and provider adapters.

For historical context on the earlier unrestricted voice-first experiment, see `docs/build-brief.md`, `docs/validation.md` and `docs/retest-interpretation.md`.
