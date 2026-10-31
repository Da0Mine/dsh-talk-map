import sys
from PIL import Image
src = r"D:\Plugins\dsh-talk-map\test\shots\edge-live-3.png"
out = r"D:\Plugins\dsh-talk-map\test\shots\edge-live-3-zoom.png"
im = Image.open(src)
box = (360, 120, 600, 360)
im.crop(box).resize(((box[2]-box[0])*3, (box[3]-box[1])*3), Image.LANCZOS).save(out)
print("ok", out)
