import re

updates = {
    '三代肉粥': ('24.1384', '120.6726'),
    '朝日夫妇': ('25.1741', '121.4346'),
    '啊牧包子': ('25.1083', '121.8436'),
    'BLIKE': ('24.1506', '120.6624'),
    '豐味绿豆沙牛奶': ('24.1802', '120.5910')
}

files = ['src/data-1.ts', 'src/data-2.ts', 'src/data-3.ts', 'src/data-4.ts', 'src/data-extra.ts']

for filepath in files:
    with open(filepath, 'r') as f:
        content = f.read()
    
    updated = False
    for name, (lat, lng) in updates.items():
        escaped_name = re.escape(name)
        # Find something like: n: 'name', lat: 123, lng: 456
        pattern = r"n:\s*'" + escaped_name + r"',\s*lat:\s*[0-9.]+,\s*lng:\s*[0-9.]+"
        replacement = f"n: '{name}', lat: {lat}, lng: {lng}"
        
        new_content = re.sub(pattern, replacement, content)
        if new_content != content:
            content = new_content
            updated = True
            print(f"Updated coords for: {name} in {filepath}")
    
    if updated:
        with open(filepath, 'w') as f:
            f.write(content)
print("Done")
