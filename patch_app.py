import re
import os

filepath = 'src/App.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# 1. Add states
state_insertion = """
  const [customStores, setCustomStores] = useFirestoreSync<any[]>('custom_stores', 'taiwan_trip_custom_stores_v1', []);
  const [storeRemarks, setStoreRemarks] = useFirestoreSync<Record<string, {text: string, history: string[], future: string[]}>>('store_remarks', 'taiwan_trip_remarks_v1', {});
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [addStoreStep, setAddStoreStep] = useState<1|2>(1);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreZone, setNewStoreZone] = useState('');
  const [newStoreJson, setNewStoreJson] = useState('');

  const handleAddStoreAI = () => {
    const prompt = `我需要在我的旅游App中添加一家新店："${newStoreName}"。
请搜索这家店的资料，并严格按照以下 JSON 格式输出，不要输出任何其他多余的文字或 markdown 标记（例如不要输出 \`\`\`json）：
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
  "cuisine": "菜系/类型"
}`;
    navigator.clipboard.writeText(prompt).then(() => {
      alert('Prompt 已复制！将自动打开 Gemini，请粘贴并让其生成 JSON，复制生成的 JSON 后回到 App 继续。');
      window.open('https://gemini.google.com/app', '_blank');
      setAddStoreStep(2);
    }).catch(() => {
      alert('自动复制失败，请重试');
    });
  };

  const saveCustomStore = () => {
    try {
      const parsed = JSON.parse(newStoreJson);
      const newLoc = {
        ...parsed,
        uid: `custom-${Date.now()}-${parsed.n}`,
        zone: newStoreZone || parsed.zone || '新添加',
      };
      setCustomStores(prev => [...prev, newLoc]);
      setShowAddStoreModal(false);
      setAddStoreStep(1);
      setNewStoreName('');
      setNewStoreJson('');
      setNewStoreZone('');
      alert('添加成功！');
    } catch (e) {
      alert('JSON 格式错误，请检查是否完全粘贴了 AI 返回的 JSON 代码。');
    }
  };

  const handleRemarkUpdate = (locUid: string, text: string) => {
    setStoreRemarks(prev => {
      const existing = prev[locUid] || { text: '', history: [], future: [] };
      return {
        ...prev,
        [locUid]: {
          text,
          history: [...existing.history.slice(-49), existing.text],
          future: []
        }
      };
    });
  };

  const handleRemarkUndo = (locUid: string) => {
    setStoreRemarks(prev => {
      const existing = prev[locUid];
      if (!existing || existing.history.length === 0) return prev;
      const prevText = existing.history[existing.history.length - 1];
      return {
        ...prev,
        [locUid]: {
          text: prevText,
          history: existing.history.slice(0, -1),
          future: [existing.text, ...existing.future]
        }
      };
    });
  };

  const handleRemarkRedo = (locUid: string) => {
    setStoreRemarks(prev => {
      const existing = prev[locUid];
      if (!existing || existing.future.length === 0) return prev;
      const nextText = existing.future[0];
      return {
        ...prev,
        [locUid]: {
          text: nextText,
          history: [...existing.history, existing.text],
          future: existing.future.slice(1)
        }
      };
    });
  };
"""

content = content.replace("const [deletedRouteItem, setDeletedRouteItem] = useState<{ item: any, index: number } | null>(null);", "const [deletedRouteItem, setDeletedRouteItem] = useState<{ item: any, index: number } | null>(null);\n" + state_insertion)

# 2. Merge custom stores into regions dynamically
# Look for: const sourceLocs = activeRegionId === 'all' ...
# We need to inject customStores before filtering.
merge_injection = """
  const combinedLocs = useMemo(() => {
    // First, map regions locs
    let allLocs = activeRegionId === 'all'
      ? regions.flatMap(r => r.locs.map((l, i) => ({ ...l, region: r.name, regionId: r.id, uid: `${r.id}-${i}-${l.n}` })))
      : activeRegion ? activeRegion.locs.map((l, i) => ({ ...l, region: activeRegion.name, regionId: activeRegion.id, uid: `${activeRegion.id}-${i}-${l.n}` })) : [];
    
    // Then add custom stores if they belong to this region or if activeRegionId is 'all'
    // For simplicity, we just dump them in and let the zone filter handle it, or we assume region='all' handles it.
    const mappedCustoms = customStores.map(c => ({...c, region: '自定义', regionId: 'custom', isCustom: true}));
    return [...allLocs, ...mappedCustoms];
  }, [activeRegionId, activeRegion, customStores]);
"""

content = content.replace("const sourceLocs = activeRegionId === 'all'", merge_injection + "\n    const sourceLocs = combinedLocs;")
content = content.replace("? regions.flatMap(r => r.locs.map((l, i) => ({ ...l, region: r.name, regionId: r.id, uid: `${r.id}-${i}-${l.n}` })))", "")
content = content.replace(": activeRegion ? activeRegion.locs.map((l, i) => ({ ...l, region: activeRegion.name, regionId: activeRegion.id, uid: `${activeRegion.id}-${i}-${l.n}` })) : [];", "")

# 3. Add Store Button UI
add_store_button = """
              <button 
                onClick={() => setShowAddStoreModal(true)}
                className="bg-[#2D3436] text-white px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                新增店面
              </button>
            </div>
"""

content = content.replace("</div>\n              </div>\n              \n              <div className=\"flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide\">", "</div>\n" + add_store_button + "\n              <div className=\"flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide\">")
if "新增店面" not in content:
    # try another replace target
    content = content.replace("<span className=\"hidden sm:block text-[9px] font-black uppercase tracking-[0.2em] text-gray-300\">Curated Destinations</span>", "<span className=\"hidden sm:block text-[9px] font-black uppercase tracking-[0.2em] text-gray-300\">Curated Destinations</span>\n                    <button onClick={() => setShowAddStoreModal(true)} className=\"bg-[#2D3436] text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1\"><Plus className=\"w-3 h-3\" /> 新增店面</button>")


# 4. Store Remark UI inside the card (when expanded)
remark_ui = """
                                {loc.tips && (
                                  <div className="bg-sky-50 p-3 rounded-xl border border-sky-100">
                                    <span className="font-bold text-sky-600 uppercase text-[10px] tracking-widest block mb-0.5">Tips</span>
                                    <span className="text-sky-800 leading-snug">{loc.tips}</span>
                                  </div>
                                )}
                                
                                <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl relative">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-gray-600 text-[11px] flex items-center gap-1">✏️ 我的备注 (可实时同步)</span>
                                    <div className="flex gap-1">
                                      <button onClick={() => handleRemarkUndo(loc.uid)} disabled={!storeRemarks[loc.uid]?.history?.length} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[9px] disabled:opacity-50">撤销</button>
                                      <button onClick={() => handleRemarkRedo(loc.uid)} disabled={!storeRemarks[loc.uid]?.future?.length} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[9px] disabled:opacity-50">重做</button>
                                    </div>
                                  </div>
                                  <textarea 
                                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm text-gray-700 min-h-[60px] focus:outline-none focus:border-indigo-300 resize-none"
                                    placeholder="在这里记录你的专属评价、想买的东西、或者任何 Markdown 笔记..."
                                    value={storeRemarks[loc.uid]?.text || ''}
                                    onChange={(e) => handleRemarkUpdate(loc.uid, e.target.value)}
                                  />
                                </div>
"""

content = content.replace("""{loc.tips && (
                                  <div className="bg-sky-50 p-3 rounded-xl border border-sky-100">
                                    <span className="font-bold text-sky-600 uppercase text-[10px] tracking-widest block mb-0.5">Tips</span>
                                    <span className="text-sky-800 leading-snug">{loc.tips}</span>
                                  </div>
                                )}""", remark_ui)

# 5. Add Store Modal
modal_ui = """
      {/* Add Custom Store Modal */}
      {showAddStoreModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-[#2D3436] mb-4">✨ 新增店面 / 地点</h3>
            
            {addStoreStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">店面/地点名称</label>
                  <input type="text" value={newStoreName} onChange={e => setNewStoreName(e.target.value)} placeholder="例如：一兰拉面 (台北本店)" className="w-full p-3 border-2 border-gray-100 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-300 outline-none transition-all font-medium text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">所属区域 (可选)</label>
                  <input type="text" value={newStoreZone} onChange={e => setNewStoreZone(e.target.value)} placeholder="例如：信义区 (留空则使用 AI 判断)" className="w-full p-3 border-2 border-gray-100 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-300 outline-none transition-all font-medium text-sm" />
                </div>
                <button 
                  onClick={handleAddStoreAI}
                  disabled={!newStoreName.trim()}
                  className="w-full bg-indigo-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 mt-4 hover:bg-indigo-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
                >
                  <Sparkles className="w-5 h-5" /> 向 Gemini 获取资料
                </button>
                <p className="text-[10px] text-gray-400 text-center mt-2 leading-relaxed">点击后会自动复制特定的提示词并打开 Gemini。<br/>请在 Gemini 粘贴后将回复的 JSON 代码带回这里。</p>
              </div>
            )}

            {addStoreStep === 2 && (
              <div className="space-y-4 animate-in slide-in-from-right-4">
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setAddStoreStep(1)} className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">返回</button>
                  <span className="text-xs font-bold text-indigo-500">第二步：粘贴 JSON 结果</span>
                </div>
                <textarea 
                  value={newStoreJson}
                  onChange={e => setNewStoreJson(e.target.value)}
                  placeholder='在这里粘贴 Gemini 回复的 { "n": "..." } 格式代码'
                  className="w-full h-48 p-3 border-2 border-indigo-100 rounded-xl bg-indigo-50/30 focus:bg-white focus:border-indigo-300 outline-none transition-all font-mono text-xs"
                />
                <button 
                  onClick={saveCustomStore}
                  disabled={!newStoreJson.trim()}
                  className="w-full bg-[#2D3436] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 mt-2 hover:bg-black active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <Check className="w-5 h-5" /> 保存新店面
                </button>
              </div>
            )}

            <button onClick={() => setShowAddStoreModal(false)} className="mt-4 w-full text-center text-xs font-bold text-gray-400 hover:text-gray-600 p-2">
              取消并关闭
            </button>
          </div>
        </div>
      )}
"""

# append modal at the end before last closing tags
content = content.replace("    </div>\n  );\n}", modal_ui + "\n    </div>\n  );\n}")

with open(filepath, 'w') as f:
    f.write(content)

