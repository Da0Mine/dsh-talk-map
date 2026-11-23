from PIL import Image
img = Image.open('test/shots/rail-glass-dark.png').convert('RGB')
# 面板内一块空白区域（左上角标题下方）与画布区域
panel = img.getpixel((200, 8))
card = img.getpixel((200, 60))
canvas = img.getpixel((430, 300))
print('旧截图（72%）| 面板', panel, '卡片', card, '画布', canvas)
