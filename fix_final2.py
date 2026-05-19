import re
import shutil

# --- 1. Fix ExpensePanel.tsx ---
with open('src/components/ExpensePanel.tsx', 'r') as f:
    panel = f.read()

# A. Move `+` to the title "财务大盘"
old_title = """          <div className="shrink-0 pt-6 px-6 pb-2">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-black tracking-tight">财务大盘</h1>
              <div className="text-right">"""
new_title = """          <div className="shrink-0 pt-6 px-6 pb-2">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black tracking-tight">财务大盘</h1>
                {activeTab === 'dashboard' && (
                  <button onClick={() => setIsFabOpen(true)} className="w-8 h-8 bg-black hover:bg-blue-400 text-white rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-all">
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div className="text-right">"""
panel = panel.replace(old_title, new_title)

# Remove the old floating FAB
old_fab = """      {/* Floating Action Button for Quick Entry (Only on Dashboard) */}
      {activeTab === 'dashboard' && (
        <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white/90 via-white/50 to-transparent pointer-events-none z-40" />
      )}
      {activeTab === 'dashboard' && (
        <button 
          onClick={() => { setIsFabOpen(true); }}
          className="fixed lg:absolute bottom-24 lg:bottom-10 left-6 lg:left-10 w-14 h-14 bg-black hover:bg-blue-400 text-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.15)] flex items-center justify-center z-50 transition-transform active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}"""
panel = panel.replace(old_fab, "")

# B. Move Category Summary to Burn Rate tab
# First, extract it
category_summary_start = '            <div className="pt-4">\n              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">全类目花销汇总</h3>'
category_summary_end = '              </div>\n            </div>'
if category_summary_start in panel:
    start_idx = panel.find(category_summary_start)
    end_idx = panel.find(category_summary_end, start_idx) + len(category_summary_end)
    cat_summary_code = panel[start_idx:end_idx]
    
    # Remove from Dashboard tab
    panel = panel[:start_idx] + panel[end_idx:]
    
    # Inject into Burn Rate tab
    burn_tab_end = '            <div className="flex flex-wrap gap-4 px-2 justify-center pt-2">\n              {CATEGORIES.map(g => (\n                <div key={g.group} className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600">\n                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getGroupColor(g.group) }} />\n                  {g.group}\n                </div>\n              ))}\n            </div>'
    
    panel = panel.replace(burn_tab_end, burn_tab_end + '\n\n' + cat_summary_code)

# C. Make Burn Rate show daily total TWD constantly, not just on hover
old_burn_item = """                    <div key={day} className="flex flex-col items-center flex-1 h-full justify-end group">
                      <div className="opacity-0 group-hover:opacity-100 text-[9px] font-bold text-gray-800 mb-2 transition-opacity text-center absolute -top-4">
                        {totalSpent.toLocaleString(undefined, {maximumFractionDigits:0})}
                      </div>"""
new_burn_item = """                    <div key={day} className="flex flex-col items-center flex-1 h-full justify-end group relative">
                      <div className="text-[9px] font-black text-gray-600 mb-1 text-center -mt-4 whitespace-nowrap">
                        {totalSpent > 0 ? totalSpent.toLocaleString(undefined, {maximumFractionDigits:0}) : ''}
                      </div>"""
panel = panel.replace(old_burn_item, new_burn_item)

# D. Redesign History list items to prevent truncation
old_history_item = """                <div key={e.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-lg shrink-0 border border-gray-100">
                    {e.isSettlement ? '✅' : e.isTransfer ? '🔄' : getCategoryLabel(e.category).split(' ')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-800 text-sm truncate">{e.subject}</div>
                    <div className="text-[9px] text-gray-400 font-bold mt-1 flex flex-wrap gap-1">
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 uppercase">{e.paymentMethod.replace('_', ' ')}</span>
                      {!e.isTransfer && !e.isSettlement && (
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">属于 {e.forJon > 0 && e.forJune > 0 ? '共同' : e.forJon > 0 ? 'Jon' : 'June'}</span>
                      )}
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">Day {e.day}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-black text-gray-800 text-sm">
                      {e.currency === 'TWD' ? 'NT$ ' : 'MYR '}
                      {e.amount.toLocaleString(undefined, {minimumFractionDigits: e.currency === 'MYR' ? 2 : 0})}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <button onClick={() => handleEdit(e)} className="px-2.5 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg ml-2">修改</button>
                    <button onClick={() => deleteExpense(e.id)} className="p-1.5 hover:bg-gray-100 text-gray-300 hover:text-red-500 rounded-lg ml-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>"""
new_history_item = """                <div key={e.id} className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-lg shrink-0 border border-gray-100">
                        {e.isSettlement ? '✅' : e.isTransfer ? '🔄' : getCategoryLabel(e.category).split(' ')[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-gray-800 text-sm truncate">{e.subject}</div>
                        <div className="text-[9px] text-gray-400 font-bold mt-1 flex flex-wrap gap-1">
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 uppercase">{e.paymentMethod.replace('_', ' ')}</span>
                          {!e.isTransfer && !e.isSettlement && (
                            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">属于 {e.forJon > 0 && e.forJune > 0 ? '共同' : e.forJon > 0 ? 'Jon' : 'June'}</span>
                          )}
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">Day {e.day}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-gray-800 text-sm">
                        {e.currency === 'TWD' ? 'NT$ ' : 'MYR '}
                        {e.amount.toLocaleString(undefined, {minimumFractionDigits: e.currency === 'MYR' ? 2 : 0})}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 border-t border-gray-50 pt-2">
                    <button onClick={() => handleEdit(e)} className="px-3 py-1 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-bold transition-colors">修改 Edit</button>
                    <button onClick={() => deleteExpense(e.id)} className="px-2 py-1 bg-gray-50 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg flex items-center justify-center transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>"""
panel = panel.replace(old_history_item, new_history_item)

# Add event listener for quick entry
old_init = """  useEffect(() => {
    const saved = localStorage.getItem('taiwan_trip_expenses_v3');"""
new_init = """  useEffect(() => {
    const handleOpenFab = () => setIsFabOpen(true);
    window.addEventListener('open-expense-fab', handleOpenFab);
    return () => window.removeEventListener('open-expense-fab', handleOpenFab);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('taiwan_trip_expenses_v3');"""
panel = panel.replace(old_init, new_init)

with open('src/components/ExpensePanel.tsx', 'w') as f:
    f.write(panel)


# --- 2. Fix App.tsx ---
with open('src/App.tsx', 'r') as f:
    app = f.read()

old_app_buttons = """            <button 
              onClick={() => { setViewMode('itinerary'); setActiveTab('expense'); }}
              className="group flex flex-col items-center gap-4 text-gray-400 hover:text-[#2D3436] transition-colors flex-shrink-0"
            >
              <div className="w-14 h-14 rounded-full border border-gray-200 group-hover:border-[#2D3436] flex items-center justify-center transition-all group-hover:scale-105 bg-white shadow-sm group-hover:shadow-md">
                <Wallet className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex flex-col items-center gap-1">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-[#2D3436]">财务记录</span>
                 <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-gray-400">Expense</span>
              </div>
            </button>"""

new_app_buttons = """            <button 
              onClick={() => { setViewMode('itinerary'); setActiveTab('expense'); }}
              className="group flex flex-col items-center gap-4 text-gray-400 hover:text-[#2D3436] transition-colors flex-shrink-0"
            >
              <div className="w-14 h-14 rounded-full border border-gray-200 group-hover:border-[#2D3436] flex items-center justify-center transition-all group-hover:scale-105 bg-white shadow-sm group-hover:shadow-md">
                <Wallet className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex flex-col items-center gap-1">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-[#2D3436]">财务记录</span>
                 <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-gray-400">Expense</span>
              </div>
            </button>

            <button 
              onClick={() => { setViewMode('itinerary'); setActiveTab('expense'); setTimeout(() => window.dispatchEvent(new Event('open-expense-fab')), 100); }}
              className="group flex flex-col items-center gap-4 text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0"
            >
              <div className="w-14 h-14 rounded-full border border-gray-200 group-hover:border-blue-500 flex items-center justify-center transition-all group-hover:scale-105 bg-white shadow-sm group-hover:shadow-md">
                <Plus className="w-5 h-5 text-gray-600 group-hover:text-blue-500" />
              </div>
              <div className="flex flex-col items-center gap-1">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">快捷记账</span>
                 <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-gray-400">Quick Entry</span>
              </div>
            </button>"""
app = app.replace(old_app_buttons, new_app_buttons)

with open('src/App.tsx', 'w') as f:
    f.write(app)


# --- 3. Fix InfoPanel.tsx ---
# Copy the wanderlog pdf as a placeholder for the policy
try:
    shutil.copy('/Users/jon.s_p/Desktop/Trip to Taiwan – Wanderlog.pdf', 'public/policy.pdf')
except Exception as e:
    print(f"Copy failed: {e}")

with open('src/components/InfoPanel.tsx', 'r') as f:
    info = f.read()

# Replace the modal trigger button with a simple window.open
old_info_btn = """<button onClick={() => setIsPolicyOpen(true)} className="mt-3 w-full bg-white border-2 border-red-100 text-red-600 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    查看完整保单 Policy
                  </button>"""

new_info_btn = """<button onClick={() => window.open('/taiwan-wanderlust/policy.pdf', '_blank')} className="mt-3 w-full bg-white border-2 border-red-100 text-red-600 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    查看完整保单 Policy
                  </button>"""
info = info.replace(old_info_btn, new_info_btn)

# Remove the Modal code completely
modal_start = "      {isPolicyOpen && ("
modal_end = "此为保单重点摘要，理赔时请以 Etiqa 官方条款 (Policy Wordings) 为准。<br/>\n                索赔期限：请在回国后 30 天内提交理赔申请。\n              </div>\n\n            </div>\n          </div>\n        </div>\n      )}"
pattern = re.compile(re.escape(modal_start) + r'.*?' + re.escape(modal_end), re.DOTALL)
info = pattern.sub('', info)

with open('src/components/InfoPanel.tsx', 'w') as f:
    f.write(info)

