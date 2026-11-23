from PIL import Image
img = Image.open('test/shots/feimage-test.png').convert('RGB')
# 取玻璃区中间一行，看条纹是否被整体平移（条纹周期 24px）
row = [img.getpixel((x, 150))[0] for x in range(110, 190)]
row2 = [img.getpixel((x, 350))[0] for x in range(110, 190)]
print('玻璃区', row[:12])
print('普通区', row2[:12])
