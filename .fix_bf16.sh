#!/bin/bash
cd /home/ubuntu/CatVTON

# Fix bf16 -> fp16 in app.py
python3 << 'PYEOF'
with open("/home/ubuntu/CatVTON/app.py", "r") as f:
    content = f.read()

content = content.replace('default="bf16"', 'default="fp16"')

with open("/home/ubuntu/CatVTON/app.py", "w") as f:
    f.write(content)

print("bf16 -> fp16 replacement done")
PYEOF

# Verify
grep -n 'default=.fp16.\|default=.bf16.' /home/ubuntu/CatVTON/app.py

# Syntax checks
echo "=== Syntax check app.py ==="
python3 -c "
import ast
with open('/home/ubuntu/CatVTON/app.py') as f:
    ast.parse(f.read())
print('OK')
"

echo "=== Syntax check api.py ==="
python3 -c "
import ast
with open('/home/ubuntu/CatVTON/api.py') as f:
    ast.parse(f.read())
print('OK')
"

echo "=== Syntax check cloth_masker.py ==="
python3 -c "
import ast
with open('/home/ubuntu/CatVTON/model/cloth_masker.py') as f:
    ast.parse(f.read())
print('OK')
"
