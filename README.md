# Cake Gallery

A small, template-first cake customizer for boutique bakeries. Customers start with a prepared cake design, personalize its toppings, topper, layers, candles and inscription, and save the illustrated design to a browser basket.

The default experience **needs no AI API key**, no image-generation provider and no account.

## Run locally

Use Node.js 22+:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. The Vite web app works without configuring `.env.local`.

## What customers can do

1. Choose **Classic Birthday**, **Chocolate Party**, **Red Velvet**, or **Birthday with Sprinkles**. Red Velvet and Chocolate Party start at two layers; Birthday with Sprinkles starts at one and includes a prepared confetti sprinkle decoration.
2. Choose **1, 2, or 3 sponge layers**, change the sponge flavor, add/remove available prepared toppings, choose one topper, set a short inscription and choose candles. Frosting colors are intentionally **not customizable** in this prototype.
3. Optionally type or speak simple edits such as "Add strawberries and write Eda." The deterministic interpreter lives in `src/shared/localCommands.ts`. Browser speech recognition may use a browser-provided online service and isn't available in every browser; controls and typing always remain available.
4. Review sample pricing and save a snapshot to a browser-local basket. Quantities/removal/reload are supported.
5. For sculpted cakes, castle-shaped cakes or unsupported designs, open the custom request **draft**. It can be copied, but is not sent to any bakery.

All starter products and visible edit options are defined in `src/shared/bakery.ts`, which is the place for a bakery to supply its actual menu. **NYC showcase pricing starts at $58 per cake**, plus prepared toppings, toppers, candles and extra sponge layers. `estimateBakeryCake` and `priceBakeryBasketItem` in that file apply this starting price to the preview, template cards and saved/reloaded baskets, while leaving historical demo price fixtures in `src/shared/cake.ts` unchanged. These prices remain **sample pricing, not a bakery quote**.

### Layers and frosting rendering

The four starter templates have starting layer counts, but customers can change any sponge cake to **1, 2 or 3 sponge layers**, by clicking or saying e.g. "Make it three layers" or "Add a layer." An extra sponge layer updates sample pricing. **Stacked tiers** and sculpted shapes are custom quotes, not layer-count edits.

Each layer count uses existing prepared cake images. The frosting is the original artwork with **no additional colored or white frosting overlay**. The frosting color picker and voice recoloring commands were removed because those effects did not look believable. Chocolate Party uses **ivory/vanilla-colored filling**, not pink.

The compact desktop page places starter designs on the left, live cake and speech/typing in the center, and personalization controls on the right. On narrow screens these become a vertical flow.

## Cake art guardrails

- **Ganache and caramel drizzle are no longer selectable as free-form toppings.** The previous drawn syrup paths looked like gold sticks and dark paint when stacked with fruit. Real chocolate-drip or caramel finishes should become prepared bakery templates with their own approved artwork.
- The menu offers **strawberries, raspberries and gold stars**. Customers can select up to **two**, and mixed berries are rendered in smaller, separate clusters on the left and right edges, leaving the center for figurines, writing and candles.
- **Birthday with Sprinkles** uses the prepared vanilla birthday cake with a small, fixed colorful sugar-sprinkle arrangement on top. It is priced at $62 ($58 base + $4 sprinkles). Sprinkles are included by default with this cake; the ordinary topping picker still offers strawberries, raspberries and gold stars.
- Prepared toppers include **balloons, Christmas tree, snowman, castle, unicorn, princess, flowers, rainbow and generic racing kart**, all using the existing artwork library. They render smaller when berries are present. A Santa figurine would require new approved fondant artwork rather than silently drawing an inaccurate substitute.
- The underlying cake images are still prepared illustration/raster artwork, not photographs supplied by a bakery. Rendering improvements do not turn them into actual product photos.

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

The new `tests/bakery-customizer.test.ts` covers templates, 1–3-layer text/voice edits, one-topper rules, shape-to-quote routing and sample pricing. `tests/topper-renderer.test.ts` verifies cake messages, original unmodified frosting across flavors/layer counts, and the birthday sprinkle decorations. The GitHub workflow also runs `tests/browser-smoke.mjs` in headless Chromium, exercising **Apply** on the actual inscription input, layer buttons, typed commands, mobile overflow and avoidance of paid endpoints.

For historical context on the earlier unrestricted voice-first experiment, see `docs/build-brief.md`, `docs/validation.md` and `docs/retest-interpretation.md`.
