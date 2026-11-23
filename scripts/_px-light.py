from PIL import Image
img = Image.open('test/shots/rail-glass-dark.png').convert('RGB')
w,h = img.size
print('面板(空)', img.getpixel((200, 10)), '卡片(空)', img.getpixel((200, 62)), '画布(右侧)', img.getpixel((430, 300)))
