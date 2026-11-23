from PIL import Image
img = Image.open('test/shots/user-shot-2359.png').convert('RGB')
w,h = img.size
print('尺寸', img.size)
pts = {'左带(空)': (60, 700), '左带(空2)': (200, 700), '中间缝': (330, 300), '右侧画布(空)': (520, 700), '右侧画布(空2)': (620, 200), 'tab': (310, 560)}
for name,(x,y) in pts.items():
    if 0 <= x < w and 0 <= y < h:
        print(name, img.getpixel((x,y)))
