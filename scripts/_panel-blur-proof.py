from PIL import Image, ImageStat
for n in ('panel-bf-on','panel-bf-off'):
    img = Image.open(f'test/shots/{n}.png').convert('L')
    print(n, '标准差', round(ImageStat.Stat(img).stddev[0], 1))
