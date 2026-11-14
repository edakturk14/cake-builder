# Prepared fondant topper library

The five `topper-source-*.png` sheets were generated once with Factory
GenerateImage. They contain forty original, freestanding sugar-paste designs in
four-column, two-row reading order. The existing powder-blue princess and the
first generated sheet were the style references for later sheets.

Art direction: matte handmade fondant, rounded details, elevated three-quarter
view, warm upper-left light, soft pastel colors, transparent background, and
no trademarked characters. The generic race car is separate from the Formula
One theme kit.

`scripts/prepare-toppers.py` reads the shared catalog order, extracts each
subject, resamples premultiplied alpha to avoid fringes, and writes forty cutouts
plus a normalized version of the original princess to `public/art/toppers/`.
It also writes `src/art/toppersManifest.json` and
`docs/screenshots/toppers-sheet.png`.
Pillow is needed only for preparation, not for running the app.

Each prepared PNG has a 256 × 320 canvas and a bottom-center contact anchor.
The renderer reads the manifest, places one topper at the back center or two
at the back left and right, and reserves the front for the actual inscription.
Candles move into a separate clear area. All prepared assets preload on page
mount. No image generation happens when a customer speaks or types.

Development-only renderer checks live under `docs/dev/`, outside the production
public directory. `tests/topper-renderer.test.ts` verifies coverage of every
shared topper ID, real asset references, ordered pairs, and unique SVG IDs in
saved thumbnails.
