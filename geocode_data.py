import re
import os
import time
import requests
import json
from glob import glob

headers = {
    'User-Agent': 'TaiwanTripPlanner/1.0 (jon.s_p@example.com)'
}

def geocode(name, zone):
    # Try with name + zone
    query = f"{name} {zone} 台湾"
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        'q': query,
        'format': 'json',
        'limit': 1
    }
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=10)
        data = resp.json()
        if data:
            return float(data[0]['lat']), float(data[0]['lon'])
    except Exception as e:
        print(f"Error geocoding {query}: {e}")
        
    time.sleep(1.1)
    
    # Try with just name + Taiwan
    query = f"{name} 台湾"
    params['q'] = query
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=10)
        data = resp.json()
        if data:
            return float(data[0]['lat']), float(data[0]['lon'])
    except:
        pass
        
    time.sleep(1.1)
    
    return None, None

def process_file(filepath):
    print(f"Processing {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Match objects in the locs array. This is a bit tricky with regex,
    # but we can look for `{ n: '...', ... }`
    
    def replacer(match):
        obj_content = match.group(0)
        if 'lat:' in obj_content and 'lng:' in obj_content:
            return obj_content # Already geocoded
            
        # Extract name
        name_match = re.search(r"n:\s*'([^']+)'", obj_content)
        if not name_match:
            name_match = re.search(r'n:\s*"([^"]+)"', obj_content)
            
        if not name_match:
            return obj_content
            
        name = name_match.group(1)
        
        # Extract zone (if any, else fallback to something generic or extract from file context)
        zone = ""
        zone_match = re.search(r"zone:\s*'([^']+)'", obj_content)
        if zone_match:
            zone = zone_match.group(1)
            
        lat, lng = geocode(name, zone)
        if lat and lng:
            print(f"  Geocoded: {name} -> {lat}, {lng}")
            # Insert lat/lng right after n: '...'
            return obj_content.replace(f"n: '{name}',", f"n: '{name}', lat: {lat}, lng: {lng},")
        else:
            print(f"  FAILED: {name}")
            return obj_content

    # Match the inner objects in locs: [...] array
    # A simple way is to match `{ n: '...', ... }` ensuring we stay inside the object
    new_content = re.sub(r'\{\s*n:\s*[\'"].*?\}', replacer, content, flags=re.DOTALL)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

for filepath in glob('src/data-*.ts'):
    if filepath == 'src/data-expense.ts':
        continue
    process_file(filepath)

print("Done!")
