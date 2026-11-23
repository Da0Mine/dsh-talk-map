from PIL import Image
img = Image.open('test/shots/rail-glass-dark.png').convert('RGB')
panel = img.getpixel((200, 8)); card = img.getpixel((200, 60)); canvas = img.getpixel((430, 300))
print('now(92%) panel', panel, 'card', card, 'canvas', canvas)
