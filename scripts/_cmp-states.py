from PIL import Image, ImageChops
import statistics
a = Image.open('test/shots/state-rest.png').convert('RGB')
b = Image.open('test/shots/state-frozen.png').convert('RGB')
diff = ImageChops.difference(a, b)
px = list(diff.getdata())
flat = [max(p) for p in px]
mean = sum(flat) / len(flat)
over4 = sum(1 for v in flat if v > 4) / len(flat) * 100
print(f"尺寸 {a.size}  平均差 {mean:.2f}/255  最差 {max(flat)}  差值>4 的像素占比 {over4:.2f}%")
