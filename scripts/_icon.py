"""Draw the storefront tile for dsh-talk-map (market icon).

Palette matches the plugin's own card styling so the tile and the screenshots
read as the same product.
"""
from PIL import Image, ImageDraw, ImageFilter

S = 360
OUT = r"D:\Plugins\dsh-talk-map\docs\icon.png"

BG = (20, 22, 27)
CARD = (38, 41, 49)
EDGE = (72, 79, 92)
TEXT = (207, 214, 227)
DIM = (120, 128, 143)
GREEN = (52, 199, 89)
AMBER = (255, 196, 84)

img = Image.new("RGB", (S, S), BG)
draw = ImageDraw.Draw(img)

# rounded background frame
draw.rounded_rectangle([6, 6, S - 6, S - 6], radius=76, outline=(48, 52, 62), width=3)

def card(x, y, w, h, lamp=None, filled=True):
    draw.rounded_rectangle([x, y, x + w, y + h], radius=16,
                           fill=CARD if filled else None, outline=EDGE, width=3)
    # title line
    draw.rounded_rectangle([x + 18, y + 20, x + 18 + int(w * 0.52), y + 34], radius=7, fill=TEXT)
    # body lines
    draw.rounded_rectangle([x + 18, y + 48, x + w - 24, y + 58], radius=5, fill=DIM)
    draw.rounded_rectangle([x + 18, y + 66, x + 18 + int(w * 0.6), y + 76], radius=5, fill=DIM)
    if lamp is not None:
        r = 7
        cx = x + w - 26
        cy = y + h - 26
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=lamp)

# three cards: one stacked behind-right, two in front
card(196, 62, 128, 108, lamp=GREEN)
card(56, 96, 140, 112)
card(96, 226, 148, 108, lamp=AMBER)

# connector: from big card's right edge down to the bottom card's top
def dashed(points, width=3, dash=10, gap=8, color=(214, 224, 240)):
    seg = []
    for (x1, y1), (x2, y2) in zip(points, points[1:]):
        seg.extend([(x1, y1), (x2, y2)])
    # walk the polyline
    carry = 0.0
    on = True
    for i in range(len(points) - 1):
        x1, y1 = points[i]
        x2, y2 = points[i + 1]
        dx, dy = x2 - x1, y2 - y1
        length = (dx * dx + dy * dy) ** 0.5
        if length == 0:
            continue
        t = 0.0
        while t < length:
            step = (dash if on else gap) - carry
            nxt = min(length, t + step)
            if on:
                ax = x1 + dx * (t / length); ay = y1 + dy * (t / length)
                bx = x1 + dx * (nxt / length); by = y1 + dy * (nxt / length)
                draw.line([ax, ay, bx, by], fill=color, width=width)
            carry += nxt - t
            if carry >= (dash if on else gap) - 0.01:
                on = not on
                carry = 0.0
            t = nxt

dashed([(196, 152), (150, 152), (150, 226)])

# arrow head at the end of the connector
draw.polygon([(150, 226), (142, 210), (158, 210)], fill=(214, 224, 240))

# soft glow behind the green lamp (the plugin's "running" aura)
glow = Image.new("RGB", (S, S), (0, 0, 0))
gdraw = ImageDraw.Draw(glow)
gdraw.ellipse([196 + 128 - 60, 62 + 108 - 60, 196 + 128 + 30, 62 + 108 + 30], fill=(18, 60, 32))
glow = glow.filter(ImageFilter.GaussianBlur(18))
img = Image.blend(img, Image.blend(img, glow, 0.55), 0.5)
draw = ImageDraw.Draw(img)

img.save(OUT, "PNG")
print("saved", OUT, img.size)
