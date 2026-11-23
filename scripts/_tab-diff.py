from PIL import Image, ImageChops
a = Image.open('test/shots/tab-glass-on.png').convert('RGB')
b = Image.open('test/shots/tab-glass-off.png').convert('RGB')
d = ImageChops.difference(a,b)
px = [max(p) for p in list(d.getdata())]
print('按钮区 滤镜开/关 平均差', round(sum(px)/len(px),1), ' 最大差', max(px))
