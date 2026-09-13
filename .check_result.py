import json, os, sys
import numpy as np
from PIL import Image

with open('/tmp/tryon_test_result.json') as f:
    data = json.load(f)

print(f'success: {data.get("success")}')
print(f'has image: {bool(data.get("image"))}')
print(f'has result_image: {bool(data.get("result_image"))}')
print(f'output_path: {data.get("output_path")}')
print(f'processing_time: {data.get("processing_time")}s')

if data.get('output_path') and os.path.exists(data['output_path']):
    img = Image.open(data['output_path'])
    print(f'Output image: size={img.size}, mode={img.mode}')

import glob
results = sorted(glob.glob('/home/ubuntu/CatVTON/results/tryon_*.jpg'), key=os.path.getmtime, reverse=True)
if results:
    latest = results[0]
    img = Image.open(latest)
    print(f'Latest result file: {latest} size={img.size} mode={img.mode}')

mask = Image.open('/home/ubuntu/CatVTON/debug_automask.png')
m = np.array(mask)
white = int(np.sum(m > 127))
print(f'Debug mask: size={mask.size} white_pct={100*white/m.size:.1f}%')
if white > 0:
    rows = np.any(m > 127, axis=1)
    rmin, rmax = int(np.where(rows)[0][0]), int(np.where(rows)[0][-1])
    print(f'Mask bbox: top={rmin} bottom={rmax} (H={m.shape[0]})')

if data.get('error'):
    print(f'ERROR: {data["error"]}')
