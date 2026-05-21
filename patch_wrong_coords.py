import re

fixes = {
    "海边小屋": (24.1802, 120.6453),
    "麻糬宝宝": (25.0506, 121.5772),
    "家乡炭烤鸡排": (25.0888, 121.5245),
    "鱼丸伯仔": (25.1082, 121.8436),
    "小8三色地瓜球": (24.1800, 120.6450),
    "沈家/陈记 泡泡冰": (25.1284, 121.7435),
    "下港名彭臭豆腐": (25.0508, 121.5770),
    "无骨鸡腿排": (25.0886, 121.5246),
    "刁民酸菜鱼": (25.0336, 121.5645),
    "丰仁冰": (24.1504, 120.6840),
    "戴記臭豆腐專賣店": (25.0435, 121.5640),
    "初木山 Chu Mu Shan": (24.1803, 120.6449),
    "官芝霖大腸包小腸": (24.1804, 120.6451),
    "陈董药炖排骨": (25.0505, 121.5771),
    "曾记老牌水煎包": (24.9576, 121.2227),
    "黑人手工香腸": (24.9930, 121.3000),
    "瑞记排骨酥": (24.9598, 121.2155),
    "张丰盛商行": (24.9540, 121.2230),
    "臭老爸臭豆腐": (24.9599, 121.2153),
    "ICHIRAN 一蘭拉麵": (25.0333, 121.5665),
    "混蛋爆虾": (24.9600, 121.2154),
    "半月烧馅饼": (24.1503, 120.6842)
}

files = ['src/data-1.ts', 'src/data-2.ts', 'src/data-3.ts', 'src/data-4.ts', 'src/data-extra.ts']

for filepath in files:
    with open(filepath, 'r') as f:
        content = f.read()
    
    updated = False
    for name, (lat, lng) in fixes.items():
        escaped_name = re.escape(name)
        pattern = r"n:\s*'" + escaped_name + r"',\s*lat:\s*[0-9.]+,\s*lng:\s*[0-9.]+"
        replacement = f"n: '{name}', lat: {lat}, lng: {lng}"
        new_content = re.sub(pattern, replacement, content)
        if new_content != content:
            content = new_content
            updated = True
            print(f"Patched: {name} in {filepath}")
    
    if updated:
        with open(filepath, 'w') as f:
            f.write(content)
