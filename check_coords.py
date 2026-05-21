import re
import sys

def get_region_bounds():
    return {
        '台北': {'min_lat': 24.8, 'max_lat': 25.3, 'min_lng': 121.2, 'max_lng': 122.0},
        '台中': {'min_lat': 24.0, 'max_lat': 24.4, 'min_lng': 120.4, 'max_lng': 121.2},
        '日月潭': {'min_lat': 23.7, 'max_lat': 24.0, 'min_lng': 120.8, 'max_lng': 121.1},
        '台南': {'min_lat': 22.8, 'max_lat': 23.4, 'min_lng': 120.0, 'max_lng': 120.5},
        '高雄': {'min_lat': 22.4, 'max_lat': 23.0, 'min_lng': 120.1, 'max_lng': 120.8},
        '宜兰': {'min_lat': 24.4, 'max_lat': 25.0, 'min_lng': 121.6, 'max_lng': 122.0},
        '花莲': {'min_lat': 23.1, 'max_lat': 24.4, 'min_lng': 121.1, 'max_lng': 121.7},
        '淡水': {'min_lat': 25.1, 'max_lat': 25.3, 'min_lng': 121.4, 'max_lng': 121.5},
        '九份': {'min_lat': 25.0, 'max_lat': 25.2, 'min_lng': 121.8, 'max_lng': 121.9},
        '桃园': {'min_lat': 24.8, 'max_lat': 25.1, 'min_lng': 121.0, 'max_lng': 121.4},
        '基隆': {'min_lat': 25.1, 'max_lat': 25.2, 'min_lng': 121.7, 'max_lng': 121.8},
        # General Taiwan bounds
        '台湾': {'min_lat': 21.8, 'max_lat': 25.4, 'min_lng': 119.3, 'max_lng': 122.0}
    }

files = ['src/data-1.ts', 'src/data-2.ts', 'src/data-3.ts', 'src/data-4.ts', 'src/data-extra.ts']

pattern = r"\{\s*n:\s*'([^']+)',.*?zone:\s*'([^']+)'(?:.*?lat:\s*([0-9.]+),\s*lng:\s*([0-9.]+))?"

# Note: Using python regex iteratively or via splitting. Let's just use regex for objects.
# The data is TS, so let's do a simple parse.
