from PIL import Image
img = Image.open('test/shots/page-filter-probe.png').convert('RGB')
print('条纹区(60,60)', img.getpixel((60,60)), ' 区(200,60)', img.getpixel((200,60)))
