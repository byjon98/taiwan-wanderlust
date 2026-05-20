import re

filepath = 'src/App.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# Fix 3 & 4: Logic for sourceLocs mixing and sorting
sourceLocs_replacement = """
    // Reverse custom stores to put newest first ONLY for 'custom' view
    const mappedCustoms = [...(customStores || [])].reverse().map(c => {
      const detectedRegionId = getRegionIdForZone(c.zone);
      const detectedRegionName = regions.find(r => r.id === detectedRegionId)?.name || '自定义';
      return {
        ...c, 
        t: c.t || c.cuisine || '新添加',
        region: detectedRegionName, 
        regionId: detectedRegionId, 
        isCustom: true
      };
    });
    
    let sourceLocs: any[] = [];
    if (activeRegionId === 'custom') {
      // Show ALL custom stores in the "Newly Added" tab, sorted by newest
      sourceLocs = mappedCustoms;
    } else if (activeRegionId === 'all' || searchQuery) {
      // Show custom stores at the bottom of the "All" tab in original order
      sourceLocs = [...allLocs, ...mappedCustoms.slice().reverse()];
    } else {
      // Show custom stores at the bottom of their specific region tab in original order
      sourceLocs = [...allLocs, ...mappedCustoms.slice().reverse().filter(c => c.regionId === activeRegionId)];
    }
"""

content = re.sub(r'// Reverse custom stores to put newest first\s*const mappedCustoms = \[\.\.\.\(customStores \|\| \[\]\)\].reverse\(\)\.map\(c => \{\s*const detectedRegionId = getRegionIdForZone\(c\.zone\);\s*const detectedRegionName = regions\.find\(r => r\.id === detectedRegionId\)\?\.name \|\| \'自定义\';\s*return \{\s*\.\.\.c, \s*t: c\.t \|\| c\.cuisine \|\| \'新添加\',\s*region: detectedRegionName, \s*regionId: detectedRegionId, \s*isCustom: true\s*\};\s*\}\);\s*let sourceLocs: any\[\] = \[\];\s*if \(activeRegionId === \'custom\'\) \{\s*// Show ALL custom stores in the "Newly Added" tab\s*sourceLocs = mappedCustoms;\s*\} else \{\s*// Show custom stores at the TOP of the "All" tab or specific region tab\s*sourceLocs = \[\.\.\.mappedCustoms\.filter\(c => c\.regionId !== \'custom\'\), \.\.\.allLocs\];\s*\}', sourceLocs_replacement.strip(), content)


# Fix 2: Add "Add New Store" button in empty state
empty_state_replace = """
            <p className="text-gray-500 text-sm md:text-base mt-2 mb-6">请尝试调整选项或重置过滤条件。</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button 
                onClick={() => window.open('https://gemini.google.com/app', '_blank')}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform"
              >
                <span className="text-xl">✨</span>
                问问 AI 推荐
              </button>
              <button 
                onClick={() => setShowAddStoreModal(true)}
                className="flex items-center gap-2 bg-[#2D3436] text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform"
              >
                <span className="text-xl">➕</span>
                自己新增店面
              </button>
            </div>
          </div>
"""
content = re.sub(r'<p className="text-gray-500 text-sm md:text-base mt-2 mb-6">请尝试调整选项或重置过滤条件。</p>\s*<button \s*onClick=\{\(\) => window\.open\(\'https://gemini\.google\.com/app\', \'_blank\'\)\}\s*className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform"\s*>\s*<span className="text-xl">✨</span>\s*问问 AI 推荐\s*</button>\s*</div>', empty_state_replace.strip(), content)


# Fix 1: Auto close undo toast and add close button
# In App.tsx, add useEffect for auto close toast
toast_effect = """
  // Auto-close undo toasts
  useEffect(() => {
    let timer1: NodeJS.Timeout;
    if (deletedRouteItem) {
      timer1 = setTimeout(() => setDeletedRouteItem(null), 5000);
    }
    return () => clearTimeout(timer1);
  }, [deletedRouteItem]);

  useEffect(() => {
    let timer2: NodeJS.Timeout;
    if (deletedCustomStore) {
      timer2 = setTimeout(() => setDeletedCustomStore(null), 5000);
    }
    return () => clearTimeout(timer2);
  }, [deletedCustomStore]);
"""

# Insert toast_effect right after the state declarations
content = content.replace("  const [deletedCustomStore, setDeletedCustomStore] = useState<{ item: any, index: number } | null>(null);", "  const [deletedCustomStore, setDeletedCustomStore] = useState<{ item: any, index: number } | null>(null);\n" + toast_effect)

# Update Toast UI to have close buttons
toast_ui_replace = """
      {/* Toast Notification for Deleted Items */}
      <div className="fixed bottom-20 md:bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col gap-2 z-[60] w-[90%] md:w-auto max-w-sm pointer-events-none">
        
        {/* Undo Toast for Route Items */}
        {deletedRouteItem && (
          <div className="bg-black/80 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-4 z-50 animate-in slide-in-from-bottom-8 fade-in duration-300 sm:min-w-[300px] pointer-events-auto">
            <span className="text-sm font-medium pr-2">
              已删除 <span className="font-bold">{deletedRouteItem.item.n}</span>
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={undoDeleteRouteItem}
                className="text-[#00cec9] hover:text-white transition-colors text-sm font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg whitespace-nowrap"
              >
                撤销 Undo
              </button>
              <button onClick={() => setDeletedRouteItem(null)} className="text-gray-400 hover:text-white w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">×</button>
            </div>
          </div>
        )}
        
        {/* Undo Toast for Custom Stores */}
        {deletedCustomStore && (
          <div className="bg-red-600/90 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-4 z-50 animate-in slide-in-from-bottom-8 fade-in duration-300 sm:min-w-[300px] pointer-events-auto mt-2">
            <span className="text-sm font-medium pr-2">
              删除了店面 <span className="font-bold">{deletedCustomStore.item.n}</span>
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  setCustomStores(prev => {
                    const newArr = [...prev];
                    newArr.splice(deletedCustomStore.index, 0, deletedCustomStore.item);
                    return newArr;
                  });
                  setDeletedCustomStore(null);
                }}
                className="text-white hover:text-red-100 transition-colors text-sm font-bold uppercase tracking-wider bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg whitespace-nowrap"
              >
                撤销 Undo
              </button>
              <button onClick={() => setDeletedCustomStore(null)} className="text-white/70 hover:text-white w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors">×</button>
            </div>
          </div>
        )}
      </div>
"""

# The previous toast UI was scattered at the end of main.
# To replace it accurately, I will match from `{/* Toast Notification for Deleted Items */}` to the end of the `</main>` tag, then restore `</main>`
content = re.sub(r'\{/\* Toast Notification for Deleted Items \*/\}.*?</main>', toast_ui_replace.strip() + '\n      </main>', content, flags=re.DOTALL)


with open(filepath, 'w') as f:
    f.write(content)

