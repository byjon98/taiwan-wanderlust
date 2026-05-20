import re

filepath = 'src/App.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# 1. Helper function to find regionId from zone
helper_func = """
  const getRegionIdForZone = (zone: string) => {
    if (!zone) return 'custom';
    for (const r of regions) {
      if (r.locs.some(l => l.zone === zone)) return r.id;
    }
    // Handle partial matches (e.g. "信义区" matches "台北市信义区" or vice versa)
    for (const r of regions) {
      if (r.locs.some(l => l.zone && (l.zone.includes(zone) || zone.includes(l.zone)))) return r.id;
    }
    return 'custom';
  };
"""

content = content.replace("const [storeRemarks, setStoreRemarks] = useFirestoreSync", helper_func + "\n  const [storeRemarks, setStoreRemarks] = useFirestoreSync")


# 2. Update mappedCustoms mapping logic
mapped_customs_replace = """
    // Reverse custom stores to put newest first
    const mappedCustoms = [...(customStores || [])].reverse().map(c => {
      const detectedRegionId = getRegionIdForZone(c.zone);
      const detectedRegionName = regions.find(r => r.id === detectedRegionId)?.name || '自定义';
      return {
        ...c, 
        region: detectedRegionName, 
        regionId: detectedRegionId, 
        isCustom: true
      };
    });
    
    let sourceLocs: any[] = [];
    if (activeRegionId === 'custom') {
      sourceLocs = mappedCustoms.filter(c => c.regionId === 'custom');
    } else {
      sourceLocs = [...allLocs, ...mappedCustoms.filter(c => c.regionId !== 'custom')];
    }
"""

content = re.sub(r'const mappedCustoms = \[\.\.\.\(customStores \|\| \[\]\)\].reverse\(\)\.map\(c => \(\{.*?\}\)\);\s*let sourceLocs: any\[\] = \[\];\s*if \(activeRegionId === \'custom\'\) \{\s*sourceLocs = mappedCustoms;\s*\} else \{\s*sourceLocs = \[\.\.\.allLocs, \.\.\.mappedCustoms\];\s*\}', mapped_customs_replace.strip(), content)


# 3. Add Delete Button for custom stores
delete_button_ui = """
                                <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl relative">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-gray-600 text-[11px] flex items-center gap-1">✏️ 我的备注 (可实时同步)</span>
                                    <div className="flex gap-2 items-center">
                                      <div className="flex gap-1">
                                        <button onClick={() => handleRemarkUndo(loc.uid)} disabled={!storeRemarks[loc.uid]?.history?.length} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[9px] disabled:opacity-50 hover:bg-gray-100">撤销</button>
                                        <button onClick={() => handleRemarkRedo(loc.uid)} disabled={!storeRemarks[loc.uid]?.future?.length} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[9px] disabled:opacity-50 hover:bg-gray-100">重做</button>
                                      </div>
                                      {loc.isCustom && (
                                        <button 
                                          onClick={() => {
                                            if (window.confirm(`确定要删除 "${loc.n}" 吗？此操作不可恢复。`)) {
                                              setCustomStores(prev => prev.filter(c => c.uid !== loc.uid));
                                            }
                                          }}
                                          className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded text-[9px] font-bold hover:bg-red-100"
                                        >
                                          🗑️ 删除店面
                                        </button>
                                      )}
                                    </div>
                                  </div>
"""

content = re.sub(r'<div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl relative">\s*<div className="flex items-center justify-between mb-2">\s*<span className="font-bold text-gray-600 text-\[11px\] flex items-center gap-1">✏️ 我的备注 \(可实时同步\)</span>\s*<div className="flex gap-1">\s*<button onClick=\{\(\) => handleRemarkUndo\(loc\.uid\)\} disabled=\{!storeRemarks\[loc\.uid\]\?\.history\?\.length\} className="px-2 py-0\.5 bg-white border border-gray-200 rounded text-\[9px\] disabled:opacity-50">撤销</button>\s*<button onClick=\{\(\) => handleRemarkRedo\(loc\.uid\)\} disabled=\{!storeRemarks\[loc\.uid\]\?\.future\?\.length\} className="px-2 py-0\.5 bg-white border border-gray-200 rounded text-\[9px\] disabled:opacity-50">重做</button>\s*</div>\s*</div>', delete_button_ui.strip(), content)


with open(filepath, 'w') as f:
    f.write(content)

