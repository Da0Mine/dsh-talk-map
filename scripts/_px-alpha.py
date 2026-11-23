from PIL import Image
img = Image.open('test/shots/rail-glass-dark.png').convert('RGB')
w,h = img.size
print('面板', img.getpixel((200, 10)), '卡片', img.getpixel((200, 62)), '画布', img.getpixel((430, 300)))
