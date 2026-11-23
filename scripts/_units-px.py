from PIL import Image
img = Image.open('test/shots/units-ab.png').convert('RGB')
def row(y):
    return [img.getpixel((x,y))[0] for x in range(24, 80, 4)]
print('orig(百分比区域) 行:', row(70))
print('fixed(userSpace)  行:', row(190))
