from PIL import Image
a = Image.open('test/shots/tr-with-panel.png').convert('RGB')
b = Image.open('test/shots/tr-without-panel.png').convert('RGB')
w,h = a.size
pa = a.getpixel((w//2, h//2)); pb = b.getpixel((w//2, h//2))
print('透过面板', pa, '背后原样', pb)
# 面板自身颜色（空白处）：用面板底色 rgb(21,21,23) 的 30% 估计
print('亮度比', round(pa[0]/pb[0], 2) if pb[0] else 'n/a')
