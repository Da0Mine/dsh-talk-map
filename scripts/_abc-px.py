from PIL import Image
for name in ('step-pa','step-pb','step-pc'):
    img = Image.open(f'test/shots/{name}.png').convert('RGB')
    w,h = img.size
    print(name, img.getpixel((30, 80)), img.getpixel((60, 80)), img.getpixel((90, 80)))
