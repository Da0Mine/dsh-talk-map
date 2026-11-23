from PIL import Image
img = Image.open('test/shots/rail-glass-dark.png')
w,h = img.size
crop = img.crop((250, 360, 400, 500)).resize((300, 280), Image.LANCZOS)
crop.save('test/shots/seam-crop.png')
print('裁切已出', crop.size)
