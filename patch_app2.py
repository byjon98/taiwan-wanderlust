import re
import os

filepath = 'src/App.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# 1. Update filterGroups to include 'custom' region
filter_replacement = """
  const filterGroups = useMemo(() => [
    {
      id: 'explore',
      name: '地点探索',
      options: [
        { id: 'all', name: '全部区域', day: 'All' },
        ...regions.map(r => ({ id: r.id, name: r.name, day: r.day })),
        { id: 'custom', name: '🌟 新加店面', day: 'Custom' }
      ]
    },
"""
content = re.sub(r'const filterGroups = useMemo\(\(\) => \[\s*\{\s*id: \'explore\',\s*name: \'地点探索\',\s*options: \[\s*\{ id: \'all\', name: \'全部区域\', day: \'All\' \},\s*\.\.\.regions\.map\(r => \(\{ id: r\.id, name: r\.name, day: r\.day \}\)\)\s*\]\s*\},', filter_replacement.strip(), content)


# 2. Update zonesInRegion for 'custom'
zone_replacement = """
  const zonesInRegion = useMemo(() => {
    if (activeRegionId === 'all') {
      const zones = new Set<string>();
      regions.forEach(r => r.locs.forEach(l => { if (l.zone) zones.add(l.zone); }));
      (customStores || []).forEach(l => { if (l.zone) zones.add(l.zone); });
      return Array.from(zones);
    }
    if (activeRegionId === 'custom') {
      const zones = new Set((customStores || []).map(l => l.zone).filter(Boolean));
      return Array.from(zones) as string[];
    }
    if (!activeRegion) return [];
"""
content = re.sub(r'const zonesInRegion = useMemo\(\(\) => \{\s*if \(activeRegionId === \'all\'\) \{\s*const zones = new Set<string>\(\);\s*regions\.forEach\(r => r\.locs\.forEach\(l => \{ if \(l\.zone\) zones\.add\(l\.zone\); \}\)\);\s*return Array\.from\(zones\);\s*\}\s*if \(!activeRegion\) return \[\];', zone_replacement.strip(), content)


# 3. Update filteredLocs to handle 'custom' and sort by newest
filtered_locs_replacement = """
  const filteredLocs = useMemo(() => {
    let allLocs: any[] = [];
    if (activeRegionId === 'all' || searchQuery) {
      allLocs = regions.flatMap(r => r.locs.map((l, i) => ({ ...l, region: r.name, regionId: r.id, uid: `${r.id}-${i}-${l.n}` })));
    } else if (activeRegion) {
      allLocs = activeRegion.locs.map((l, i) => ({ ...l, region: activeRegion.name, regionId: activeRegion.id, uid: `${activeRegion.id}-${i}-${l.n}` }));
    }
    
    // Reverse custom stores to put newest first
    const mappedCustoms = [...(customStores || [])].reverse().map(c => ({...c, region: '自定义', regionId: 'custom', isCustom: true}));
    
    let sourceLocs: any[] = [];
    if (activeRegionId === 'custom') {
      sourceLocs = mappedCustoms;
    } else {
      sourceLocs = [...allLocs, ...mappedCustoms];
    }
"""
content = re.sub(r'const filteredLocs = useMemo\(\(\) => \{\s*let allLocs = \(activeRegionId === \'all\' \|\| searchQuery\)\s*\? regions\.flatMap\(r => r\.locs\.map\(\(l, i\) => \(\{ \.\.\.l, region: r\.name, regionId: r\.id, uid: \`\$\{r\.id\}-\$\{i\}-\$\{l\.n\}\` \}\)\)\)\s*: activeRegion \? activeRegion\.locs\.map\(\(l, i\) => \(\{ \.\.\.l, region: activeRegion\.name, regionId: activeRegion\.id, uid: \`\$\{activeRegion\.id\}-\$\{i\}-\$\{l\.n\}\` \}\)\) : \[\];\s*const mappedCustoms = \(customStores \|\| \[\]\)\.map\(c => \(\{\.\.\.c, region: \'自定义\', regionId: \'custom\', isCustom: true\}\)\);\s*let sourceLocs = \[\.\.\.allLocs, \.\.\.mappedCustoms\];', filtered_locs_replacement.strip(), content)


# 4. Update Gemini Prompt to include "hours"
prompt_replacement = """
{
  "n": "${newStoreName}",
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
  "hours": "营业时间（如 10:00 - 22:00）"
}`;
"""
content = re.sub(r'\{\s*"n": "\$\{newStoreName\}",\s*"f": "店面特色、背景与必买简述",\s*"do": "必做体验（一句话）",\s*"eat": "必吃/必买推荐（逗号分隔）",\s*"w": "避雷指南（如果有）",\s*"r": "网络评价摘要",\s*"tips": "实用提示（一句话）",\s*"price": "消费预估",\s*"minSpend": "低消限制",\s*"zone": "所属区域（例如台北信义区、台西、或者是你认为最合适的区域名）",\s*"cuisine": "菜系/类型"\s*\}', prompt_replacement.strip(), content)


# 5. Update UI to render loc.hours for isCustom
hours_ui_replacement = """
                                {loc.tips && (
                                  <div className="bg-sky-50 p-3 rounded-xl border border-sky-100">
                                    <span className="font-bold text-sky-600 uppercase text-[10px] tracking-widest block mb-0.5">Tips</span>
                                    <span className="text-sky-800 leading-snug">{loc.tips}</span>
                                  </div>
                                )}
                                {(loc.isInfoItem || loc.isCustom) && loc.hours && (
                                   <div><span className="font-bold text-gray-400 uppercase text-[10px] tracking-widest block mb-0.5">营业时间</span> <span className="leading-snug">{loc.hours}</span></div>
                                )}
"""
content = re.sub(r'\{loc\.tips && \(\s*<div className="bg-sky-50 p-3 rounded-xl border border-sky-100">\s*<span className="font-bold text-sky-600 uppercase text-\[10px\] tracking-widest block mb-0\.5">Tips</span>\s*<span className="text-sky-800 leading-snug">\{loc\.tips\}</span>\s*</div>\s*\)\}\s*\{loc\.isInfoItem && loc\.hours && \(\s*<div><span className="font-bold text-gray-400 uppercase text-\[10px\] tracking-widest block mb-0\.5">营业时间</span> <span className="leading-snug">\{loc\.hours\}</span></div>\s*\)\}', hours_ui_replacement.strip(), content)


with open(filepath, 'w') as f:
    f.write(content)

