import re

zones = {
    '台北': {'min_lat': 24.9, 'max_lat': 25.3, 'min_lng': 121.4, 'max_lng': 121.7},
    '新北': {'min_lat': 24.8, 'max_lat': 25.3, 'min_lng': 121.3, 'max_lng': 122.0},
    '淡水': {'min_lat': 25.1, 'max_lat': 25.3, 'min_lng': 121.4, 'max_lng': 121.5},
    '九份': {'min_lat': 25.0, 'max_lat': 25.2, 'min_lng': 121.8, 'max_lng': 121.9},
    '基隆': {'min_lat': 25.1, 'max_lat': 25.2, 'min_lng': 121.7, 'max_lng': 121.8},
    '桃园': {'min_lat': 24.8, 'max_lat': 25.1, 'min_lng': 121.0, 'max_lng': 121.4},
    '中坜': {'min_lat': 24.9, 'max_lat': 25.0, 'min_lng': 121.2, 'max_lng': 121.3},
    
    '台中': {'min_lat': 24.0, 'max_lat': 24.4, 'min_lng': 120.5, 'max_lng': 120.9},
    '一中': {'min_lat': 24.1, 'max_lat': 24.2, 'min_lng': 120.6, 'max_lng': 120.7},
    '逢甲': {'min_lat': 24.1, 'max_lat': 24.2, 'min_lng': 120.6, 'max_lng': 120.7},
    '日月潭': {'min_lat': 23.8, 'max_lat': 23.9, 'min_lng': 120.9, 'max_lng': 121.0},
    '南投': {'min_lat': 23.6, 'max_lat': 24.1, 'min_lng': 120.6, 'max_lng': 121.3},
    
    '台南': {'min_lat': 22.8, 'max_lat': 23.4, 'min_lng': 120.0, 'max_lng': 120.5},
    '高雄': {'min_lat': 22.4, 'max_lat': 23.0, 'min_lng': 120.1, 'max_lng': 120.8},
    '宜兰': {'min_lat': 24.4, 'max_lat': 25.0, 'min_lng': 121.6, 'max_lng': 122.0},
    '花莲': {'min_lat': 23.1, 'max_lat': 24.4, 'min_lng': 121.1, 'max_lng': 121.7},
    
    # Common markets
    '饶河': {'min_lat': 25.04, 'max_lat': 25.06, 'min_lng': 121.57, 'max_lng': 121.58},
    '宁夏': {'min_lat': 25.05, 'max_lat': 25.06, 'min_lng': 121.51, 'max_lng': 121.52},
    '士林': {'min_lat': 25.08, 'max_lat': 25.09, 'min_lng': 121.52, 'max_lng': 121.53},
    '公馆': {'min_lat': 25.01, 'max_lat': 25.02, 'min_lng': 121.52, 'max_lng': 121.54},
    '信义': {'min_lat': 25.02, 'max_lat': 25.05, 'min_lng': 121.56, 'max_lng': 121.58},
}

files = ['src/data-1.ts', 'src/data-2.ts', 'src/data-3.ts', 'src/data-4.ts', 'src/data-extra.ts']

mismatches = []

for f in files:
    with open(f, 'r') as file:
        content = file.read()
    
    blocks = re.findall(r'\{(.*?)\}', content, re.DOTALL)
    for b in blocks:
        if 'isInfoItem' in b: continue
        name_match = re.search(r'n:\s*\'(.*?)\'', b)
        if not name_match: continue
        name = name_match.group(1)
        
        lat_match = re.search(r'lat:\s*([0-9.]+)', b)
        lng_match = re.search(r'lng:\s*([0-9.]+)', b)
        zone_match = re.search(r'zone:\s*\'(.*?)\'', b)
        zone = zone_match.group(1) if zone_match else ''
        
        if lat_match and lng_match:
            lat, lng = float(lat_match.group(1)), float(lng_match.group(1))
            
            # Check basic bounds for Taiwan
            if not (21.8 <= lat <= 25.4 and 119.3 <= lng <= 122.0):
                mismatches.append(f"NOT IN TAIWAN: {name} ({lat}, {lng}) zone: {zone}")
                continue
                
            matched_any_zone = False
            for z_key, bounds in zones.items():
                if z_key in zone:
                    matched_any_zone = True
                    if not (bounds['min_lat'] <= lat <= bounds['max_lat'] and bounds['min_lng'] <= lng <= bounds['max_lng']):
                        mismatches.append(f"WRONG {z_key}: {name} ({lat}, {lng}) zone: {zone}")
            
            if not matched_any_zone:
                # If we don't have a specific check, at least ensure it's not way off
                pass
        else:
            mismatches.append(f"MISSING: {name}")

for m in set(mismatches):
    print(m)
