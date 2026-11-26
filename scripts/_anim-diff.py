from PIL import Image, ImageChops
try:
    a = Image.open('test/shots/anim-a.png').convert('RGB')
    b = Image.open('test/shots/anim-b.png').convert('RGB')
    d = ImageChops.difference(a, b)
    vals = [max(p) for p in d.getdata()]
    print('两帧差异 平均', round(sum(vals)/len(vals), 2), '最大', max(vals))
except Exception as e:
    print('跳过:', e)
