"""Run from the repo root:  python sprites/convert.py   (needs Pillow)
Turn sprite sheets (rows = stages, cols = frames, 64x48 cells) into code.daemon theme files.
Frames are stored once as palette indexes with run-length rows; each color variant only adds a palette."""
import json, sys
from PIL import Image

GW, GH, FRAMES, STAGES = 64, 48, 4, 11

def load(path):
    im = Image.open(path).convert('RGBA')
    assert im.size == (GW * FRAMES, GH * STAGES), (path, im.size)
    return im

def build(name, label, variants, bodies, screen, dot, default):
    ims = {k: load(p) for k, p in variants.items()}
    keys = list(ims)
    index, palettes = {}, {k: [] for k in keys}
    stages = []
    for s in range(STAGES):
        frames = []
        for f in range(FRAMES):
            runs, x0, y0, x1, y1 = [], GW, GH, -1, -1
            for y in range(GH):
                x = 0
                while x < GW:
                    pix = tuple(ims[k].getpixel((f * GW + x, s * GH + y)) for k in keys)
                    if pix[0][3] < 128: x += 1; continue
                    if pix not in index:
                        index[pix] = len(index)
                        for k, p in zip(keys, pix): palettes[k].append('#%02x%02x%02x' % p[:3])
                    ci, start = index[pix], x
                    while x < GW and tuple(ims[k].getpixel((f * GW + x, s * GH + y)) for k in keys) == pix: x += 1
                    runs += [y, start, x - start, ci]
                    x0, x1, y0, y1 = min(x0, start), max(x1, x - 1), min(y0, y), max(y1, y)
            frames.append({'r': runs, 'box': [x0, y0, x1, y1] if x1 >= 0 else [24, 30, 40, 41]})
        stages.append(frames)
    data = {'id': name, 'name': label, 'frames': FRAMES, 'w': GW, 'h': GH, 'screen': screen, 'dot': dot,
            'bodies': bodies, 'default': default, 'palettes': palettes, 'stages': stages}
    js = ('/* code.daemon theme: %s. Generated from sprite sheets; edit the sprites, not this file. */\n'
          '(function (root) {\nvar data = %s;\n'
          "if (typeof module !== 'undefined' && module.exports) module.exports = data;\n"
          'else if (root.PetCore) root.PetCore.registerTheme(data.id, data);\n'
          "})(typeof globalThis !== 'undefined' ? globalThis : this);\n") % (label, json.dumps(data, separators=(',', ':')))
    return js, len(index)

out = sys.argv[1] if len(sys.argv) > 1 else 'ui/themes'
D = 'sprites/demonic/'; S = 'sprites/succubus/'
js, n = build('demonic', 'Demonic', {'default': D + 'demonic-sheet.png'},
              ['Obsidian egg', 'Shadow slime', 'Spider imp', 'Impling', 'Hell kaiju', 'Hellhound', 'Hell serpent', 'Demon', 'Infernal wyvern', 'Archdemon', 'Void lord'],
              '#0E0709', '#1E1015', 'default')
open(out + '/demonic.js', 'w').write(js); print('demonic', n, 'colors', len(js), 'bytes')
affs = ['github', 'gitlab', 'local', 'unity', 'unreal']
js, n = build('succubus', 'Succubus', {a: S + f'succubus-sheet-{a}.png' for a in affs},
              ['Heart egg', 'Imp slime', 'Bat imp', 'Chibi imp', 'Chibi succubus', 'Young succubus', 'Lamia', 'Succubus', 'Flying succubus', 'Succubus queen', 'Ascended'],
              '#080A0E', '#141820', 'unreal')
open(out + '/succubus.js', 'w').write(js); print('succubus', n, 'colors', len(js), 'bytes')
