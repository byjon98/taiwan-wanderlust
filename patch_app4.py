import re

filepath = 'src/App.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# 1. Add deletedCustomStore state
state_str = """
  const [deletedRouteItem, setDeletedRouteItem] = useState<{ item: any, index: number } | null>(null);
  const [deletedCustomStore, setDeletedCustomStore] = useState<{ item: any, index: number } | null>(null);
"""
content = content.replace("const [deletedRouteItem, setDeletedRouteItem] = useState<{ item: any, index: number } | null>(null);", state_str.strip())


# 2. Add '🌟 新加店面' to Sidebar Navigation
sidebar_nav_replace = """
                </button>
              {regions.map(r => (
                  <button 
                  key={r.id}
                  onClick={() => { setActiveRegionId(r.id); setActiveTab('explore'); setSearchQuery(''); setActiveZone(null); }}
                  className={cn(
                    "py-2 px-4 lg:py-3 lg:h-14 flex-shrink-0 rounded-2xl flex flex-col lg:flex-row items-center justify-center lg:justify-start transition-all gap-1 lg:gap-4 min-w-[80px] lg:min-w-0 relative group",
                    activeRegionId === r.id && activeTab === 'explore'
                      ? "bg-[#2D3436] text-white shadow-xl shadow-[#2D3436]/10 transform lg:translate-x-1"
                      : "bg-transparent text-gray-500 hover:bg-white hover:text-[#2D3436] hover:shadow-sm"
                  )}
                >
                  <span className="text-xl lg:text-2xl flex-shrink-0 leading-none group-hover:scale-110 transition-transform">{r.em}</span>
                  <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest leading-none whitespace-nowrap">{r.name}</span>
                </button>
              ))}
              <button 
                  onClick={() => { setActiveRegionId('custom'); setActiveTab('explore'); setSearchQuery(''); setActiveZone(null); }}
                  className={cn(
                    "py-2 px-4 lg:py-3 lg:h-14 flex-shrink-0 rounded-2xl flex flex-col lg:flex-row items-center justify-center lg:justify-start transition-all gap-1 lg:gap-4 min-w-[80px] lg:min-w-0 relative group",
                    activeRegionId === 'custom' && activeTab === 'explore'
                      ? "bg-[#2D3436] text-white shadow-xl shadow-[#2D3436]/10 transform lg:translate-x-1"
                      : "bg-transparent text-gray-500 hover:bg-white hover:text-[#2D3436] hover:shadow-sm"
                  )}
                >
                  <span className="text-xl lg:text-2xl flex-shrink-0 leading-none group-hover:scale-110 transition-transform">🌟</span>
                  <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest leading-none whitespace-nowrap">新加店面</span>
                </button>
            </div>
"""
content = re.sub(r'</button>\s*\{regions\.map\(r => \(\s*<button\s*key=\{r\.id\}\s*onClick=\{\(\) => \{ setActiveRegionId\(r\.id\); setActiveTab\(\'explore\'\); setSearchQuery\(\'\'\); setActiveZone\(null\); \}\}\s*className=\{cn\(\s*"py-2 px-4 lg:py-3 lg:h-14 flex-shrink-0 rounded-2xl flex flex-col lg:flex-row items-center justify-center lg:justify-start transition-all gap-1 lg:gap-4 min-w-\[80px\] lg:min-w-0 relative group",\s*activeRegionId === r\.id && activeTab === \'explore\'\s*\?\s*"bg-\[#2D3436\] text-white shadow-xl shadow-\[#2D3436\]/10 transform lg:translate-x-1"\s*:\s*"bg-transparent text-gray-500 hover:bg-white hover:text-\[#2D3436\] hover:shadow-sm"\s*\)\}\s*>\s*<span className="text-xl lg:text-2xl flex-shrink-0 leading-none group-hover:scale-110 transition-transform">\{r\.em\}</span>\s*<span className="text-\[10px\] md:text-\[11px\] font-black uppercase tracking-widest leading-none whitespace-nowrap">\{r\.name\}</span>\s*</button>\s*\)\)\}\s*</div>', sidebar_nav_replace.strip(), content)

# 3. Update Delete Button logic
delete_button_replace = """
                                      {loc.isCustom && (
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const index = customStores.findIndex(c => c.uid === loc.uid);
                                            setDeletedCustomStore({ item: loc, index });
                                            setCustomStores(prev => prev.filter(c => c.uid !== loc.uid));
                                          }}
                                          className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded text-[9px] font-bold hover:bg-red-100"
                                        >
                                          🗑️ 删除店面
                                        </button>
                                      )}
"""
content = re.sub(r'\{loc\.isCustom && \(\s*<button\s*onClick=\{\(\) => \{\s*if \(window\.confirm\(`确定要删除 "\$\{loc\.n\}" 吗？此操作不可恢复。`\)\) \{\s*setCustomStores\(prev => prev\.filter\(c => c\.uid !== loc\.uid\)\);\s*\}\s*\}\}\s*className="px-2 py-0\.5 bg-red-50 text-red-600 border border-red-200 rounded text-\[9px\] font-bold hover:bg-red-100"\s*>\s*🗑️ 删除店面\s*</button>\s*\)\}', delete_button_replace.strip(), content)

# 4. Add Undo Toast for Custom Store
undo_toast_replace = """
      {/* Toast Notification for Deleted Items */}
      <div className="fixed bottom-20 md:bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col gap-2 z-[60] w-[90%] md:w-auto max-w-sm">
        {deletedRouteItem && (
          <div className="bg-[#2D3436] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-gray-300">从行程中移除</span>
              <span className="text-sm font-bold truncate max-w-[200px]">{deletedRouteItem.item.n}</span>
            </div>
            <button 
              onClick={() => {
                setRouteItems(prev => {
                  const newArr = [...prev];
                  newArr.splice(deletedRouteItem.index, 0, deletedRouteItem.item);
                  return newArr;
                });
                setDeletedRouteItem(null);
              }}
              className="text-xs font-black bg-white text-[#2D3436] px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors shadow-sm ml-4 whitespace-nowrap"
            >
              撤销 (Undo)
            </button>
          </div>
        )}
        
        {deletedCustomStore && (
          <div className="bg-red-500 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between animate-in slide-in-from-bottom-5 fade-in duration-300 mt-2">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-red-200">彻底删除了店面</span>
              <span className="text-sm font-bold truncate max-w-[200px]">{deletedCustomStore.item.n}</span>
            </div>
            <button 
              onClick={() => {
                setCustomStores(prev => {
                  const newArr = [...prev];
                  newArr.splice(deletedCustomStore.index, 0, deletedCustomStore.item);
                  return newArr;
                });
                setDeletedCustomStore(null);
              }}
              className="text-xs font-black bg-white text-red-500 px-3 py-1.5 rounded-full hover:bg-red-50 transition-colors shadow-sm ml-4 whitespace-nowrap"
            >
              撤销恢复 (Undo)
            </button>
          </div>
        )}
      </div>
"""
content = re.sub(r'\{/\* Toast Notification for Deleted Items \*/\}\s*<div className="fixed bottom-20 md:bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col gap-2 z-\[60\] w-\[90%\] md:w-auto max-w-sm">\s*\{deletedRouteItem && \(\s*<div className="bg-\[#2D3436\] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between animate-in slide-in-from-bottom-5 fade-in duration-300">\s*<div className="flex flex-col">\s*<span className="text-xs font-medium text-gray-300">从行程中移除</span>\s*<span className="text-sm font-bold truncate max-w-\[200px\]">\{deletedRouteItem\.item\.n\}</span>\s*</div>\s*<button\s*onClick=\{\(\) => \{\s*setRouteItems\(prev => \{\s*const newArr = \[\.\.\.prev\];\s*newArr\.splice\(deletedRouteItem\.index, 0, deletedRouteItem\.item\);\s*return newArr;\s*\}\);\s*setDeletedRouteItem\(null\);\s*\}\}\s*className="text-xs font-black bg-white text-\[#2D3436\] px-3 py-1\.5 rounded-full hover:bg-gray-100 transition-colors shadow-sm ml-4 whitespace-nowrap"\s*>\s*撤销 \(Undo\)\s*</button>\s*</div>\s*\)\}\s*</div>', undo_toast_replace.strip(), content)

with open(filepath, 'w') as f:
    f.write(content)
