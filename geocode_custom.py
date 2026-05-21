import urllib.request
import urllib.parse
import json
import time

targets = [
    ("上好呷雞蛋糕", "淡水 上好呷雞蛋糕"),
    ("窩浩斯甜品店", "淡水 窩浩斯甜品店"),
    ("鮑家餡餅", "淡水 鮑家餡餅"),
    ("小初店", "台中 小初店"),
    ("黄家胡椒饼", "台中 黄家胡椒饼"),
    ("夜間部爌肉飯", "台中 夜間部爌肉飯"),
    ("米玥麻糬堂", "台中 米玥麻糬堂"),
    ("大股 熟成燒肉專門", "台中 大股熟成")
]

for name, query in targets:
    url = f'https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(query)}&format=json'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/112.0'})
    try:
        data = json.loads(urllib.request.urlopen(req).read().decode())
        if data:
            print(f'"{name}": ({data[0]["lat"]}, {data[0]["lon"]}),')
        else:
            print(f'"{name}": (0, 0),')
    except Exception as e:
        print(f'Error for {name}: {e}')
    time.sleep(1.5)
