from PIL import Image, ImageChops
a = Image.open('test/shots/reapply-before.png').convert('RGB')
b = Image.open('test/shots/reapply-after.png').convert('RGB')
d = ImageChops.difference(a,b)
vals=[max(p) for p in list(d.getdata())]
print('重挂前后 平均差', round(sum(vals)/len(vals),2), '最大', max(vals))
