# Prepared cake artwork

The cake layers are prepared from the supplied contact sheets in
`docs/references/`. The expanded topper library was generated once offline.
No image generation or outside image service runs during an edit.

- `chocolate-*`, `vanilla-*`, `lemon-*`, `red-velvet-*`: shared top and fixed
  ceramic pedestal, with one, two or three sponge layers.
- `cheesecake`: baked cheesecake, biscuit crust and an unobstructed baked top.
- `princess`, fruit and themed PNGs: independently positioned decorations.
- `toppers/`: forty original fondant designs plus the existing princess,
  normalized as transparent PNGs, with placement metadata in
  `src/art/toppersManifest.json`.
- `masks/`: grayscale photographic frosting, filling and sprinkle textures;
  SVG color filters retain their highlights and detail.
- Icing text, candles, drizzle, stars, raspberries and the original Jensen Huang
  figurine are editable SVG layers in `src/components/CakeScene.tsx`.

The estimated price and saved design come from the shared cake state, not artwork.
The custom-topper plaque intentionally keeps the requested name and says it is to
be quoted, rather than substituting a different decoration.

To reproduce the prepared PNGs, install Pillow in a Python virtual environment,
then run `python scripts/prepare-cake-art.py` from the repository root.
Run `python scripts/prepare-toppers.py` to reproduce the topper cutouts and
contact sheet from the saved generation sheets in `docs/artwork/`.
