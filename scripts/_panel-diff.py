from PIL import Image, ImageChops
a = Image.open('test/shots/panel-filter-on.png').convert('RGB')
b = Image.open('test/shots/panel-filter-off.png').convert('RGB')
d = ImageChops.difference(a,b)
vals = [max(p) for p in list(d.getdata())]
print('面板 滤镜开/关 平均差', round(sum(vals)/len(vals),2), '最大', max(vals))
