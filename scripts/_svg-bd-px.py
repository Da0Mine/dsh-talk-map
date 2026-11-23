from PIL import Image
img = Image.open('test/shots/svg-backdrop-test.png').convert('RGB')
print('背景(300,300)', img.getpixel((300,300)), ' 玻璃区内(200,150)', img.getpixel((200,150)), ' 玻璃区左半(120,150)', img.getpixel((120,150)))
