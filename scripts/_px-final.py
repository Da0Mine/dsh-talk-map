from PIL import Image
img = Image.open('test/shots/meas-filter-on.png').convert('RGB')
w,h = img.size
print('面板像素', img.getpixel((5, h//2)), img.getpixel((w//2, h-6)))
