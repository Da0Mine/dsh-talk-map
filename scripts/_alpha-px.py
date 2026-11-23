from PIL import Image
for a in (20, 30, 45):
    img = Image.open(f'test/shots/alpha-{a}.png').convert('RGB')
    w,h = img.size
    print(f'alpha {a}%: 面板内像素', img.getpixel((w//2, h//2)))
