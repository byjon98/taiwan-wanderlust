import re

filepath = 'src/data-extra.ts'
with open(filepath, 'r') as f:
    content = f.read()

# Add coordinates to the hotels
replacements = {
    "n: '台中東旅 Hotel East Taichung',": "n: '台中東旅 Hotel East Taichung', lat: 24.1432, lng: 120.6826,",
    "n: '伊達邵渡假旅店',": "n: '伊達邵渡假旅店', lat: 23.8471, lng: 120.9304,",
    "n: 'City Suites Beimen',": "n: 'City Suites Beimen', lat: 25.0514, lng: 121.5097,",
    "n: 'Taoyuan Gateway',": "n: 'Taoyuan Gateway', lat: 25.0601, lng: 121.2185,",
    "n: '城市商旅桃园航空馆',": "n: '城市商旅桃园航空馆', lat: 25.0601, lng: 121.2185,",
}

for old, new in replacements.items():
    content = content.replace(old, new)

with open(filepath, 'w') as f:
    f.write(content)

