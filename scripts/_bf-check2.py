from PIL import Image, ImageStat
for name in ('bf-on','bf-off'):
    img = Image.open(f'test/shots/{name}.png').convert('L')
    print(name, '标准差', round(ImageStat.Stat(img).stddev[0], 1))
