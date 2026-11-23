from PIL import Image
img = Image.open('test/shots/rail-glass-bright.png')
img.crop((0, 0, 300, 140)).resize((600, 280)).save('test/shots/rail-top-crop.png')
print('裁剪完成', img.size)
