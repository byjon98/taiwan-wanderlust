import re

with open('src/components/ItineraryPanel.tsx', 'r') as f:
    panel = f.read()

# 1. Add Search States
state_old = "  const [searchQuery, setSearchQuery] = useState('');"
state_new = """  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);"""
panel = panel.replace(state_old, state_new)

# 2. Modify handleSearch
old_search = """  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      let matchedId = '';
      
      for (let dIdx = 0; dIdx < itineraryDays.length; dIdx++) {
        const day = itineraryDays[dIdx];
        if (day.title?.toLowerCase().includes(q) || `day ${day.day}`.includes(q)) {
          matchedId = `day-${dIdx}`;
          break;
        }
        const items = day.items || [];
        for (let iIdx = 0; iIdx < items.length; iIdx++) {
          if (items[iIdx].name?.toLowerCase().includes(q)) {
            // Need to expand the day or item?
            matchedId = `item-${dIdx}-${iIdx}`;
            break;
          }
        }
        if (matchedId) break;
      }
      
      if (matchedId) {
        const el = document.getElementById(matchedId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-4', 'ring-indigo-500', 'ring-opacity-50', 'transition-all');
          setTimeout(() => el.classList.remove('ring-4', 'ring-indigo-500', 'ring-opacity-50'), 2000);
          
          if (matchedId.startsWith('item-')) {
            const parts = matchedId.split('-');
            setExpandedDays(prev => ({ ...prev, [parts[1]]: true }));
          }
        }
      } else {
        alert('未找到相关行程');
      }
    }
  };"""

new_search = """  // Perform search and build results array
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchIndex(0);
      return;
    }
    const q = searchQuery.toLowerCase().trim();
    const results: string[] = [];
    
    for (let dIdx = 0; dIdx < itineraryDays.length; dIdx++) {
      const day = itineraryDays[dIdx];
      if (day.title?.toLowerCase().includes(q) || `day ${day.day}`.includes(q)) {
        results.push(`day-${dIdx}`);
      }
      const items = day.items || [];
      for (let iIdx = 0; iIdx < items.length; iIdx++) {
        if (items[iIdx].name?.toLowerCase().includes(q) || items[iIdx].desc?.toLowerCase().includes(q)) {
          results.push(`item-${dIdx}-${iIdx}`);
        }
      }
    }
    setSearchResults(results);
    setSearchIndex(0);
  }, [searchQuery, itineraryDays]);

  const scrollToResult = (idx: number) => {
    if (searchResults.length === 0) return;
    const targetIdx = (idx + searchResults.length) % searchResults.length;
    setSearchIndex(targetIdx);
    
    const matchedId = searchResults[targetIdx];
    const el = document.getElementById(matchedId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-4', 'ring-indigo-500', 'ring-opacity-50', 'transition-all');
      setTimeout(() => el.classList.remove('ring-4', 'ring-indigo-500', 'ring-opacity-50'), 2000);
      
      if (matchedId.startsWith('item-')) {
        const parts = matchedId.split('-');
        setExpandedDays(prev => ({ ...prev, [parts[1]]: true }));
      }
    }
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (searchResults.length > 0) {
        scrollToResult(searchIndex + 1);
      } else if (searchQuery.trim()) {
        alert('未找到相关行程');
      }
    }
  };"""
panel = panel.replace(old_search, new_search)

# 3. Add UI arrows for search
old_search_ui = """            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="搜索后按回车跳转 (如 Day 3 或 淡水)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              className="block w-full pl-10 pr-10 py-3 bg-gray-50 border-gray-100 focus:bg-white rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-[#2D3436] placeholder-gray-400"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center"
              >
                <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors">
                  <X className="h-3 w-3 text-gray-500" />
                </div>
              </button>
            )}"""

new_search_ui = """            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="搜索行程 (回车跳至下一个)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              className="block w-full pl-10 pr-[120px] py-3 bg-gray-50 border-gray-100 focus:bg-white rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-[#2D3436] placeholder-gray-400"
            />
            {searchQuery && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
                {searchResults.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 mr-1">
                    <span>{searchIndex + 1}/{searchResults.length}</span>
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => scrollToResult(searchIndex - 1)} className="hover:text-indigo-600 bg-gray-200 hover:bg-indigo-50 rounded-sm w-4 h-3 flex items-center justify-center"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="18 15 12 9 6 15"></polyline></svg></button>
                      <button onClick={() => scrollToResult(searchIndex + 1)} className="hover:text-indigo-600 bg-gray-200 hover:bg-indigo-50 rounded-sm w-4 h-3 flex items-center justify-center"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                    </div>
                  </div>
                )}
                <button 
                  onClick={() => setSearchQuery('')}
                  className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                >
                  <X className="h-3 w-3 text-gray-500" />
                </button>
              </div>
            )}"""
panel = panel.replace(old_search_ui, new_search_ui)

with open('src/components/ItineraryPanel.tsx', 'w') as f:
    f.write(panel)


# --- 2. Fix ExpensePanel.tsx ---
with open('src/components/ExpensePanel.tsx', 'r') as f:
    panel2 = f.read()

# Add Plus next to "财务大盘"
old_header = """            <h1 className="text-2xl font-black tracking-tight">财务大盘</h1>
            <div className="text-[10px] font-bold text-gray-400 mt-0.5">"""
new_header = """            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              财务大盘
              {activeTab === 'dashboard' && (
                <button onClick={() => setIsFabOpen(true)} className="w-7 h-7 bg-black hover:bg-blue-400 text-white rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-all">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
              )}
            </h1>
            <div className="text-[10px] font-bold text-gray-400 mt-0.5">"""
panel2 = panel2.replace(old_header, new_header)

with open('src/components/ExpensePanel.tsx', 'w') as f:
    f.write(panel2)


# --- 3. Fix InfoPanel.tsx ---
with open('src/components/InfoPanel.tsx', 'r') as f:
    info = f.read()

old_info_btn = "window.open('/taiwan-wanderlust/policy.pdf', '_blank')"
new_info_btn = "window.open(import.meta.env.BASE_URL + 'policy.pdf', '_blank')"
info = info.replace(old_info_btn, new_info_btn)

with open('src/components/InfoPanel.tsx', 'w') as f:
    f.write(info)

