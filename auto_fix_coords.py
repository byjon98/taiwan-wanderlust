import re
import time
import urllib.request
import urllib.parse
import json

targets = [
    ("海边小屋", "台中 逢甲夜市"),
    ("麻糬宝宝", "台北 饶河夜市"),
    ("家乡炭烤鸡排", "台北 士林夜市"),
    ("鱼丸伯仔", "新北 九份"),
    ("小8三色地瓜球", "台中 逢甲夜市"),
    ("沈家 泡泡冰", "基隆庙口"),
    ("陈记 泡泡冰", "基隆庙口"),
    ("下港名彭臭豆腐", "台北 饶河夜市"),
    ("无骨鸡腿排", "台北 士林夜市"),
    ("刁民酸菜鱼", "台北 信义区"),
    ("丰仁冰", "台中 一中街"),
    ("戴記臭豆腐", "台北 信义区"),
    ("初木山", "台中 一中街"),
    ("官芝霖大腸包小腸", "台中 逢甲夜市"),
    ("陈董药炖排骨", "台北 饶河夜市"),
    ("曾记老牌水煎包", "桃园 中坜"),
    ("黑人手工香腸", "桃园"),
    ("瑞记排骨酥", "桃园 中坜夜市"),
    ("张丰盛商行", "桃园 中坜"),
    ("臭老爸臭豆腐", "桃园 中坜"),
    ("一蘭拉麵", "台北 信义区"),
    ("混蛋爆虾", "桃园 中坜"),
    ("半月烧馅饼", "台中 一中街")
]

results = {}

for name, query in targets:
    url = f'https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(query)}&format=json'
    req = urllib.request.Request(url, headers={'User-Agent': 'TaiwanTripBot/1.0 (jon.s_p@example.com)'})
    try:
        data = json.loads(urllib.request.urlopen(req).read().decode())
        if data:
            results[name] = (data[0]['lat'], data[0]['lon'])
            print(f'✅ Found: {name} -> {data[0]["lat"]}, {data[0]["lon"]}')
        else:
            print(f'❌ Not found: {name} ({query})')
    except Exception as e:
        print(f'⚠️ Error for {name}: {e}')
    time.sleep(1.5)

with open('fixes.json', 'w') as f:
    json.dump(results, f)
