# Cake Gallery

A local, voice-driven cake designer with confirmed estimates and a browser-saved basket. React + TypeScript + Vite, with a small Express server. No accounts, checkout, or database.

## Run locally

Use Node.js 22 or later:

```sh
npm install
cp .env.example .env.local
# Edit .env.local and set TYPESAFE_API_KEY.
npm run dev
```

Open **http://127.0.0.1:5173** in desktop Chrome. The API listens on loopback port 3001. Click **Start listening** and allow microphone access, or type into the same composer. Do not put a key in a `VITE_` variable. `.env.local` is ignored and the key is used only on the server.

```env
TYPESAFE_API_KEY=
TYPESAFE_MODEL=jev-1.14.0
```

Every finalized spoken phrase and submitted typed command goes through the same real TypeSafe Jev backend. A missing key produces a visible 503 error. Provider errors preserve the last confirmed cake. There is no automatic parser fallback or fake AI success.

```sh
npm test          # Local fixtures, validation, queue and reset tests, no Jev calls
npm run typecheck
npm run build
```

To serve the built app from the local Express server, run `npm run build && npm start` and open **http://127.0.0.1:3001** instead. Stop the development server first so its API port is free.

## Live demo

Start with an empty builder and speak each turn separately:

1. “I want a cake.” → Chocolate, 1 layer, **$42**
2. “Make it two layers.” → Same cake, pink filling seam, **$48**
3. “Add a princess on top.” → Princess behind the writing area, **$58**
4. “Make it a birthday cake and write Eda on top.” → Birthday, Eda, still **$58**

Then say “Change the name to Ada,” “Remove the princess,” and try **Undo last edit**. **Start afresh** resets the builder and ignores an old in-flight response. **Add to basket** saves the exact confirmed design, its estimate, and a thumbnail rendered from that saved state. Later builder edits do not change saved cakes. The basket supports quantity and removal, and survives reload when browser storage is available.

The one snapshot exception is a pending custom preview: if you save before its image is ready, that saved cake can receive the completed image for the same request. Nothing else changes, and an image already saved is never replaced by a later completion.

## Supported designs and sample prices

All amounts are USD demo estimates, not bakery quotes. The occasion and one short inscription are included. No taxes, shipping, or payment.

| Option | Price |
| --- | ---: |
| Vanilla / chocolate / red velvet / lemon sponge, 1 layer | $38 / $42 / $44 / $40 |
| Classic baked cheesecake, fixed 1 layer | $44 |
| Additional sponge layer, up to 3 total | $6 |
| Strawberries / raspberries | $7 each |
| Chocolate ganache / caramel drizzle / gold stars | $5 / $4 / $4 |
| Plain candles, 1–12 per set / numeral candle set | $3 / $5 |
| Prepared fondant topper, up to 2 per cake | $10 each |
| Mario / Formula One / Spain World Cup theme | $12 each |
| Tennis theme / Jensen Huang figurine | $10 / $15 |

Fruit, candles, a theme and a custom decoration can coexist. Unknown decorations retain the customer's wording and need a quote; the known subtotal is still shown and saved. “Three candles” means three plain candles; “a number three candle” means a numeral. Plain candles default to five when no count is given, and any count from 1–12 costs $3 per set. A numeral candle set costs $5 for all digits, not per digit. Older saved plain sets become five candles. A layer is part of one cake, not a stacked tier. Tiers are unsupported and leave the existing design intact. Cheesecake keeps one baked layer while preserving applicable decorations.

### Occasions

Choose Birthday, Wedding, Anniversary, Engagement, Graduation, Promotion, Retirement, Baby shower, Christening, Housewarming, Christmas, New Year, Valentine's Day, Mother's Day, Father's Day, Thank you, or Just because. Occasion labels are free and never add decorations automatically. The disclosure starts with these occasions, followed by “Designs you can describe” and the rest of the supported catalog. Contextual suggestion chips offer relevant edits, not presets.

### Prepared topper library

The shared catalog has 41 prepared fondant decorations, including princess, castle, unicorn, dinosaur, dragon, rainbow, butterfly, flowers, heart, crown, star wand, balloons, animals, mermaid, fairy, knight, wizard, ballerina, astronaut, rocket, robot, vehicles, an original superhero, boy/girl figurines, bride and groom, snowman, Christmas tree, pumpkin, graduation cap, and baby bootie. See `src/shared/toppers.ts` for the exact IDs and descriptions.

Each costs $10. Up to two unique toppers can share a cake, in the order requested. Removing one keeps the other. A third topper leaves the entire previous design unchanged and shows “Up to two toppers in this demo.” Generic race cars are distinct from the Formula One kit. Exact custom requests such as a portrait of a named pet remain custom quoted items. Older saved princess designs migrate automatically.

The quiet **Try:** chips suggest edits not already in your design. Clicking one uses the same live Jev path as typing. **See everything you can ask for** expands the full supported catalog, including every topper, grouped with sample prices from shared code. Both controls are disabled while a request is pending and hidden during local fixture replay.

### Colors, styling, and custom previews

Appearance changes are included. Ask for any of the 17 shared palette colors on frosting, filling, writing, or accents. Prepared toppers support small/medium/large size, automatic/left/center/right position, and a palette tint. Writing supports script or print, as-written or uppercase, three sizes, and front or center placement on the top. Your exact inscription stays in the saved design even when displayed uppercase.

An unknown custom object keeps its exact request and a quoted-item plaque. New images are **tap to generate**: choose **Create preview (about 1¢)** to request one. The displayed estimate comes from the server's configured image cost; if no estimate is available, the button says the cost varies. Editing, rejected/no-change turns, Undo, reload and opening the basket never start paid image generation. Free cache lookups and loading already-generated images can happen automatically.

The same optional preview button appears for saved basket items without an image. It is disabled while processing, and matching requests share a single generation. Failed generation leaves the plaque and a click-only retry button. You can keep editing or save the cake while a preview is processing. A generated preview is still **Custom decoration to be quoted**, never a priced decoration. Image completion is not an Undo step; it can fill a matching saved null image ID once, without changing the design, estimate or quantity, and never replaces an already-ready saved image.

## Local replay and timing

**Local demo tools** is closed by default. It contains two deliberately separate features:

- **Live request timing** records real command attempts. Provider time, total HTTP request time, and finalized-transcript-to-paint are separate. Paint uses a two-animation-frame approximation. The first observed request is labeled separately; it is not proof of a cold provider request. These are not last-audible-word timings.
- **Enter local fixture replay** is an explicit, labeled visual/pricing replay, **not Jev**. It disables the live composer and mic while active. The six-step demo adds the Ada correction and princess removal after the original four turns. **Undo last edit** works in replay: after Ada it restores Eda at $58; after removal it restores the princess at $58. You can also select one of 14 examples and its follow-up. Exit replay to restart the empty live builder. No model latency is recorded for fixture edits.

## Verification

See [validation and pending live acceptance checks](docs/validation.md). A passing fixture run does not validate model interpretation, microphone recognition, provider latency, or the full live voice flow. Real Jev and microphone checks require your key and browser permission.

With credentials configured, `npx tsx scripts/check-live-jev.ts` runs the real provider adapter against the demo and fourteen examples. It exits rather than replaying fixtures when the key is missing. See [live validation steps](docs/live-validation.md).

### Fallback interpreter

When Jev returns no meaningful change for an open-ended phrase, the server makes at most one backup call per turn to `openai/gpt-4.1-nano` via OpenRouter (configurable with `OPENROUTER_TEXT_MODEL`). It receives the confirmed cake and bounded catalogs, and returns structured patch data with explicit keep/reset semantics. The server validates and decodes it to the same `CakePatch` used by Jev, with the same pricing and constraints. Source-support checks can reject unsupported catalog/event additions. Successful Jev edits and intentional demo-limit clarifications never trigger the fallback; it is disabled without `OPENROUTER_API_KEY`.

The shared custom-object guard is only a **quality filter**, not image-cost protection. It can omit an unclear custom addition while keeping other valid edits, but still accepts some abstract phrases such as “a luxurious finish” or “a festive atmosphere.” Tap-to-generate is the cost protection: a misinterpreted custom plaque alone must not start an image request. Exact prepared-catalog IDs and names are remapped to prepared toppers in both Jev and the backup interpreter, even when the model puts the name only in its custom field.

Responses expose `provider.interpreter` and optional `provider.fallback` timing/cost metadata. Health exposes `fallbackAttempts`. Earlier calls cost approximately $0.0004 each; the later held-out run has incomplete cost reporting, so its actual total billing is unknown. Broad semantic reliability is not established, and no new live measurement accompanies this quality-filter change. See [held-out results](docs/heldout-results.md), [fresh retest results](docs/retest-interpretation.md), and [offline-verified interpretation fixes and limitations](docs/interpretation-fixes.md).

The original [build brief](docs/build-brief.md), [visual mockup](docs/cake-gallery-mockup.webp), and [artwork references](docs/references/) remain in `docs/`.
