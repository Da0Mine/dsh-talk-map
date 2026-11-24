from PIL import Image, ImageChops, ImageStat
a = Image.open('test/shots/blur-on.png').convert('L')
b = Image.open('test/shots/blur-off.png').convert('L')
# 条纹对比度：模糊后灰度标准差应显著下降
print('blur on  标准差', round(ImageStat.Stat(a).stddev[0], 1))
print('blur off 标准差', round(ImageStat.Stat(b).stddev[0], 1))
