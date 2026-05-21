import re
from glob import glob

files = ['src/data-1.ts','src/data-2.ts','src/data-3.ts','src/data-4.ts','src/data-extra.ts','src/data.ts']

total = 0
no_coord = []
bad_taiwan = []  # lat should be 21-26, lng should be 119-123 for Taiwan

for f in files:
    try:
        content = open(f).read()
    except:
        continue
    
    objects = re.findall(r"\{[^{}]+n:\s*'([^']+)'[^{}]+\}", content, re.DOTALL)
    for obj_match in re.finditer(r"\{[^{}]+n:\s*'([^']+)'[^{}]+\}", content, re.DOTALL):
        obj = obj_match.group(0)
        name = obj_match.group(1)
        total += 1
        
        lat_m = re.search(r'lat:\s*([\d.]+)', obj)
        lng_m = re.search(r'lng:\s*([\d.]+)', obj)
        
        if not lat_m or not lng_m:
            no_coord.append((f.split('/')[-1], name))
        else:
            lat = float(lat_m.group(1))
            lng = float(lng_m.group(1))
            # Check if in Taiwan roughly
            if not (21 <= lat <= 26.5 and 119 <= lng <= 123):
                bad_taiwan.append((f.split('/')[-1], name, lat, lng))

print(f"Total locations: {total}")
print(f"Missing coordinates: {len(no_coord)}")
for f, n in no_coord:
    print(f"  [{f}] {n}")

print(f"\nSuspect coordinates (outside Taiwan): {len(bad_taiwan)}")
for f, n, lat, lng in bad_taiwan:
    print(f"  [{f}] {n}: lat={lat}, lng={lng}")

