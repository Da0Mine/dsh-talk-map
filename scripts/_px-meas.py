from PIL import Image
for name in ('meas-filter-on','meas-filter-off'):
    img = Image.open(f'test/shots/{name}.png').convert('RGB')
    w,h = img.size
    # 取面板中部（避开卡片文字）：左侧 10px 与中部
    edge = img.getpixel((5, h//2))
    mid  = img.getpixel((w//2, h-6))
    print(name, 'edge', edge, 'bottom-mid', mid)
