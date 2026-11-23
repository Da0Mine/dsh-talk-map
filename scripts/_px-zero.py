from PIL import Image
img = Image.open('test/shots/pure-0.png').convert('RGB')
w,h = img.size
print('bgOpacity 0 时面板内像素', img.getpixel((w//2, h//2)), '（背后原色 233,73,116）')
