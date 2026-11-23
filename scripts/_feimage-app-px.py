from PIL import Image
img = Image.open('test/shots/feimage-app-probe.png').convert('RGB')
print('绿底区(70,70) →', img.getpixel((70,70)), '(若 feImage 生效应为红色)')
