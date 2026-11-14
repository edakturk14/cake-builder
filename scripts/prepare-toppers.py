"""Normalize the once-generated fondant sheets; never runs in the live app."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import json
import re

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/art/toppers'
OUT.mkdir(parents=True, exist_ok=True)
catalog = re.findall(r"\{ id: '([^']+)', label: '([^']+)'", (ROOT / 'src/shared/toppers.ts').read_text())
assert len(catalog) == 41, 'Expected princess plus forty prepared designs'
manifest = {
    'version': 1,
    'canvas': {'width': 256, 'height': 320},
    'renderSize': {'width': 140.8, 'height': 176},
    'anchor': {'x': .5, 'y': .95625},
    'items': {},
}

def normalize(image, topper_id, label, source):
    image = image.convert('RGBA')
    alpha = image.getchannel('A')
    # Generated sheets have true transparency. Remove only faint detached
    # shadows/noise, preserving white fondant and thin wand/balloon strings.
    alpha = alpha.point(lambda a: 0 if a < 12 else a)
    image.putalpha(alpha)
    box = alpha.point(lambda a: 255 if a > 112 else 0).getbbox()
    assert box, f'No visible subject for {topper_id}'
    box = (max(0, box[0]-3), max(0, box[1]-3), min(image.width, box[2]+3), min(image.height, box[3]+3))
    image = image.crop(box)
    factor = min(228/image.width, 280/image.height)
    size = (round(image.width*factor), round(image.height*factor))
    # Premultiplied-alpha resampling prevents hidden background RGB fringes.
    image = image.convert('RGBa').resize(size, Image.Resampling.LANCZOS).convert('RGBA')
    canvas = Image.new('RGBA', (256, 320))
    position = ((256-size[0])//2, 306-size[1])
    canvas.alpha_composite(image, position)
    canvas.save(OUT / f'{topper_id}.png', optimize=True)
    manifest['items'][topper_id] = {
        'label': label, 'file': f'/art/toppers/{topper_id}.png',
        'scale': 1, 'anchor': {'x': .5, 'y': .95625},
        'bounds': [position[0], position[1], position[0]+size[0], position[1]+size[1]],
        'source': source,
    }

normalize(Image.open(ROOT / 'public/art/princess.png'), catalog[0][0], catalog[0][1], 'supplied princess reference')
for batch in range(5):
    path = ROOT / f'docs/artwork/topper-source-{batch+1}.png'
    sheet = Image.open(path).convert('RGBA')
    for index in range(8):
        topper_id, label = catalog[1+batch*8+index]
        col, row = index%4, index//4
        box = (round(col*sheet.width/4), round(row*sheet.height/2), round((col+1)*sheet.width/4), round((row+1)*sheet.height/2))
        normalize(sheet.crop(box), topper_id, label, f'docs/artwork/topper-source-{batch+1}.png cell {index+1}')

manifest_path = ROOT / 'src/art/toppersManifest.json'
manifest_path.parent.mkdir(parents=True, exist_ok=True)
manifest_path.write_text(json.dumps(manifest, indent=2)+'\n')
sheet = Image.new('RGB', (1296, 1440), '#fbf3ed')
draw = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 14)
    heading = ImageFont.truetype('/System/Library/Fonts/Supplemental/Georgia.ttf', 28)
except OSError:
    font = ImageFont.load_default()
    heading = font
draw.text((24, 18), 'Cake Gallery · prepared fondant topper library', font=heading, fill='#482d2e')
draw.text((24, 58), '41 transparent cutouts · warm side light · fixed contact anchors · generated once, never during an edit', font=font, fill='#957067')
for index, (topper_id, label) in enumerate(catalog):
    x = 18+(index%7)*180
    y = 98+(index//7)*222
    image = Image.open(OUT / f'{topper_id}.png')
    image.thumbnail((148,185), Image.Resampling.LANCZOS)
    sheet.paste(image, (x+(174-image.width)//2,y), image)
    bounds = draw.textbbox((0,0), label, font=font)
    draw.text((x+(174-(bounds[2]-bounds[0]))//2, y+191), label, font=font, fill='#6a4643')
path = ROOT / 'docs/screenshots/toppers-sheet.png'
sheet.save(path, optimize=True)
print(f'Prepared {len(catalog)} transparent toppers, manifest and {path.relative_to(ROOT)}')
