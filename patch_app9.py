import re

filepath = 'src/App.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# 1. Add new state variables
if 'const [focusedLocId, setFocusedLocId] = useState<string | null>(null);' not in content:
    content = re.sub(
        r"const \[showMap, setShowMap\] = useState\(false\);",
        "const [showMap, setShowMap] = useState(false);\n  const [focusedLocId, setFocusedLocId] = useState<string | null>(null);\n  const [showRouteOnly, setShowRouteOnly] = useState(false);",
        content
    )

# 2. Add generateGoogleMapsUrl function
google_maps_func = """
  const generateGoogleMapsUrl = (items: any[]) => {
    const valid = items.filter(i => i.lat && i.lng);
    if (valid.length === 0) return '';
    if (valid.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${valid[0].lat},${valid[0].lng}`;
    }
    const origin = `${valid[0].lat},${valid[0].lng}`;
    const dest = `${valid[valid.length - 1].lat},${valid[valid.length - 1].lng}`;
    const waypoints = valid.slice(1, -1).map(i => `${i.lat},${i.lng}`).join('|');
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`;
    if (waypoints) url += `&waypoints=${waypoints}`;
    return url;
  };

  const optimizeRoute = () => {
"""
content = re.sub(
    r"\s*const optimizeRoute = \(\) => \{",
    google_maps_func,
    content
)

# 3. Add Route panel buttons
route_btns = """
                <div className="flex gap-2 mt-auto pt-2">
                  <button 
                    className="bg-[#2D3436] text-white hover:bg-black px-4 py-2 rounded-xl font-bold text-[10px] uppercase flex-1 transition-colors whitespace-nowrap"
                    onClick={optimizeRoute}
                  >
                    智能排列 ✨
                  </button>
                  <button 
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl font-bold text-[10px] uppercase flex-1 transition-colors whitespace-nowrap"
                    onClick={() => setRouteItems([])}
                  >
                    清空
                  </button>
                </div>
                
                {/* NEW ROW for Route Actions */}
                {routeItems.length > 0 && (
                  <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                    <button 
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-2 rounded-xl font-bold text-[10px] uppercase flex-1 transition-colors flex items-center justify-center gap-1"
                      onClick={() => {
                        setShowRouteOnly(true);
                        setShowMap(true);
                      }}
                    >
                      <MapPin className="w-3 h-3" />
                      路线图
                    </button>
                    <button 
                      className="bg-green-50 hover:bg-green-100 text-green-600 px-3 py-2 rounded-xl font-bold text-[10px] uppercase flex-1 transition-colors flex items-center justify-center gap-1"
                      onClick={() => {
                        const url = generateGoogleMapsUrl(routeItems);
                        if (url) window.open(url, '_blank');
                      }}
                    >
                      <Navigation className="w-3 h-3" />
                      导航
                    </button>
                  </div>
                )}
"""
content = re.sub(
    r'<div className="flex gap-2 mt-auto pt-2">\s*<button\s*className="bg-\[#2D3436\].*?智能排列 ✨\s*</button>\s*<button\s*className="bg-gray-100.*?onClick=\{.*?setRouteItems\(\[\]\)\}.*?</button>\s*</div>',
    route_btns.strip('\n'),
    content,
    flags=re.DOTALL
)

# 4. MapComponent conditional update to use showRouteOnly and focusedLocId
map_render = """
                ) : showMap ? (
                  <MapComponent 
                    locs={showRouteOnly ? routeItems : filteredLocs} 
                    routeMode={showRouteOnly}
                    focusedLocId={focusedLocId}
                    onLocClick={(uid) => { 
                      setShowMap(false);
                      setShowRouteOnly(false);
                      setFocusedLocId(null);
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
"""
content = re.sub(
    r'\) : showMap \? \(\n\s*<MapComponent.*?/>\n\s*\) : \(',
    map_render.strip('\n'),
    content,
    flags=re.DOTALL
)

# 5. Reset focusedLocId on map toggle off and handle Map toggle button to turn off route mode
map_toggle_btn = """
                      {/* Map Toggle Button */}
                      <button 
                        onClick={() => {
                          if (showMap) {
                            setShowMap(false);
                            setFocusedLocId(null);
                            setShowRouteOnly(false);
                          } else {
                            setShowMap(true);
                            setShowRouteOnly(false);
                            setFocusedLocId(null);
                          }
                        }} 
                        className={`px-3 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-colors ${showMap ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'}`}
                      >
"""
content = re.sub(
    r'\{\/\* Map Toggle Button \*\/.*?onClick=\{\(\) => setShowMap\(!showMap\)\}.*?className=',
    map_toggle_btn.strip('\n') + ' ',
    content,
    flags=re.DOTALL
)

# 6. Add "📍 地图" button to card
card_tag = """
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowRouteOnly(false);
                            setFocusedLocId(loc.uid);
                            setShowMap(true);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                        >
                          <MapPin className="w-2.5 h-2.5" /> 地图
                        </button>
                        {loc.tags?.map((t: string, i: number) => (
"""
content = re.sub(
    r'<div className="flex items-center gap-1.5 flex-wrap">\s*\{loc.tags\?\.map\(\(t: string, i: number\) => \(',
    card_tag.strip('\n'),
    content,
    flags=re.DOTALL
)

with open(filepath, 'w') as f:
    f.write(content)
