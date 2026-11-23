from PIL import Image
for a in (0, 20, 30, 45):
    img = Image.open(f'test/shots/pure-{a}.png').convert('RGB')
    w,h = img.size
    print(f'alpha {a:>2}% → 面板内像素', img.getpixel((w//2, h//2)))
