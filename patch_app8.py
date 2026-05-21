import re

filepath = 'src/App.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# 1. Add map state
if 'const [showMap, setShowMap] = useState(false);' not in content:
    content = re.sub(
        r"const \[searchQuery, setSearchQuery\] = useState\(''\);",
        "const [searchQuery, setSearchQuery] = useState('');\n  const [showMap, setShowMap] = useState(false);",
        content
    )

# 2. Add MapComponent import
if "import { MapComponent }" not in content:
    content = content.replace(
        "import { Plus, Search, MapPin, Coffee, Utensils, Moon, Filter, Info, Wallet, Navigation, CalendarDays, ExternalLink, Sunrise } from 'lucide-react';",
        "import { Plus, Search, MapPin, Coffee, Utensils, Moon, Filter, Info, Wallet, Navigation, CalendarDays, ExternalLink, Sunrise, Map } from 'lucide-react';\nimport { MapComponent } from './components/MapComponent';"
    )

# 3. Add Map toggle button
toggle_button = """
                      {/* Map Toggle Button */}
                      <button 
                        onClick={() => setShowMap(!showMap)} 
                        className={`px-3 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-colors ${showMap ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'}`}
                      >
                        <Map className="w-3 h-3" /> {showMap ? '返回列表' : '地图模式'}
                      </button>

                      <button onClick={() => setShowAddStoreModal(true)} className="bg-[#2D3436] text-white px-2 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 hover:bg-black transition-colors"><Plus className="w-3 h-3" /> 新增店面</button>
"""
content = re.sub(
    r'<button onClick=\{\(\) => setShowAddStoreModal\(true\)\} className="bg-\[#2D3436\] text-white px-2 py-1 rounded text-\[10px\] font-bold flex items-center gap-1 hover:bg-black transition-colors"><Plus className="w-3 h-3" /> 新增店面</button>',
    toggle_button.strip(),
    content
)

# 4. Add id to loc-card
content = re.sub(
    r'key=\{loc\.uid\} \n\s*className=\{cn\("loc-card',
    'key={loc.uid} \n                        id={`loc-card-${loc.uid}`} \n                        className={cn("loc-card',
    content
)

# 5. Conditional render for MapComponent
map_render = """
                ) : showMap ? (
                  <MapComponent 
                    locs={filteredLocs} 
                    onLocClick={(uid) => { 
                      setShowMap(false);
                      setExpandedCardId(uid);
                      setTimeout(() => {
                        const el = document.getElementById(`loc-card-${uid}`);
                        if (el) {
                          const y = el.getBoundingClientRect().top + window.scrollY - 100;
                          window.scrollTo({top: y, behavior: 'smooth'});
                        }
                      }, 100);
                    }} 
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
"""
content = re.sub(
    r'\) : \(\n\s*<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">',
    map_render.strip('\n'),
    content
)

# 6. Update AI Prompt
new_prompt = """{
  "n": "${newStoreName || '店名'}",
  "f": "店面特色、背景与必买简述",
  "do": "必做体验（一句话）",
  "eat": "必吃/必买推荐（逗号分隔）",
  "w": "避雷指南（如果有）",
  "r": "网络评价摘要",
  "tips": "实用提示（一句话）",
  "price": "消费预估",
  "minSpend": "低消限制",
  "zone": "所属区域（例如台北信义区、台西、或者是你认为最合适的区域名）",
  "cuisine": "菜系/类型",
  "hours": "营业时间（如 10:00 - 22:00）",
  "lat": "该店的精准纬度(数字)",
  "lng": "该店的精准经度(数字)"
}"""
content = re.sub(
    r'\{\n\s*"n": "\$\{newStoreName \|\| \'店名\'\}",.*?"hours": "营业时间（如 10:00 - 22:00）"\n\s*\}',
    new_prompt.replace('$', '\\$'),  # avoid regex expansion issues if any, but since we are replacing strings, maybe just use str.replace
    content,
    flags=re.DOTALL
)

with open(filepath, 'w') as f:
    f.write(content)

